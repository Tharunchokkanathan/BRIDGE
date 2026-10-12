"""
BRIDGE — Proactive Customer Notification Engine (Phase 5)
Multi-channel notification templates (SMS, WhatsApp, Email) customized for
SHAP-driven smart interventions.
"""

from typing import Dict, Any, Optional
import urllib.parse


DEFAULT_PORTAL_BASE_URL = "https://bridge.delivery/track"


TEMPLATES = {
    "access_point": {
        "SMS": {
            "body": "BRIDGE Alert: We noticed you might miss package {package_id}. We can divert it to a secure 24/7 Smart Locker near you. Select a locker: {cta_url}",
        },
        "WHATSAPP": {
            "body": "[BRIDGE Delivery Notification]\n\nHello {recipient_name},\n\nTo ensure your package *{package_id}* arrives safely without delays, we can deliver it to a secure 24/7 Smart Locker or PUDO partner counter.\n\n*Benefits*: Pick up whenever convenient with your 1-time PIN code.\n\n*Select your preferred locker now*: {cta_url}",
        },
        "EMAIL": {
            "subject": "Update Delivery Preference for Package {package_id}",
            "body": (
                "Dear {recipient_name},\n\n"
                "Your scheduled delivery for package {package_id} is approaching during window {eta_window}.\n\n"
                "To ensure a seamless first-attempt delivery, you can route your shipment to a secure 24/7 Smart Locker hub or verified pickup counter nearby.\n\n"
                "Click below to choose your nearest collection hub:\n"
                "{cta_url}\n\n"
                "Warm regards,\n"
                "BRIDGE Logistics Guidance Team"
            ),
        }
    },
    "confirm_availability": {
        "SMS": {
            "body": "BRIDGE: Package {package_id} is arriving during {eta_window}. Will you be available to receive it? Confirm in 1-click: {cta_url}",
        },
        "WHATSAPP": {
            "body": "[Confirm Your Delivery Window]\n\nHello {recipient_name},\n\nPackage *{package_id}* is on route and scheduled for delivery between *{eta_window}*.\n\nTo guarantee first-attempt success, please tap below to confirm your presence:\n\n*Confirm Availability*: {cta_url}",
        },
        "EMAIL": {
            "subject": "Delivery Window Confirmation: Package {package_id}",
            "body": (
                "Dear {recipient_name},\n\n"
                "Your courier is scheduled to arrive during {eta_window} for package {package_id}.\n\n"
                "Please take a moment to confirm that you or an authorized person will be on site to receive this delivery:\n"
                "{cta_url}\n\n"
                "Thank you for helping us ensure a successful delivery!\n\n"
                "BRIDGE Dispatch Team"
            ),
        }
    },
    "reschedule_day": {
        "SMS": {
            "body": "BRIDGE: Not home during {eta_window}? Reschedule package {package_id} to a date that suits you at no charge: {cta_url}",
        },
        "WHATSAPP": {
            "body": "[Reschedule Delivery Free of Charge]\n\nHello {recipient_name},\n\nIf you won't be available during {eta_window} for package *{package_id}*, you can pick an alternate date that fits your schedule.\n\n*Choose a convenient date*: {cta_url}",
        },
        "EMAIL": {
            "subject": "Reschedule Delivery for Package {package_id}",
            "body": (
                "Dear {recipient_name},\n\n"
                "We want to ensure your delivery of package {package_id} is convenient.\n"
                "If the upcoming window {eta_window} does not work for you, you can easily choose an alternative date.\n\n"
                "Select a new delivery date here:\n"
                "{cta_url}\n\n"
                "BRIDGE Customer Care"
            ),
        }
    },
    "deliver_neighbor": {
        "SMS": {
            "body": "BRIDGE: Authorize neighbor or front-desk handoff for package {package_id} to avoid missed delivery: {cta_url}",
        },
        "WHATSAPP": {
            "body": "[Authorize Neighbor or Front Desk Dropoff]\n\nHello {recipient_name},\n\nIf you might step out during {eta_window}, you can authorize our courier to leave package *{package_id}* with a trusted neighbor or building concierge.\n\n*Authorize handoff*: {cta_url}",
        },
        "EMAIL": {
            "subject": "Alternative Dropoff Authorization: Package {package_id}",
            "body": (
                "Dear {recipient_name},\n\n"
                "For package {package_id} scheduled for {eta_window}, you have the option to designate a trusted neighbor or front desk security guard for receipt.\n\n"
                "Provide authorization details here:\n"
                "{cta_url}\n\n"
                "BRIDGE Delivery Operations"
            ),
        }
    },
    "hold_pickup": {
        "SMS": {
            "body": "BRIDGE: Hold package {package_id} at our local delivery station for easy pickup: {cta_url}",
        },
        "WHATSAPP": {
            "body": "[Hold for Station Pickup]\n\nHello {recipient_name},\n\nPrefer picking up package *{package_id}* yourself? We can hold it safely at your local distribution station counter.\n\n*Confirm Station Hold*: {cta_url}",
        },
        "EMAIL": {
            "subject": "Station Pickup Confirmation for Package {package_id}",
            "body": (
                "Dear {recipient_name},\n\n"
                "You can request package {package_id} to be held at your local delivery station counter for secure collection at your convenience.\n\n"
                "Confirm station pickup instructions:\n"
                "{cta_url}\n\n"
                "BRIDGE Operations Center"
            ),
        }
    }
}


class MessageDispatcher:
    """
    Renders and prepares proactive customer engagement notifications
    for smart interventions across SMS, WhatsApp, and Email channels.
    """

    def __init__(self, portal_base_url: str = DEFAULT_PORTAL_BASE_URL):
        self.portal_base_url = portal_base_url

    def preview_message(
        self,
        package_id: str,
        intervention_id: str,
        channel: str = "SMS",
        recipient_name: Optional[str] = None,
        eta_window: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Renders a preview notification for a specific intervention and communication channel.
        """
        ch_upper = channel.strip().upper()
        if ch_upper not in ("SMS", "WHATSAPP", "EMAIL"):
            raise ValueError(f"Unsupported channel '{channel}'. Supported channels: SMS, WhatsApp, Email.")

        int_key = intervention_id.strip().lower()
        if int_key not in TEMPLATES:
            raise ValueError(f"Unknown intervention '{intervention_id}'. Known types: {list(TEMPLATES.keys())}")

        template_data = TEMPLATES[int_key].get(ch_upper, TEMPLATES[int_key]["SMS"])

        rec_name = recipient_name or "Valued Customer"
        window = eta_window or "14:00 - 18:00"
        cta_url = f"{self.portal_base_url}/{urllib.parse.quote(str(package_id))}?action={urllib.parse.quote(int_key)}"

        body_tpl = template_data.get("body", "")
        rendered_body = body_tpl.format(
            recipient_name=rec_name,
            package_id=package_id,
            eta_window=window,
            cta_url=cta_url
        )

        subject = None
        if "subject" in template_data:
            subject = template_data["subject"].format(
                recipient_name=rec_name,
                package_id=package_id,
                eta_window=window,
                cta_url=cta_url
            )

        return {
            "package_id": package_id,
            "intervention_id": int_key,
            "channel": ch_upper,
            "subject": subject,
            "content": rendered_body,
            "cta_url": cta_url,
            "char_count": len(rendered_body),
            "metadata": {
                "recipient_name": rec_name,
                "eta_window": window,
                "channel_format": ch_upper
            }
        }
