from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from conference.models import Venue, TechnicalService, SupportService, EmailTemplate, SystemUser
import json

class Command(BaseCommand):
    help = 'Seeds venues, services, official email templates, and a default admin'

    def handle(self, *args, **options):
        # 1. CREATE DEFAULT ADMIN (Added this inside the handle method)
        self.stdout.write('Creating default admin...')
        admin_email = 'leulabetu@gmail.com' # Change this to your preferred login email
        
        if not User.objects.filter(username=admin_email).exists():
            user = User.objects.create_superuser(
                username=admin_email,
                email=admin_email,
                password='adminpassword123' # Change this later!
            )
            # Link the SystemUser profile so the LoginView works
            SystemUser.objects.get_or_create(
                user=user,
                defaults={
                    'name': 'System Administrator',
                    'email': admin_email,
                    'role': 'system_admin'
                }
            )
            self.stdout.write(self.style.SUCCESS(f'Admin created: {admin_email} / adminpassword123'))
        else:
            self.stdout.write(self.style.WARNING('Admin already exists. Skipping...'))

        # 2. SEED TECHNICAL SERVICES
        self.stdout.write('Seeding technical services...')
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
        self.stdout.write('Seeding support services...')
        ss_names = ['Stationery', 'Coffee Break', 'Lunch Catering', 'Water Service', 'Security Support']
        for name in ss_names:
            SupportService.objects.update_or_create(name=name, defaults={'price': 150.00})

        # 4. SEED VENUES
        self.stdout.write('Mapping venue capabilities...')
        VENUES_TO_SEED = [
            {'name': 'Abol Hall', 'type': 'Cinema', 'cap': 850, 'price': 5000, 'best': 'Large conferences'},
            {'name': 'Adey Hall', 'type': 'Theatre/Auditorium', 'cap': 90, 'price': 2500, 'best': 'Mid-size trainings'},
            {'name': 'VIP Board Room', 'type': 'Boardroom', 'cap': 12, 'price': 3000, 'best': 'High-level meetings'},
        ]

        for v in VENUES_TO_SEED:
            Venue.objects.update_or_create(
                name=v['name'],
                defaults={
                    'type': v['type'],
                    'capacity': v['cap'],
                    'price': v['price'],
                    'best_for': v['best'],
                    'status': 'vacant'
                }
            )

        # 5. SEED EMAIL TEMPLATES
        self.stdout.write('Seeding professional email templates...')
        templates = [
            {'trigger': 'approved', 'subject': 'Reservation Approved', 'body': 'Dear {name}, your booking for {venue} on {date} is approved.'},
            {'trigger': 'confirmed', 'subject': 'Reservation Confirmed', 'body': 'Dear {name}, your booking for {venue} is confirmed.'},
            {'trigger': 'rejected', 'subject': 'Reservation Update', 'body': 'Dear {name}, your booking was rejected.'},
        ]

        for t in templates:
            EmailTemplate.objects.update_or_create(
                trigger=t['trigger'],
                defaults={'subject': t['subject'], 'body': t['body']}
            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded all Ministerial data and Admin user!'))