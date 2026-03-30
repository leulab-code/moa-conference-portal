from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from conference.models import Venue, TechnicalService, SupportService, EmailTemplate, SystemUser

class Command(BaseCommand):
    help = 'Seeds full Ministerial data: Admin, Venues, Services, and Official Templates'

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
                defaults={'name': 'System Administrator', 'email': admin_email, 'role': 'system_admin'}
            )
            self.stdout.write(self.style.SUCCESS(f'Created Admin: {admin_email}'))
        else:
            self.stdout.write('Admin already exists.')

        # 2. SEED TECHNICAL SERVICES
        self.stdout.write('\n--- Seeding Technical Services ---')
        ts_prices = {
            'Internet Access': 100.00, 'HDMI Connection': 50.00, 'Wireless Sharing': 75.00,
            'LED Screen / Display': 500.00, 'Microphone': 150.00, 'Sound System': 300.00,
            'Video Conferencing': 400.00, 'Photography': 1000.00, 'Meeting Recording': 200.00,
            'Livestreaming': 800.00, 'Interpretation System': 1500.00, 'Voting System': 600.00
        }
        ts_map = {}
        for name, price in ts_prices.items():
            obj, _ = TechnicalService.objects.update_or_create(
                name=name, defaults={'price': price}
            )
            ts_map[name] = obj.id

        # 3. SEED SUPPORT SERVICES
        self.stdout.write('\n--- Seeding Support Services ---')
        ss_names = ['Stationery', 'Coffee Break', 'Lunch Catering', 'Water Service', 'Security Support', 'Cleaning Service']
        for name in ss_names:
            SupportService.objects.update_or_create(name=name, defaults={'price': 150.00})

        # 4. SEED VENUES WITH INCLUDED CAPABILITIES
        self.stdout.write('\n--- Seeding Official Venues & Capabilities ---')
        
        FULL = ['Internet Access', 'HDMI Connection', 'Wireless Sharing', 'LED Screen / Display', 'Microphone', 'Sound System', 'Video Conferencing', 'Photography', 'Meeting Recording', 'Livestreaming', 'Interpretation System', 'Voting System']
        STANDARD = ['Internet Access', 'HDMI Connection', 'Wireless Sharing', 'LED Screen / Display', 'Microphone', 'Sound System', 'Video Conferencing', 'Photography', 'Meeting Recording', 'Livestreaming', 'Interpretation System']
        BASIC = ['Internet Access', 'HDMI Connection', 'LED Screen / Display', 'Video Conferencing', 'Livestreaming']

        VENUES_TO_SEED = [
            {'name': 'Abol Hall', 'type': 'Cinema', 'cap': 850, 'price': 5000.00, 'best': 'Large conferences & national events', 'tech': FULL},
            {'name': 'Adey Hall', 'type': 'Theatre/Auditorium', 'cap': 90, 'price': 2500.00, 'best': 'Mid-size trainings & symposia', 'tech': STANDARD},
            {'name': 'Adey Hall A', 'type': 'Theatre/Auditorium', 'cap': 50, 'price': 1500.00, 'best': 'Breakout sessions', 'tech': FULL},
            {'name': 'Adey Hall B', 'type': 'Theatre/Auditorium', 'cap': 40, 'price': 1200.00, 'best': 'Breakout sessions', 'tech': BASIC},
            {'name': 'Lamebora Hall', 'type': 'Meeting', 'cap': 40, 'price': 1000.00, 'best': 'Standard meetings', 'tech': BASIC},
            {'name': 'VIP Board Room', 'type': 'Boardroom', 'cap': 12, 'price': 3000.00, 'best': 'High-level / ministerial meetings', 'tech': BASIC},
            {'name': 'VIP Lounge Area', 'type': 'Lounge', 'cap': 20, 'price': 2000.00, 'best': 'Networking & refreshments', 'tech': BASIC},
        ]

        for v in VENUES_TO_SEED:
            obj, created = Venue.objects.update_or_create(
                name=v['name'],
                defaults={
                    'type': v['type'],
                    'capacity': v['cap'],
                    'price': v['price'],
                    'best_for': v['best'],
                    'status': 'vacant'
                }
            )
            
            # Map the services
            included_ids = [ts_map[t] for t in v['tech'] if t in ts_map]
            try:
                obj.included_services.set(included_ids)
            except AttributeError:
                obj.included_services = included_ids
                obj.save()
                
            self.stdout.write(f'{"Created" if created else "Updated"}: {v["name"]}')

        # 5. SEED PROFESSIONAL EMAIL TEMPLATES
        self.stdout.write('\n--- Seeding Email Templates ---')
        templates = [
            {
                'trigger': 'pending',
                'subject': 'Reservation Request Received - {event_title}',
                'body': 'Dear {name},\n\nThank you for submitting your reservation request for {venue} on {date}. \n\nYour request is currently PENDING review by the Ministry management team. We will notify you via email as soon as your booking is approved or if we need any additional information.\n\nReference: {ref}\n\nRegards,\nMoA Conference Management Team'
            },
            {
                'trigger': 'approved',
                'subject': 'RESERVATION APPROVED: {event_title}',
                'body': 'Dear {name},\n\nWe are pleased to inform you that your reservation for {venue} on {date} has been APPROVED.\n\nNext Steps: Please proceed with the official payment process within 48 hours to secure this slot.\n\nReference: {ref}\n\nRegards,\nMoA Conference Management Team'
            },
            {
                'trigger': 'confirmed',
                'subject': 'BOOKING CONFIRMED: {event_title}',
                'body': 'Dear {name},\n\nThis is a formal confirmation of your booking for {venue}. Your payment has been processed and your slot is officially secured.\n\nEvent: {event_title}\nDate: {date}\nReference: {ref}\n\nWe look forward to hosting your event.'
            },
            {
                'trigger': 'rejected',
                'subject': 'RESERVATION UPDATE: {event_title}',
                'body': 'Dear {name},\n\nThank you for your interest in our facilities. Unfortunately, we are unable to approve your request for {venue} on {date} at this time.\n\nPlease feel free to contact us for alternative scheduling.\n\nReference: {ref}'
            },
            {
                'trigger': 'reminder_24h',
                'subject': 'Reminder: Upcoming Event at MoA - {event_title}',
                'body': 'Dear {name},\n\nThis is a reminder that your event is scheduled for tomorrow at {venue}.\n\nReference: {ref}\n\nRegards,\nMoA Management'
            },
            {
                'trigger': 'reminder_48h_pay',
                'subject': 'URGENT: Payment Deadline Approaching',
                'body': 'Dear {name},\n\nPayment for booking {ref} is due. Failure to settle within 24 hours will result in automatic cancellation.'
            }
        ]

        for t in templates:
            EmailTemplate.objects.update_or_create(
                trigger=t['trigger'],
                defaults={'subject': t['subject'], 'body': t['body']}
            )

        self.stdout.write(self.style.SUCCESS('\n✓ FULL MINISTERIAL DATA SEEDED SUCCESSFULLY!'))