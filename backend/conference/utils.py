import re
from django.core.mail import send_mail
from django.conf import settings
from .models import EmailTemplate

def send_automated_email(booking, trigger_type):
    try:
        # 1. Get the template from the database
        template = EmailTemplate.objects.get(trigger=trigger_type)
        
        # 2. Map placeholders to actual data
        # We use booking.organizer_name because it's always available!
        placeholders = {
            '{name}': booking.organizer_name, 
            '{event}': booking.event_title,
            '{venue}': booking.venue.name,
            '{date}': booking.start_date.strftime('%B %d, %Y'),
            '{ref}': f"MOA-BKG-{booking.id}",
            '{status}': booking.get_status_display() # Use this for the "pretty" name
        }

        # 3. Swap placeholders in subject and body
        subject = template.subject
        body = template.body
        for key, value in placeholders.items():
            subject = subject.replace(key, str(value))
            body = body.replace(key, str(value))

        # 4. Send the email using your .env settings
        send_mail(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL,
            [booking.organizer_email], # Send to the email provided in the booking
            fail_silently=False,
        )
        return True
        
    except EmailTemplate.DoesNotExist:
        print(f"Error: No email template found for '{trigger_type}'")
        return False
    except Exception as e:
        print(f"SMTP Error: {e}")
        return False