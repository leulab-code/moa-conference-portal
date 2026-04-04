from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from .models import EmailTemplate


def send_automated_email(booking, trigger_type):
    """
    Sends a professional HTML email based on stored templates.
    Triggers: pending, partial_paid, paid, approved, rejected, cancelled, completed
    """
    try:
        # 1. Get the template from the database
        # CRITICAL: trigger_type must exist in EmailTemplate table!
        template = EmailTemplate.objects.get(trigger=trigger_type)

        # 2. Map placeholders to actual data
        placeholders = {
            '{name}': booking.organizer_name,
            '{event}': booking.event_title,
            '{venue}': booking.venue.name,
            '{date}': booking.start_date.strftime('%B %d, %Y'),
            '{ref}': f"MOA-BKG-{booking.id}",
            '{status}': booking.get_status_display(),
        }

        # 3. Swap placeholders in subject and body
        subject = template.subject
        body_text = template.body
        for key, value in placeholders.items():
            subject = subject.replace(key, str(value))
            body_text = body_text.replace(key, str(value))

        # 4. Build a professional HTML version 
        body_html = _build_html_email(subject, body_text, booking, trigger_type)

        # 5. Send using EmailMultiAlternatives (plain + HTML)
        msg = EmailMultiAlternatives(
            subject=subject,
            body=body_text,  # Plain-text fallback
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[booking.organizer_email],
            reply_to=[settings.EMAIL_HOST_USER],
        )
        msg.attach_alternative(body_html, "text/html")
        msg.send(fail_silently=False)

        print(f"[EMAIL OK] '{trigger_type}' sent to {booking.organizer_email}")
        return True

    except EmailTemplate.DoesNotExist:
        # This is where your error is happening!
        print(f"[EMAIL ERROR] No database template found for trigger: '{trigger_type}'")
        return False
    except Exception as e:
        print(f"[SMTP ERROR] {e}")
        return False


def _build_html_email(subject, body_text, booking, trigger_type):
    """
    Wraps the body in a branded HTML template.
    """

    # Updated Color Palette for new statuses
    colors = {
        'pending': '#f59e0b',      # Amber
        'partial_paid': '#3b82f6', # Blue
        'paid': '#10b981',         # Emerald
        'approved': '#8b5cf6',      # Purple
        'rejected': '#ef4444',     # Red
        'cancelled': '#64748b',    # Slate
        'completed': '#1e293b',    # Dark Slate
    }
    accent = colors.get(trigger_type, '#268053')

    # Updated Status Labels
    labels = {
        'pending': 'Request Received',
        'partial_paid': 'First Payment Confirmed',
        'paid': 'Fully Confirmed',
        'approved': 'VIP Priority Approved',
        'rejected': 'Booking Not Possible',
        'cancelled': 'Booking Cancelled',
        'completed': 'Event Concluded',
    }
    status_label = labels.get(trigger_type, trigger_type.replace('_', ' ').title())

    # Convert line breaks to HTML
    body_paragraphs = ''.join(
        f'<p style="margin:0 0 16px 0; font-size:15px; line-height:1.7; color:#374151;">{line}</p>'
        for line in body_text.split('\n') if line.strip()
    )

    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding:40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #1b4332, #268053); padding:32px 40px; text-align:center;">
                            <h1 style="margin:0; font-size:22px; font-weight:800; color:#ffffff;">MoA Conference Center</h1>
                            <p style="margin:8px 0 0 0; font-size:11px; color:rgba(255,255,255,0.7); text-transform:uppercase; letter-spacing:2px;">Ministry of Agriculture &bull; Ethiopia</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 40px 0 40px; text-align:center;">
                            <span style="display:inline-block; background-color:{accent}; color:#ffffff; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; padding:8px 20px; border-radius:100px;">
                                {status_label}
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 40px;">
                            {body_paragraphs}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 40px 32px 40px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;">
                                <tr>
                                    <td style="padding:24px;">
                                        <p style="margin:0 0 12px 0; font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1.5px;">Official Reference</p>
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding:8px 0; font-size:13px; color:#64748b; font-weight:600; width:40%;">Reference ID</td>
                                                <td style="padding:8px 0; font-size:13px; color:#0f172a; font-weight:700;">MOA-BKG-{booking.id}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:8px 0; font-size:13px; color:#64748b; font-weight:600; border-top:1px solid #e2e8f0;">Event Title</td>
                                                <td style="padding:8px 0; font-size:13px; color:#0f172a; font-weight:700; border-top:1px solid #e2e8f0;">{booking.event_title}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:8px 0; font-size:13px; color:#64748b; font-weight:600; border-top:1px solid #e2e8f0;">Venue Name</td>
                                                <td style="padding:8px 0; font-size:13px; color:#0f172a; font-weight:700; border-top:1px solid #e2e8f0;">{booking.venue.name}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f8fafc; padding:24px 40px; border-top:1px solid #e2e8f0; text-align:center;">
                            <p style="margin:0 0 4px 0; font-size:12px; color:#94a3b8; font-weight:600;">Automated System Notification</p>
                            <p style="margin:0; font-size:11px; color:#cbd5e1;">Ministry of Agriculture &bull; Addis Ababa, Ethiopia &bull; &copy; 2026</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""