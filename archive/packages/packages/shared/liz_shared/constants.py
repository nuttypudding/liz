from liz_shared.enums import Category

CATEGORY_LABELS: dict[Category, str] = {
    Category.PLUMBING: "Plumbing",
    Category.ELECTRICAL: "Electrical",
    Category.HVAC: "HVAC",
    Category.STRUCTURAL: "Structural",
    Category.PEST: "Pest",
    Category.APPLIANCE: "Appliance",
    Category.GENERAL: "General",
}

URGENCY_COLORS: dict[str, str] = {
    "emergency": "#dc2626",
    "medium": "#f59e0b",
    "low": "#22c55e",
}
