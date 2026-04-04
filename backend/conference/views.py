"""
API views for the Conference Management System.
Full role-based access control with proper permissions.
"""
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from datetime import datetime, time
from django.db.models import Q

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny, IsAuthenticated 
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token

from .utils import send_automated_email
from .models import Venue, TechnicalService, SupportService, Booking, SystemUser, EmailTemplate
from .serializers import (
    RegisterSerializer,
    VenueSerializer,
    TechnicalServiceSerializer,
    SupportServiceSerializer,
    BookingSerializer,
    BookingStatusSerializer,
    SystemUserSerializer,
    EmailTemplateSerializer,
)
from .permissions import (
    get_role,
    IsSystemAdmin,
    IsEventManagementOrAdmin,
    IsOrganizerOrAdmin,
    IsICTOrAdmin,
    IsCateringOrAdmin,
    IsAuthenticatedOrPublicRead,
)

# ---------------------------------------------------------------------------
# Authentication Views
# ---------------------------------------------------------------------------

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        role = serializer.validated_data.get('role', 'organizer')
        if role != 'organizer':
            return Response(
                {'error': 'Only Event Organizer accounts can be self-registered.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        system_user = serializer.save()
        token, _ = Token.objects.get_or_create(user=system_user.user)
        return Response({
            'token': token.key,
            'user': {
                'id':    system_user.id,
                'name':  system_user.name,
                'email': system_user.email,
                'role':  system_user.role,
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email    = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password', '')

        if not email or not password:
            return Response({'error': 'Email and password are required.'}, status=400)

        user = authenticate(username=email, password=password)
        if not user:
            return Response({'error': 'Invalid email or password.'}, status=400)

        if not user.is_active:
            return Response({'error': 'This account has been deactivated.'}, status=403)

        token, _ = Token.objects.get_or_create(user=user)

        try:
            sp = user.system_profile
            user_data = {
                'id':         sp.id,
                'name':       sp.name,
                'email':      sp.email,
                'role':       sp.role,
                'created_at': sp.created_at.isoformat() if sp.created_at else None,
            }
        except SystemUser.DoesNotExist:
            user_data = {
                'id':    user.id,
                'name':  user.get_full_name() or user.username,
                'email': user.email,
                'role':  'system_admin',
            }

        return Response({'token': token.key, 'user': user_data})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            sp = request.user.system_profile
            return Response({
                'id':         sp.id,
                'name':       sp.name,
                'email':      sp.email,
                'role':       sp.role,
                'created_at': sp.created_at.isoformat() if sp.created_at else None,
            })
        except SystemUser.DoesNotExist:
            return Response({
                'id':    request.user.id,
                'name':  request.user.get_full_name() or request.user.username,
                'email': request.user.email,
                'role':  'system_admin',
            })

    def patch(self, request):
        try:
            sp = request.user.system_profile
        except SystemUser.DoesNotExist:
            return Response({'error': 'Profile not found.'}, status=404)

        name     = request.data.get('name')
        password = request.data.get('password')
        new_pass = request.data.get('new_password')

        if name:
            sp.name = name
            sp.save()
            request.user.first_name = name.split(' ')[0]
            request.user.last_name  = ' '.join(name.split(' ')[1:]) if ' ' in name else ''
            request.user.save()

        if password and new_pass:
            if not request.user.check_password(password):
                return Response({'error': 'Current password is incorrect.'}, status=400)
            if len(new_pass) < 8:
                return Response({'error': 'New password must be at least 8 characters.'}, status=400)
            request.user.set_password(new_pass)
            request.user.save()
            Token.objects.filter(user=request.user).delete()
            token, _ = Token.objects.get_or_create(user=request.user)
            return Response({'detail': 'Password updated.', 'token': token.key})

        return Response({
            'id':    sp.id, 'name': sp.name,
            'email': sp.email, 'role': sp.role,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        request.user.auth_token.delete()
        return Response({'detail': 'Successfully logged out.'})


# ---------------------------------------------------------------------------
# Core ViewSets
# ---------------------------------------------------------------------------

class VenueViewSet(viewsets.ModelViewSet):
    queryset           = Venue.objects.all()
    serializer_class   = VenueSerializer
    filter_backends    = [filters.OrderingFilter]
    ordering_fields    = ['id', 'name', 'capacity']
    ordering           = ['id']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsEventManagementOrAdmin()]


class TechnicalServiceViewSet(viewsets.ModelViewSet):
    queryset = TechnicalService.objects.all()
    serializer_class = TechnicalServiceSerializer
    permission_classes = [IsAuthenticatedOrReadOnly] 

class SupportServiceViewSet(viewsets.ModelViewSet):
    queryset = SupportService.objects.all()
    serializer_class = SupportServiceSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.select_related('venue', 'user').prefetch_related(
        'technical_services', 'support_services'
    )
    serializer_class   = BookingSerializer
    permission_classes = [IsAuthenticatedOrPublicRead]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]
    filter_backends    = [filters.OrderingFilter]
    ordering_fields    = ['created_at', 'start_date', 'status']
    ordering           = ['-created_at']

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        booking = serializer.save()
        new_status = booking.status

        if old_status != new_status:
            self._trigger_email(booking, new_status)

    def _trigger_email(self, booking, status):
        valid_triggers = ['pending', 'partial_paid', 'paid', 'approved', 'rejected', 'cancelled', 'completed']
        if status in valid_triggers:
            send_automated_email(booking, status)

    def get_permissions(self):
        if self.action in ['create', 'track', 'public_cancel', 'public_edit']:
            return [AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        is_public = self.request.query_params.get('public', 'false').lower() == 'true'
        if is_public:
            return qs.filter(status__in=['pending', 'partial_paid', 'paid', 'approved'])

        user = self.request.user
        if user.is_authenticated:
            role = get_role(user)
            if role in ('system_admin', 'event_management', 'admin_finance', 'leadership'):
                return qs

            scheduled_q = Q(status__in=['pending', 'partial_paid', 'paid', 'approved'])

            if role == 'organizer':
                qs = qs.filter(Q(user=user) | scheduled_q).distinct()
            elif role == 'ict_admin':
                qs = qs.filter(technical_services__isnull=False).distinct()
            elif role == 'catering_support':
                qs = qs.filter(support_services__isnull=False).distinct()
        else:
            return qs.none()

        status_filter = self.request.query_params.get('status')
        venue_id = self.request.query_params.get('venue')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if status_filter: qs = qs.filter(status=status_filter)
        if venue_id: qs = qs.filter(venue_id=venue_id)
        if date_from: qs = qs.filter(start_date__gte=date_from)
        if date_to: qs = qs.filter(end_date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        as_guest = self.request.data.get('as_guest', 'false').lower() == 'true'
        
        if user and user.is_authenticated:
            role = get_role(user)
            if role not in ('organizer', 'event_management', 'leadership', 'system_admin', 'admin_finance'):
                raise PermissionDenied('You do not have permission to create bookings.')
            booking = serializer.save(user=None if as_guest else user)
        else:
            booking = serializer.save(user=None)

        if booking.status == 'approved':
            self._handle_vip_clashes(booking)
            
        self._trigger_email(booking, 'pending')

    def _handle_vip_clashes(self, booking):
        # Override handles clashes by rejecting existing active bookings
        clashes = Booking.objects.filter(
            venue=booking.venue,
            status__in=['pending', 'partial_paid', 'paid', 'approved'],
            start_date__lte=booking.end_date,
            end_date__gte=booking.start_date,
        ).exclude(pk=booking.pk)
        
        if booking.start_time and booking.end_time:
            clashes = clashes.filter(
                Q(start_time__isnull=True) | 
                Q(end_time__isnull=True) |
                Q(start_time__lt=booking.end_time, end_time__gt=booking.start_time)
            )
            
        for clash in clashes:
            clash.status = 'rejected'
            clash.rejection_reason = 'Automatically rejected. This slot was overridden by a high-priority VIP/State requirement.'
            clash.save()
            self._trigger_email(clash, 'rejected')

    @action(detail=True, methods=['patch'], url_path='update_status', permission_classes=[IsEventManagementOrAdmin])
    def update_status(self, request, pk=None):
        booking = self.get_object()
        serializer = BookingStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        rejection_reason = serializer.validated_data.get('rejection_reason', '')

        if booking.status == 'cancelled': 
            return Response({'error': 'Cannot modify a cancelled booking.'}, status=400)
        
        if new_status == 'rejected' and not rejection_reason: 
            return Response({'rejection_reason': 'A reason is required when rejecting.'}, status=400)

        # Trigger destruction of other events if VIP Override is triggered
        if new_status == 'approved':
            self._handle_vip_clashes(booking)

        booking.status = new_status
        if new_status == 'rejected': 
            booking.rejection_reason = rejection_reason
        
        booking.save()
        self._trigger_email(booking, new_status)
        
        return Response(BookingSerializer(booking, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='cancel', permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        role = get_role(request.user)

        if role == 'organizer' and booking.user != request.user:
            raise PermissionDenied('You can only cancel your own bookings.')

        if booking.status not in ('pending', 'partial_paid', 'paid', 'approved'):
            return Response({'error': 'Only active bookings can be cancelled.'}, status=400)

        booking.status = 'cancelled'
        booking.save()
        return Response(BookingSerializer(booking, context={'request': request}).data)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='track')
    def track(self, request):
        ref_id = request.query_params.get('ref_id', '')
        if str(ref_id).startswith('MOA-BKG-'):
            ref_id = str(ref_id).replace('MOA-BKG-', '')
        try:
            booking = Booking.objects.get(id=ref_id)
            return Response(BookingSerializer(booking, context={'request': request}).data)
        except (Booking.DoesNotExist, ValueError):
            return Response({'error': 'Booking not found.'}, status=404)

    @action(detail=False, methods=['patch'], permission_classes=[AllowAny], url_path='public_cancel')
    def public_cancel(self, request):
        ref_id = request.data.get('ref_id', '')
        if str(ref_id).startswith('MOA-BKG-'):
            ref_id = str(ref_id).replace('MOA-BKG-', '')
        try:
            booking = Booking.objects.get(id=ref_id)
            if booking.status not in ('pending', 'partial_paid', 'paid', 'approved'):
                return Response({'error': 'Only active bookings can be cancelled.'}, status=400)
            
            booking.status = 'cancelled'
            booking.save()
            return Response(BookingSerializer(booking, context={'request': request}).data)
        except (Booking.DoesNotExist, ValueError):
            return Response({'error': 'Booking not found.'}, status=404)

    @action(detail=False, methods=['patch'], permission_classes=[AllowAny], url_path='public_edit')
    def public_edit(self, request):
        ref_id = request.data.get('ref_id', '')
        if str(ref_id).startswith('MOA-BKG-'):
            ref_id = str(ref_id).replace('MOA-BKG-', '')
        try:
            booking = Booking.objects.get(id=ref_id)
            if booking.status in ('cancelled', 'completed', 'rejected'):
                return Response({'error': 'Cannot edit this booking status.'}, status=400)
            
            booking.event_title = request.data.get('event_title', booking.event_title)
            booking.event_description = request.data.get('event_description', booking.event_description)
            booking.organizer_phone = request.data.get('organizer_phone', booking.organizer_phone)
            try:
                if 'participant_count' in request.data:
                    booking.participant_count = int(request.data['participant_count'])
            except ValueError: pass
                
            booking.save()
            return Response(BookingSerializer(booking, context={'request': request}).data)
        except (Booking.DoesNotExist, ValueError):
            return Response({'error': 'Booking not found.'}, status=404)

    @action(detail=True, methods=['patch'], url_path='acknowledge_ict', permission_classes=[IsICTOrAdmin])
    def acknowledge_ict(self, request, pk=None):
        booking = self.get_object()
        booking.ict_acknowledged = request.data.get('ict_acknowledged', True)
        if booking.ict_acknowledged:
            booking.ict_rejected = False
            booking.ict_rejection_reason = ""
        booking.save()
        return Response(BookingSerializer(booking, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='set_unavailable_services', permission_classes=[IsICTOrAdmin])
    def set_unavailable_services(self, request, pk=None):
        booking = self.get_object()
        services_ids = request.data.get('unavailable_technical_services', [])
        services = TechnicalService.objects.filter(id__in=services_ids)
        booking.unavailable_technical_services.set(services)
        return Response(BookingSerializer(booking, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='set_unavailable_support_services', permission_classes=[IsCateringOrAdmin])
    def set_unavailable_support_services(self, request, pk=None):
        booking = self.get_object()
        services_ids = request.data.get('unavailable_support_services', [])
        services = SupportService.objects.filter(id__in=services_ids)
        booking.unavailable_support_services.set(services)
        return Response(BookingSerializer(booking, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='acknowledge_catering', permission_classes=[IsCateringOrAdmin])
    def acknowledge_catering(self, request, pk=None):
        booking = self.get_object()
        booking.catering_acknowledged = request.data.get('catering_acknowledged', True)
        if booking.catering_acknowledged:
            booking.catering_rejected = False
            booking.catering_rejection_reason = ""
        booking.save()
        return Response(BookingSerializer(booking, context={'request': request}).data)

class SystemUserViewSet(viewsets.ModelViewSet):
    queryset           = SystemUser.objects.select_related('user').all()
    serializer_class   = SystemUserSerializer
    permission_classes = [IsSystemAdmin]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['name', 'email', 'role']
    ordering_fields    = ['name', 'email', 'role', 'created_at']
    ordering           = ['created_at']

    def get_queryset(self):
        qs   = super().get_queryset()
        role = self.request.query_params.get('role')
        if role: qs = qs.filter(role=role)
        return qs

    def destroy(self, request, *args, **kwargs):
        system_user  = self.get_object()
        django_user  = system_user.user

        if django_user and django_user == request.user:
            return Response({'error': 'You cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)

        system_user.delete()
        if django_user: django_user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        system_user = self.get_object()
        new_password = request.data.get('password', '')
        if len(new_password) < 8: return Response({'error': 'Password must be at least 8 characters.'}, status=400)
        if not system_user.user: return Response({'error': 'This profile has no linked login account.'}, status=400)
        system_user.user.set_password(new_password)
        system_user.user.save()
        Token.objects.filter(user=system_user.user).delete()
        return Response({'detail': f'Password for {system_user.name} has been reset.'})

    @action(detail=True, methods=['patch'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        system_user = self.get_object()
        if not system_user.user: return Response({'error': 'No linked login account.'}, status=400)
        if system_user.user == request.user: return Response({'error': 'You cannot deactivate your own account.'}, status=400)
        system_user.user.is_active = not system_user.user.is_active
        system_user.user.save()
        state = 'activated' if system_user.user.is_active else 'deactivated'
        return Response({'detail': f'Account {state}.', 'is_active': system_user.user.is_active})

class EmailTemplateViewSet(viewsets.ModelViewSet):
    queryset = EmailTemplate.objects.all()
    serializer_class = EmailTemplateSerializer
    permission_classes = [IsSystemAdmin]