"""Model assignment panel: assign the best model to each feature."""

from __future__ import annotations

from collections.abc import Callable

import streamlit as st

from liz_shared.enums import Feature
from liz_shared.schemas.model_registry import FeatureAssignment

FEATURE_DESCRIPTIONS = {
    Feature.GATEKEEPER: "Triage & troubleshooting — speed matters",
    Feature.ESTIMATOR: "Vision AI damage analysis — accuracy matters",
    Feature.MATCHMAKER: "Work order drafting — writing quality matters",
    Feature.LEDGER: "Data summarization — cost efficiency matters",
}


def render_model_assignment(
    current_assignments: list[FeatureAssignment],
    available_model_ids: list[str],
    on_save: Callable | None = None,
) -> list[FeatureAssignment]:
    """Render per-feature model assignment dropdowns. Returns updated assignments."""
    st.header("Feature → Model Assignment")
    st.caption("Assign the best-performing model to each product feature.")

    # Build lookup of current assignments
    current_map = {a.feature: a.model_id for a in current_assignments}

    if not available_model_ids:
        st.info("Run the arena first to populate model options.")
        available_model_ids = list(current_map.values())

    # Ensure all current assignments are in the options
    all_options = list(dict.fromkeys(available_model_ids + list(current_map.values())))

    updated: list[FeatureAssignment] = []

    for feature in Feature:
        desc = FEATURE_DESCRIPTIONS.get(feature, "")
        current = current_map.get(feature, all_options[0] if all_options else "")

        idx = all_options.index(current) if current in all_options else 0

        selected = st.selectbox(
            f"**{feature.value.title()}** — {desc}",
            options=all_options,
            index=idx,
            key=f"assign_{feature}",
        )
        updated.append(FeatureAssignment(feature=feature, model_id=selected))

    # Save button
    st.divider()
    if st.button("💾 Save Assignments", type="primary", use_container_width=True):
        if on_save:
            on_save(updated)
        st.success("Assignments saved to config/models.yaml")

    return updated
