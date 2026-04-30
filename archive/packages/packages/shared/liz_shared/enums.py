from enum import StrEnum


class Category(StrEnum):
    PLUMBING = "plumbing"
    ELECTRICAL = "electrical"
    HVAC = "hvac"
    STRUCTURAL = "structural"
    PEST = "pest"
    APPLIANCE = "appliance"
    GENERAL = "general"


class Urgency(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    EMERGENCY = "emergency"


class TicketStatus(StrEnum):
    PENDING_TRIAGE = "pending_triage"
    TRIAGED = "triaged"
    TROUBLESHOOTING_SENT = "troubleshooting_sent"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    WORK_ORDER_DRAFTED = "work_order_drafted"
    WORK_ORDER_SENT = "work_order_sent"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CLOSED = "closed"


class Feature(StrEnum):
    GATEKEEPER = "gatekeeper"
    ESTIMATOR = "estimator"
    MATCHMAKER = "matchmaker"
    LEDGER = "ledger"
