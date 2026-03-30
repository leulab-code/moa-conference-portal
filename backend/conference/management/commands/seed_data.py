from django.core.management.base import BaseCommand
from conference.models import Venue, TechnicalService, SupportService, EmailTemplate
import json

class Command(BaseCommand):
    help = 'Seeds venues, services, and official email templates'

    def handle(self, *args, **options):
        # 1. SEED TECHNICAL SERVICES
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
            ts_map[name] = obj.id  # Kept as integer for Django relationships

        # 2. SEED SUPPORT SERVICES
        self.stdout.write('Seeding support services...')
        ss_names = ['Stationery', 'Coffee Break', 'Lunch Catering', 'Water Service', 'Security Support']
        for name in ss_names:
            SupportService.objects.update_or_create(name=name, defaults={'price': 150.00})

        # 3. SEED VENUES WITH INCLUDED CAPABILITIES
        self.stdout.write('Mapping venue capabilities...')
        
        FULL = ['Internet Access', 'HDMI Connection', 'Wireless Sharing', 'LED Screen / Display', 'Microphone', 'Sound System', 'Video Conferencing', 'Photography', 'Meeting Recording', 'Livestreaming', 'Interpretation System', 'Voting System']
        STANDARD = ['Internet Access', 'HDMI Connection', 'Wireless Sharing', 'LED Screen / Display', 'Microphone', 'Sound System', 'Video Conferencing', 'Photography', 'Meeting Recording', 'Livestreaming', 'Interpretation System']
        BASIC = ['Internet Access', 'HDMI Connection', 'LED Screen / Display', 'Video Conferencing', 'Livestreaming']

        VENUES_TO_SEED = [
            {'name': 'Abol Hall', 'type': 'Cinema', 'cap': 850, 'price': 5000, 'best': 'Large conferences & national events', 'tech': FULL},
            {'name': 'Adey Hall', 'type': 'Theatre/Auditorium', 'cap': 90, 'price': 2500, 'best': 'Mid-size trainings & symposia', 'tech': STANDARD},
            {'name': 'Adey Hall A', 'type': 'Theatre/Auditorium', 'cap': 50, 'price': 1500, 'best': 'Breakout sessions', 'tech': FULL},
            {'name': 'Adey Hall B', 'type': 'Theatre/Auditorium', 'cap': 40, 'price': 1200, 'best': 'Breakout sessions', 'tech': BASIC},
            {'name': 'Lamebora Hall', 'type': 'Meeting', 'cap': 40, 'price': 1000, 'best': 'Standard meetings', 'tech': BASIC},
            {'name': 'VIP Board Room', 'type': 'Boardroom', 'cap': 12, 'price': 3000, 'best': 'High-level / ministerial meetings', 'tech': BASIC},
            {'name': 'VIP Lounge Area', 'type': 'Lounge', 'cap': 20, 'price': 2000, 'best': 'Networking & refreshments', 'tech': BASIC},
        ]

        for v in VENUES_TO_SEED:
            # Create or update the Venue first
            obj, created = Venue.objects.update_or_create(
                name=v['name'],
                defaults={
                    'type': v['type'],
                    'capacity': v['cap'],
                    'price': v['price'],
                    'best_for': v['best'],
                }
            )
            
            # Map the services safely depending on your model structure
            included_ids = [ts_map[t] for t in v['tech'] if t in ts_map]
            
            # Try to set it as a ManyToMany field (standard Django approach)
            try:
                obj.included_services.set(included_ids)
            except AttributeError:
                # Fallback if you used a JSONField instead of ManyToMany
                obj.included_services = included_ids
                obj.save()

        # 4. SEED PROFESSIONAL EMAIL TEMPLATES
        # 4. SEED PROFESSIONAL EMAIL TEMPLATES
        self.stdout.write('Seeding professional email templates...')
        templates = [
            {
                'trigger': 'pending',  # <-- NEW TEMPLATE HERE
                'subject': 'Reservation Request Received - {event}',
                'body': 'Dear {name},\n\nThank you for submitting your reservation request for {venue} on {date}. \n\nYour request is currently PENDING review by the Ministry management team. We will notify you via email as soon as your booking is approved or if we need any additional information.\n\nReference: {ref}\n\nRegards,\nMoA Conference Management Team'
            },
            {
                'trigger': 'approved',
                'subject': 'Venue Reservation Approved - Action Required',
                'body': 'Dear {name},\n\nYour request for {venue} on {date} has been approved. To secure this slot, please settle the payment within 48 hours.\n\nReference: {ref}'
            },
            {
                'trigger': 'confirmed',
                'subject': 'Official Confirmation of Venue Reservation',
                'body': 'Dear {name},\n\nWe are pleased to confirm your reservation for {venue}. Your payment has been processed. We look forward to hosting your event.\n\nReference: {ref}'
            },
            {
                'trigger': 'reminder_24h',
                'subject': 'Reminder: Upcoming Event at MoA - {event}',
                'body': 'Dear {name},\n\nThis is a reminder that your event {event} is scheduled for tomorrow at {venue}.\n\nStart Time: {time}\n\nRegards,\nMoA Management'
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

       

        self.stdout.write(self.style.SUCCESS('Successfully seeded all Ministerial data!'))