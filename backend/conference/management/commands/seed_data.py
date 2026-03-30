from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from conference.models import Venue, TechnicalService, SupportService, EmailTemplate, SystemUser
import datetime

class Command(BaseCommand):
    help = 'Seeds full Ministerial data: Admin, 10 Venues, Services, and Official Templates'

    def handle(self, *args, **options):
        # 1. CREATE SYSTEM ADMIN
        self.stdout.write('--- Seeding System Admin ---')
        admin_email = 'leulabetu@gmail.com'
        user, created = User.objects.get_or_create(
            username=admin_email,
            defaults={
                'email': admin_email,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            user.set_password('adminpassword123')
            user.save()
            # Link to the SystemUser profile required by your React frontend
            SystemUser.objects.get_or_create(
                user=user,
                defaults={'name': 'System Admin', 'email': admin_email, 'role': 'system_admin'}
            )
            self.stdout.write(self.style.SUCCESS(f'Created Admin: {admin_email}'))
        else:
            self.stdout.write('Admin already exists.')

        # 2. SEED ALL 10 OFFICIAL VENUES
        self.stdout.write('\n--- Seeding Official Venues ---')
        VENUES = [
            {'name': 'Abol Hall', 'type': 'Cinema', 'capacity': 850, 'price': 5000.00, 'best_for': 'Large conferences & national events'},
            {'name': 'Adey Hall', 'type': 'Theatre/Auditorium', 'capacity': 90, 'price': 2500.00, 'best_for': 'Workshops & panel discussions'},
            {'name': 'Adey Hall A', 'type': 'Theatre/Auditorium', 'capacity': 50, 'price': 1500.00, 'best_for': 'Mid-size trainings'},
            {'name': 'Adey Hall B', 'type': 'Theatre/Auditorium', 'capacity': 40, 'price': 1200.00, 'best_for': 'Breakout sessions'},
            {'name': 'Lamebora Hall', 'type': 'Meeting', 'capacity': 40, 'price': 1000.00, 'best_for': 'Standard meetings'},
            {'name': 'Lamebora Hall A', 'type': 'Meeting', 'capacity': 26, 'price': 700.00, 'best_for': 'Small departmental meetings'},
            {'name': 'Lamebora Hall B', 'type': 'Meeting', 'capacity': 14, 'price': 500.00, 'best_for': 'Very small teams'},
            {'name': 'VIP Board Room', 'type': 'Boardroom', 'capacity': 12, 'price': 3000.00, 'best_for': 'Ministerial & High-level meetings'},
            {'name': 'VIP Lounge Area', 'type': 'Lounge', 'capacity': 30, 'price': 2000.00, 'best_for': 'Networking & refreshments'},
            {'name': 'VIP Refreshment Area', 'type': 'Refreshment', 'capacity': 20, 'price': 1000.00, 'best_for': 'Catering support'},
        ]

        for v in VENUES:
            obj, created = Venue.objects.update_or_create(
                name=v['name'],
                defaults={
                    'type': v['type'],
                    'capacity': v['capacity'],
                    'price': v['price'],
                    'best_for': v['best_for'],
                    'status': 'vacant'
                }
            )
            self.stdout.write(f'{"Created" if created else "Updated"}: {v["name"]}')

        # 3. SEED TECHNICAL SERVICES
        self.stdout.write('\n--- Seeding Technical Services ---')
        TECH_SERVICES = {
            'Internet Access': 100.00, 'HDMI Connection': 50.00, 'Wireless Sharing': 75.00,
            'LED Screen / Display': 500.00, 'Microphone': 150.00, 'Sound System': 300.00,
            'Video Conferencing': 400.00, 'Photography': 1000.00, 'Meeting Recording': 200.00,
            'Livestreaming': 800.00, 'Interpretation System': 1500.00, 'Presentation Laptop': 250.00,
        }
        for name, price in TECH_SERVICES.items():
            TechnicalService.objects.update_or_create(name=name, defaults={'price': price})

        # 4. SEED SUPPORT SERVICES
        self.stdout.write('\n--- Seeding Support Services ---')
        SUPPORT_SERVICES = {
            'Stationery': 50.00, 'Coffee Break': 200.00, 'Lunch Catering': 500.00,
            'Water Service': 30.00, 'Registration Desk': 100.00, 'Event Signage': 150.00,
            'Reception Support': 300.00, 'Security Support': 500.00, 'Cleaning Service': 200.00,
        }
        for name, price in SUPPORT_SERVICES.items():
            SupportService.objects.update_or_create(name=name, defaults={'price': price})

        # 5. SEED PROFESSIONAL EMAIL TEMPLATES
        self.stdout.write('\n--- Seeding Email Templates ---')
        templates = [
            {
                'trigger': 'approved',
                'subject': 'RESERVATION APPROVED: {event_title}',
                'body': 'Dear {name},\n\nWe are pleased to inform you that your reservation for {venue} has been APPROVED for {date}.\n\nNext Steps: Please proceed with the official payment process to confirm your booking.\n\nRegards,\nMoA Conference Management Team'
            },
            {
                'trigger': 'confirmed',
                'subject': 'BOOKING CONFIRMED: {event_title}',
                'body': 'Dear {name},\n\nThis is a formal confirmation of your booking for {venue}. Your slot is now officially secured.\n\nEvent: {event_title}\nDate: {date}\n\nWe look forward to hosting your event.'
            },
            {
                'trigger': 'rejected',
                'subject': 'RESERVATION UPDATE: {event_title}',
                'body': 'Dear {name},\n\nThank you for your interest in our facilities. Unfortunately, we are unable to approve your request for {venue} on {date} at this time.\n\nReason: {reason}\n\nPlease feel free to contact us for alternative scheduling.'
            },
        ]
        for t in templates:
            EmailTemplate.objects.update_or_create(trigger=t['trigger'], defaults={'subject': t['subject'], 'body': t['body']})

        self.stdout.write(self.style.SUCCESS('\n✓ FULL MINISTERIAL DATA SEEDED SUCCESSFULLY!'))