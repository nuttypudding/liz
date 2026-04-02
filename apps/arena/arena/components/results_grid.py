"""Results grid: side-by-side LLM output comparison with accuracy scoring."""

import streamlit as st

from liz_shared.constants import URGENCY_COLORS
from liz_shared.schemas.intake import AIOutput


# Type alias for arena results: {sample_id: {model_id: AIOutput}}
ArenaResults = dict[str, dict[str, AIOutput]]


def render_results_grid(
    results: ArenaResults | None,
    ground_truth: dict[str, AIOutput],
    model_ids: list[str],
) -> None:
    """Render side-by-side comparison of LLM outputs vs ground truth."""
    st.header("Results")

    if results is None:
        st.info("Click **Run Arena** to compare models on selected samples.")
        _render_placeholder_grid(model_ids)
        return

    if not results:
        st.warning("No results yet. Run the arena first.")
        return

    # Per-sample comparison
    for sample_id, model_outputs in results.items():
        truth = ground_truth.get(sample_id)
        if not truth:
            continue

        st.subheader(sample_id.replace("_", " ").title())

        cols = st.columns(len(model_ids) + 1)

        # Ground truth column
        with cols[0]:
            st.markdown("**Ground Truth**")
            _render_output_card(truth, truth=None, is_ground_truth=True)

        # Model output columns
        for i, model_id in enumerate(model_ids):
            with cols[i + 1]:
                st.markdown(f"**{model_id}**")
                output = model_outputs.get(model_id)
                if output:
                    _render_output_card(output, truth=truth, is_ground_truth=False)
                else:
                    st.caption("No result")

        st.divider()

    # Aggregate scores
    _render_aggregate_scores(results, ground_truth, model_ids)


def _render_placeholder_grid(model_ids: list[str]) -> None:
    """Show empty placeholder columns for selected models."""
    if not model_ids:
        return

    st.caption("Preview of comparison columns:")
    cols = st.columns(len(model_ids) + 1)
    with cols[0]:
        st.markdown("**Ground Truth**")
        st.caption("category\nurgency\naction\nconfidence")
    for i, model_id in enumerate(model_ids):
        with cols[i + 1]:
            st.markdown(f"**{model_id}**")
            st.caption("— awaiting run —")


def _render_output_card(
    output: AIOutput, truth: AIOutput | None, is_ground_truth: bool
) -> None:
    """Render a single model's output as a card."""
    # Category
    cat_match = is_ground_truth or (truth and output.category == truth.category)
    cat_icon = "" if is_ground_truth else (" ✅" if cat_match else " ❌")
    st.markdown(f"**Category:** `{output.category}`{cat_icon}")

    # Urgency
    urg_match = is_ground_truth or (truth and output.urgency == truth.urgency)
    urg_icon = "" if is_ground_truth else (" ✅" if urg_match else " ❌")
    st.markdown(f"**Urgency:** `{output.urgency}`{urg_icon}")

    # Confidence
    st.markdown(f"**Confidence:** {output.confidence_score:.0%}")

    # Recommended action (truncated)
    action_preview = output.recommended_action[:120]
    if len(output.recommended_action) > 120:
        action_preview += "..."
    st.caption(action_preview)


def _render_aggregate_scores(
    results: ArenaResults,
    ground_truth: dict[str, AIOutput],
    model_ids: list[str],
) -> None:
    """Show aggregate accuracy scores per model."""
    st.subheader("Aggregate Scores")

    scores: dict[str, dict[str, float]] = {}

    for model_id in model_ids:
        cat_correct = 0
        urg_correct = 0
        total = 0

        for sample_id, model_outputs in results.items():
            truth = ground_truth.get(sample_id)
            output = model_outputs.get(model_id)
            if not truth or not output:
                continue
            total += 1
            if output.category == truth.category:
                cat_correct += 1
            if output.urgency == truth.urgency:
                urg_correct += 1

        if total > 0:
            scores[model_id] = {
                "Category Accuracy": cat_correct / total,
                "Urgency Accuracy": urg_correct / total,
                "Samples Evaluated": total,
            }

    if scores:
        cols = st.columns(len(model_ids))
        for i, model_id in enumerate(model_ids):
            with cols[i]:
                st.markdown(f"**{model_id}**")
                s = scores.get(model_id, {})
                cat_acc = s.get("Category Accuracy", 0)
                urg_acc = s.get("Urgency Accuracy", 0)
                st.metric("Category", f"{cat_acc:.0%}")
                st.metric("Urgency", f"{urg_acc:.0%}")
                st.caption(f"n={int(s.get('Samples Evaluated', 0))}")
    else:
        st.caption("No scores to display")
