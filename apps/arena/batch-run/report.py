"""Batch Results Report — Streamlit page showing LLM Arena evaluation results."""

import json
import sys
from pathlib import Path

_app_dir = str(Path(__file__).resolve().parents[1])
_shared_dir = str(Path(__file__).resolve().parents[3] / "packages" / "shared")
for _p in [_app_dir, _shared_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

import pandas as pd
import streamlit as st
from PIL import Image

RESULTS_PATH = Path(__file__).resolve().parent / "results.json"

st.set_page_config(
    page_title="Liz Arena — Batch Report",
    page_icon="📊",
    layout="wide",
)

st.title("📊 Liz LLM Arena — Batch Evaluation Report")


@st.cache_data
def load_results():
    with open(RESULTS_PATH) as f:
        return json.load(f)


data = load_results()
meta = data["metadata"]
samples = data["samples"]
model_info = meta["models"]
model_ids = list(model_info.keys())

st.caption(
    f"Run: {meta['timestamp'][:19]}Z · "
    f"{meta['sample_count']} samples × {meta['model_count']} models = "
    f"{meta['total_evaluations']} evaluations · "
    f"{meta['total_time_s']}s total · "
    f"{len(meta.get('errors', []))} errors"
)


# ──────────────────────────────────────────────
# SHARED: Price matrix builder
# ──────────────────────────────────────────────
def build_price_df():
    rows = []
    for mid in model_ids:
        info = model_info[mid]
        rows.append({
            "Model": mid,
            "Provider": info["provider"].capitalize(),
            "Vision Tier": info["vision_tier"],
            "Input $/1M": info["cost_input_1m"],
            "Output $/1M": info["cost_output_1m"],
        })
    return pd.DataFrame(rows).sort_values("Input $/1M")


def render_price_table(label: str = ""):
    df = build_price_df()
    if label:
        st.subheader(label)
    st.dataframe(
        df,
        column_config={
            "Input $/1M": st.column_config.NumberColumn(format="$%.2f"),
            "Output $/1M": st.column_config.NumberColumn(format="$%.2f"),
        },
        use_container_width=True,
        hide_index=True,
    )


# ──────────────────────────────────────────────
# 1. PRICE MATRIX (TOP)
# ──────────────────────────────────────────────
render_price_table("1. Price Matrix")

# ──────────────────────────────────────────────
# 2. MODEL LEADERBOARD
# ──────────────────────────────────────────────
st.header("2. Model Leaderboard")

leaderboard_rows = []
for mid in model_ids:
    info = model_info[mid]
    cat_correct = 0
    urg_correct = 0
    total_eval = 0
    total_latency = 0.0
    error_count = 0

    for sid, sdata in samples.items():
        mresult = sdata["models"].get(mid)
        if not mresult:
            continue
        total_eval += 1
        if mresult.get("error"):
            error_count += 1
            continue
        if mresult["category_match"]:
            cat_correct += 1
        if mresult["urgency_match"]:
            urg_correct += 1
        total_latency += mresult.get("latency_s", 0)

    successful = total_eval - error_count
    cat_acc = (cat_correct / successful * 100) if successful else 0
    urg_acc = (urg_correct / successful * 100) if successful else 0
    overall_acc = ((cat_correct + urg_correct) / (successful * 2) * 100) if successful else 0
    avg_latency = (total_latency / successful) if successful else 0

    leaderboard_rows.append({
        "Model": mid,
        "Provider": info["provider"].capitalize(),
        "Tier": info["vision_tier"],
        "Category Acc %": round(cat_acc, 1),
        "Urgency Acc %": round(urg_acc, 1),
        "Overall Acc %": round(overall_acc, 1),
        "Avg Latency (s)": round(avg_latency, 1),
        "Errors": error_count,
        "Input $/1M": info["cost_input_1m"],
        "Output $/1M": info["cost_output_1m"],
    })

lb_df = pd.DataFrame(leaderboard_rows).sort_values("Overall Acc %", ascending=False)

st.dataframe(
    lb_df,
    column_config={
        "Category Acc %": st.column_config.ProgressColumn(min_value=0, max_value=100, format="%.1f%%"),
        "Urgency Acc %": st.column_config.ProgressColumn(min_value=0, max_value=100, format="%.1f%%"),
        "Overall Acc %": st.column_config.ProgressColumn(min_value=0, max_value=100, format="%.1f%%"),
        "Input $/1M": st.column_config.NumberColumn(format="$%.2f"),
        "Output $/1M": st.column_config.NumberColumn(format="$%.2f"),
    },
    use_container_width=True,
    hide_index=True,
)

# ──────────────────────────────────────────────
# 3. ACCURACY BY PROVIDER
# ──────────────────────────────────────────────
st.header("3. Accuracy by Provider")

provider_rows = []
for provider in sorted(set(info["provider"] for info in model_info.values())):
    provider_models = [mid for mid, info in model_info.items() if info["provider"] == provider]
    cat_c = urg_c = total_s = 0
    for mid in provider_models:
        for sid, sdata in samples.items():
            mresult = sdata["models"].get(mid)
            if not mresult or mresult.get("error"):
                continue
            total_s += 1
            if mresult["category_match"]:
                cat_c += 1
            if mresult["urgency_match"]:
                urg_c += 1

    cat_acc = (cat_c / total_s * 100) if total_s else 0
    urg_acc = (urg_c / total_s * 100) if total_s else 0
    overall = ((cat_c + urg_c) / (total_s * 2) * 100) if total_s else 0
    avg_cost = sum(model_info[m]["cost_input_1m"] for m in provider_models) / len(provider_models)

    provider_rows.append({
        "Provider": provider.capitalize(),
        "Models": len(provider_models),
        "Evaluations": total_s,
        "Category Acc %": round(cat_acc, 1),
        "Urgency Acc %": round(urg_acc, 1),
        "Overall Acc %": round(overall, 1),
        "Avg Input $/1M": round(avg_cost, 2),
    })

prov_df = pd.DataFrame(provider_rows).sort_values("Overall Acc %", ascending=False)
st.dataframe(
    prov_df,
    column_config={
        "Category Acc %": st.column_config.ProgressColumn(min_value=0, max_value=100, format="%.1f%%"),
        "Urgency Acc %": st.column_config.ProgressColumn(min_value=0, max_value=100, format="%.1f%%"),
        "Overall Acc %": st.column_config.ProgressColumn(min_value=0, max_value=100, format="%.1f%%"),
        "Avg Input $/1M": st.column_config.NumberColumn(format="$%.2f"),
    },
    use_container_width=True,
    hide_index=True,
)

# ──────────────────────────────────────────────
# 4. SAMPLE × MODEL MATRIX (expandable rows)
# ──────────────────────────────────────────────
st.header("4. Sample × Model Matrix")
st.caption("Click a row to see photos, tenant message, and model recommendations. Dark red = mismatch.")

from arena.services.sample_loader import load_all_samples

@st.cache_data
def get_sample_photos():
    """Load sample objects to get photo paths."""
    all_s = load_all_samples()
    return {
        s.sample_id: s.photo_paths
        for s in all_s
        if s.sample_id.split("_")[1].isdigit() and int(s.sample_id.split("_")[1]) <= 10
    }

photo_map = get_sample_photos()


def _color_cell(category, urgency, cat_match, urg_match):
    """Return HTML for a cell with red text on mismatches."""
    cat_color = "#8b0000" if not cat_match else "#1a1a1a"
    urg_color = "#8b0000" if not urg_match else "#1a1a1a"
    return (
        f'<span style="color:{cat_color};font-weight:{"700" if not cat_match else "400"}">{category}</span>'
        f' / '
        f'<span style="color:{urg_color};font-weight:{"700" if not urg_match else "400"}">{urgency}</span>'
    )


for sid, sdata in samples.items():
    parts = sid.split("_", 2)
    label = f"{parts[1]} - {parts[2].replace('_', ' ')}" if len(parts) > 2 else sid
    gt = sdata["ground_truth"]

    # Build summary line with colored model results
    model_summary_parts = []
    for mid in model_ids:
        mr = sdata["models"].get(mid, {})
        short = mid.split("/")[-1] if "/" in mid else mid
        if mr.get("error"):
            model_summary_parts.append(f'<span style="color:#8b0000;font-style:italic">{short}: ERROR</span>')
        elif mr.get("category") is None:
            model_summary_parts.append(f"{short}: —")
        else:
            cell = _color_cell(mr["category"], mr["urgency"], mr["category_match"], mr["urgency_match"])
            model_summary_parts.append(f"{short}: {cell}")

    summary_html = " &nbsp;|&nbsp; ".join(model_summary_parts)

    with st.expander(f"**{label}** — Ground Truth: {gt['category']} / {gt['urgency']} — {sdata['photo_count']} photo(s)"):
        # Summary row
        st.html(f'<div style="font-size:13px;margin-bottom:12px;">{summary_html}</div>')

        # Photos and tenant message
        col_photos, col_msg = st.columns([1, 2])

        with col_photos:
            st.markdown("**Photos**")
            photos = photo_map.get(sid, [])
            if photos:
                photo_cols = st.columns(min(len(photos), 3))
                for pi, photo_path in enumerate(photos):
                    with photo_cols[pi % len(photo_cols)]:
                        try:
                            img = Image.open(photo_path)
                            st.image(img, use_container_width=True)
                        except Exception:
                            st.caption(f"📷 {Path(photo_path).name}")
            else:
                st.caption("No photos for this sample")

        with col_msg:
            st.markdown("**Tenant Message**")
            st.caption(sdata["tenant_message"])

        # Model recommendations table
        st.markdown("**Model Recommendations**")

        rec_html = [
            '<table style="width:100%;border-collapse:collapse;font-size:13px;">',
            '<tr style="background:#f0f2f6;border-bottom:2px solid #ccc;">',
            '<th style="padding:6px 10px;text-align:left;">Model</th>',
            '<th style="padding:6px 10px;text-align:left;">Category</th>',
            '<th style="padding:6px 10px;text-align:left;">Urgency</th>',
            '<th style="padding:6px 10px;text-align:left;">Confidence</th>',
            '<th style="padding:6px 10px;text-align:left;">Recommended Action</th>',
            '<th style="padding:6px 10px;text-align:left;">Latency</th>',
            '</tr>',
        ]

        # Ground truth row
        rec_html.append(
            '<tr style="background:#e8f5e9;border-bottom:1px solid #e0e0e0;">'
            f'<td style="padding:6px 10px;font-weight:700;">Ground Truth</td>'
            f'<td style="padding:6px 10px;">{gt["category"]}</td>'
            f'<td style="padding:6px 10px;">{gt["urgency"]}</td>'
            f'<td style="padding:6px 10px;">{gt.get("confidence_score", "—")}</td>'
            f'<td style="padding:6px 10px;">{gt["recommended_action"][:200]}</td>'
            f'<td style="padding:6px 10px;">—</td>'
            '</tr>'
        )

        for mid in model_ids:
            mr = sdata["models"].get(mid, {})
            short = mid.split("/")[-1] if "/" in mid else mid
            if mr.get("error"):
                rec_html.append(
                    f'<tr style="border-bottom:1px solid #e0e0e0;">'
                    f'<td style="padding:6px 10px;">{short}</td>'
                    f'<td colspan="5" style="padding:6px 10px;color:#8b0000;font-style:italic;">{mr["error"][:150]}</td>'
                    f'</tr>'
                )
            elif mr.get("category") is None:
                rec_html.append(
                    f'<tr style="border-bottom:1px solid #e0e0e0;">'
                    f'<td style="padding:6px 10px;">{short}</td>'
                    f'<td colspan="5" style="padding:6px 10px;">—</td></tr>'
                )
            else:
                cat_style = 'color:#8b0000;font-weight:700' if not mr["category_match"] else ''
                urg_style = 'color:#8b0000;font-weight:700' if not mr["urgency_match"] else ''
                action = (mr.get("recommended_action") or "—")[:200]
                conf = f'{mr["confidence_score"]:.0%}' if mr.get("confidence_score") is not None else "—"
                latency = f'{mr["latency_s"]}s' if mr.get("latency_s") else "—"
                rec_html.append(
                    f'<tr style="border-bottom:1px solid #e0e0e0;">'
                    f'<td style="padding:6px 10px;">{short}</td>'
                    f'<td style="padding:6px 10px;{cat_style}">{mr["category"]}</td>'
                    f'<td style="padding:6px 10px;{urg_style}">{mr["urgency"]}</td>'
                    f'<td style="padding:6px 10px;">{conf}</td>'
                    f'<td style="padding:6px 10px;">{action}</td>'
                    f'<td style="padding:6px 10px;">{latency}</td>'
                    f'</tr>'
                )

        rec_html.append('</table>')
        st.html("".join(rec_html))

# ──────────────────────────────────────────────
# 5. ERROR LOG
# ──────────────────────────────────────────────
errors = meta.get("errors", [])
if errors:
    st.header("5. Error Log")
    for err in errors:
        st.code(err, language="text")

# ──────────────────────────────────────────────
# 6. RECOMMENDATIONS
# ──────────────────────────────────────────────
st.header("6. Recommendations")

best = lb_df.iloc[0]
cheapest = lb_df.sort_values("Input $/1M").iloc[0]
fastest = lb_df.sort_values("Avg Latency (s)").iloc[0]

col1, col2, col3 = st.columns(3)
with col1:
    st.metric("Most Accurate", best["Model"], f"{best['Overall Acc %']}%")
with col2:
    st.metric("Cheapest", cheapest["Model"], f"${cheapest['Input $/1M']}/1M in")
with col3:
    st.metric("Fastest", fastest["Model"], f"{fastest['Avg Latency (s)']}s avg")

st.info(
    f"**Best value pick**: Look for models with high accuracy AND low cost. "
    f"Currently **{best['Model']}** leads in accuracy at "
    f"${best['Input $/1M']}/${best['Output $/1M']} per 1M tokens."
)

# ──────────────────────────────────────────────
# 7. PRICE MATRIX (BOTTOM)
# ──────────────────────────────────────────────
render_price_table("7. Price Matrix")
