"""Left column: Browse intake/samples, show tenant message + photos."""

import streamlit as st
from PIL import Image

from liz_shared.constants import URGENCY_COLORS
from liz_shared.schemas.intake import IntakeSample


def render_sample_browser(samples: list[IntakeSample]) -> list[IntakeSample]:
    """Render sample browser and return selected samples."""
    st.header("Samples")

    # Select all toggle
    select_all = st.checkbox("Select all", value=True)

    selected: list[IntakeSample] = []

    for sample in samples:
        # Extract short label from sample_id: "sample_01_plumbing_sewer" -> "01 - plumbing sewer"
        parts = sample.sample_id.split("_", 2)
        num = parts[1] if len(parts) > 1 else "?"
        desc = parts[2].replace("_", " ") if len(parts) > 2 else sample.sample_id
        label = f"{num} - {desc}"

        is_selected = st.checkbox(label, value=select_all, key=f"sample_{sample.sample_id}")
        if is_selected:
            selected.append(sample)

    # Show detail for last clicked / first selected
    st.divider()
    if selected:
        _render_sample_detail(selected[-1])
    else:
        st.info("Select a sample to view details")

    return selected


def _render_sample_detail(sample: IntakeSample) -> None:
    """Show detail panel for a single sample."""
    st.subheader("Detail")

    # Ground truth badges
    urgency_color = URGENCY_COLORS.get(sample.ai_output.urgency, "#6b7280")
    st.markdown(
        f"**Category:** `{sample.ai_output.category}` &nbsp; "
        f"**Urgency:** :{_urgency_st_color(sample.ai_output.urgency)}"
        f"[{sample.ai_output.urgency}]"
    )

    # Tenant message
    st.markdown("**Tenant Message:**")
    st.text_area(
        "message",
        sample.input.tenant_message,
        height=120,
        disabled=True,
        label_visibility="collapsed",
    )

    # Photos
    if sample.photo_paths:
        st.markdown(f"**Photos** ({len(sample.photo_paths)})")
        cols = st.columns(min(len(sample.photo_paths), 3))
        for i, photo_path in enumerate(sample.photo_paths):
            with cols[i % len(cols)]:
                try:
                    img = Image.open(photo_path)
                    st.image(img, use_container_width=True)
                except Exception:
                    st.caption(f"Could not load {photo_path}")

    # Ground truth
    st.markdown("**Ground Truth:**")
    st.json(sample.ai_output.model_dump(mode="json"))


def _urgency_st_color(urgency: str) -> str:
    """Map urgency to Streamlit color name for markdown."""
    return {"emergency": "red", "medium": "orange", "low": "green"}.get(urgency, "gray")
