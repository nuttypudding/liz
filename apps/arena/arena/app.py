"""Liz LLM Arena — Compare vision models on maintenance intake classification."""

import sys
from pathlib import Path

# Resolve paths so imports work regardless of how streamlit is launched
_app_dir = str(Path(__file__).resolve().parents[1])  # apps/arena/
_shared_dir = str(Path(__file__).resolve().parents[3] / "packages" / "shared")

for _p in [_app_dir, _shared_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

import pandas as pd
import streamlit as st
from PIL import Image

from arena.services.config_loader import load_model_catalog
from arena.services.llm_runner import run_model
from arena.services.sample_loader import load_all_samples
from liz_shared.constants import URGENCY_COLORS
from liz_shared.schemas.intake import AIOutput

# Type alias
ArenaResults = dict[str, dict[str, AIOutput]]

NUM_LLM_COLUMNS = 3


def _generate_mock_results(samples: list, model_ids: list[str]) -> ArenaResults:
    """Generate mock results for layout testing. Will be replaced by llm_runner."""
    results: ArenaResults = {}
    for sample in samples:
        results[sample.sample_id] = {}
        for model_id in model_ids:
            truth = sample.ai_output
            results[sample.sample_id][model_id] = AIOutput(
                category=truth.category,
                urgency=truth.urgency,
                recommended_action=f"[MOCK - {model_id}] {truth.recommended_action}",
                confidence_score=round(max(0.5, truth.confidence_score - 0.05), 2),
            )
    return results


# -- Page config --
st.set_page_config(
    page_title="Liz LLM Arena",
    page_icon="🏠",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.title("🏠 Liz LLM Arena")
st.caption("Compare vision-capable LLMs on maintenance intake classification")


# -- Load data (early, needed for model table) --
@st.cache_data
def get_samples():
    all_samples = load_all_samples()
    return [s for s in all_samples if s.sample_id.split("_")[1].isdigit() and int(s.sample_id.split("_")[1]) <= 10]


@st.cache_data
def get_catalog():
    return load_model_catalog()


samples = get_samples()
catalog = get_catalog()
model_ids_list = list(catalog.keys())

# ──────────────────────────────────────────────
# MODEL COMPARISON TABLE (sortable)
# ──────────────────────────────────────────────
TIER_LABELS = {1: "🥇 Best", 2: "🥈 Good", 3: "🥉 Basic"}

_table_rows = []
for mid, cfg in catalog.items():
    _table_rows.append({
        "Model": mid,
        "Provider": cfg.provider.capitalize(),
        "Vision Quality": TIER_LABELS.get(cfg.vision_tier, "—"),
        "Quality Tier": cfg.vision_tier,
        "Input $/1M": cfg.cost_input_1m,
        "Output $/1M": cfg.cost_output_1m,
        "Note": cfg.vision_note,
    })

_model_df = pd.DataFrame(_table_rows)

with st.expander("**Model Comparison**", expanded=True):
    st.dataframe(
        _model_df,
        column_config={
            "Quality Tier": None,  # hidden — used for sorting, display uses Vision Quality
            "Input $/1M": st.column_config.NumberColumn(format="$%.2f"),
            "Output $/1M": st.column_config.NumberColumn(format="$%.2f"),
        },
        use_container_width=True,
        hide_index=True,
    )

st.divider()

# ──────────────────────────────────────────────
# HEADER ROW: column labels + model dropdowns
# ──────────────────────────────────────────────
header_cols = st.columns([2, 3, 3, 3])

with header_cols[0]:
    st.markdown("### Samples")

TIER_BADGES = {1: "🥇 Best", 2: "🥈 Good", 3: "🥉 Basic"}


def _format_model_label(model_key: str) -> str:
    """Format model name with tier badge for dropdown display."""
    info = catalog.get(model_key)
    tier = getattr(info, "vision_tier", 3) if info else 3
    badge = TIER_BADGES.get(tier, "")
    return f"{badge} — {model_key}"


def _model_caption(model_key: str) -> str:
    """Return cost + vision note string for display below dropdown."""
    info = catalog.get(model_key)
    if not info:
        return ""
    cost_in = info.cost_input_1m
    cost_out = info.cost_output_1m
    note = getattr(info, "vision_note", "")
    return f"${cost_in}/${cost_out} per 1M tokens · {note}"


selected_models: list[str] = []
for i in range(NUM_LLM_COLUMNS):
    with header_cols[i + 1]:
        default_idx = min(i, len(model_ids_list) - 1) if model_ids_list else 0
        model = st.selectbox(
            f"LLM Model {i + 1}",
            options=model_ids_list,
            format_func=_format_model_label,
            index=default_idx,
            key=f"llm_select_{i}",
        )
        st.caption(_model_caption(model))
        selected_models.append(model)

# ──────────────────────────────────────────────
# SELECT ALL: drives all sample checkboxes
# ──────────────────────────────────────────────

# Initialize session state for select_all and each sample on first run
if "select_all" not in st.session_state:
    st.session_state.select_all = True
    for sample in samples:
        st.session_state[f"sample_{sample.sample_id}"] = True


def _on_select_all_change():
    """Sync all sample checkboxes when Select All is toggled."""
    val = st.session_state.select_all
    for sample in samples:
        st.session_state[f"sample_{sample.sample_id}"] = val


select_all = st.checkbox(
    "Select All",
    key="select_all",
    on_change=_on_select_all_change,
)

# -- Run button --
col_run, col_status = st.columns([1, 4])
with col_run:
    run_clicked = st.button(
        "▶ Run Arena",
        type="primary",
        use_container_width=True,
    )
with col_status:
    n_selected = sum(
        1 for s in samples if st.session_state.get(f"sample_{s.sample_id}", False)
    )
    unique_models = len(set(selected_models))
    st.caption(
        f"**{n_selected}** sample(s) x **{unique_models}** unique model(s) "
        f"= **{n_selected * unique_models}** evaluations"
    )

st.divider()

# ──────────────────────────────────────────────
# SESSION STATE: arena results
# ──────────────────────────────────────────────
if "arena_results" not in st.session_state:
    st.session_state.arena_results = None

# Collect selected samples
selected_samples = [
    s for s in samples if st.session_state.get(f"sample_{s.sample_id}", False)
]

# Run arena
if run_clicked and selected_samples:
    unique_model_ids = list(dict.fromkeys(selected_models))
    total_calls = len(selected_samples) * len(unique_model_ids)
    results: ArenaResults = {}
    progress_bar = st.progress(0, text="Running arena...")
    errors: list[str] = []
    done = 0

    for sample in selected_samples:
        results[sample.sample_id] = {}
        for model_id in unique_model_ids:
            model_cfg = catalog.get(model_id)
            provider = model_cfg.provider if model_cfg else "unknown"
            progress_bar.progress(
                done / total_calls,
                text=f"Running {model_id} on {sample.sample_id}... ({done + 1}/{total_calls})",
            )
            try:
                output = run_model(model_id, provider, sample)
                results[sample.sample_id][model_id] = output
            except Exception as e:
                errors.append(f"{model_id} / {sample.sample_id}: {e}")
                # Fall back to mock for this cell
                truth = sample.ai_output
                results[sample.sample_id][model_id] = AIOutput(
                    category=truth.category,
                    urgency=truth.urgency,
                    recommended_action=f"[ERROR] {e}",
                    confidence_score=0.0,
                )
            done += 1

    progress_bar.progress(1.0, text="Done!")
    if errors:
        st.warning(f"{len(errors)} call(s) failed — see results marked [ERROR]")
        with st.expander("Error details"):
            for err in errors:
                st.code(err)
    st.session_state.arena_results = results

# ──────────────────────────────────────────────
# SAMPLE ROWS: one row per sample
# ──────────────────────────────────────────────
for sample in samples:
    # Extract label
    parts = sample.sample_id.split("_", 2)
    num = parts[1] if len(parts) > 1 else "?"
    desc = parts[2].replace("_", " ") if len(parts) > 2 else sample.sample_id

    row_cols = st.columns([2, 3, 3, 3])

    # ── Column 1: Sample info ──
    with row_cols[0]:
        is_selected = st.checkbox(
            f"{num} - {desc}",
            key=f"sample_{sample.sample_id}",
        )

        if is_selected:
            # Photos inline
            if sample.photo_paths:
                photo_cols = st.columns(min(len(sample.photo_paths), 3))
                for pi, photo_path in enumerate(sample.photo_paths):
                    with photo_cols[pi % len(photo_cols)]:
                        try:
                            img = Image.open(photo_path)
                            st.image(img, use_container_width=True)
                        except Exception:
                            st.caption(f"📷 {Path(photo_path).name}")

            # Tenant message
            st.markdown("**Tenant Message**")
            st.caption(sample.input.tenant_message[:200])

    # ── Columns 2-4: LLM results ──
    results = st.session_state.arena_results
    for i in range(NUM_LLM_COLUMNS):
        with row_cols[i + 1]:
            if not is_selected:
                st.caption("—")
                continue

            model_id = selected_models[i]

            if results and sample.sample_id in results and model_id in results[sample.sample_id]:
                output = results[sample.sample_id][model_id]
                truth = sample.ai_output

                # Category
                cat_match = output.category == truth.category
                st.markdown(f"**Category:** `{output.category}` {'✅' if cat_match else '❌'}")

                # Urgency
                urg_match = output.urgency == truth.urgency
                st.markdown(f"**Urgency:** `{output.urgency}` {'✅' if urg_match else '❌'}")

                # Recommended action
                st.markdown("**Recommended Action:**")
                action_text = output.recommended_action[:150]
                if len(output.recommended_action) > 150:
                    action_text += "..."
                st.caption(action_text)

                # Confidence
                st.markdown(f"**Confidence Score:** {output.confidence_score:.0%}")
            else:
                # Empty state — show field placeholders
                st.markdown("**Category:** ___")
                st.markdown("**Urgency:** ___")
                st.markdown("**Recommended Action:**")
                st.caption("—")
                st.markdown("**Confidence Score:** ___")

    st.divider()

# ──────────────────────────────────────────────
# FOOTER: Model assignment (hidden for now)
# ──────────────────────────────────────────────
st.markdown("---")
with st.expander("Feature → Model Assignment (coming soon)", expanded=False):
    st.info(
        "Per-feature model assignment is hidden during the evaluation phase. "
        "Once you've compared models, this section will let you assign the best "
        "model to each feature (Gatekeeper, Estimator, Matchmaker, Ledger)."
    )
