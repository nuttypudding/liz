"""Model selection panel: checkboxes grouped by provider."""

from collections import defaultdict

import streamlit as st

from liz_shared.schemas.model_registry import ModelConfig


def render_model_selector(catalog: dict[str, ModelConfig]) -> list[str]:
    """Render model selection checkboxes grouped by provider. Returns selected model IDs."""
    st.header("Models")

    # Group models by provider
    by_provider: dict[str, list[ModelConfig]] = defaultdict(list)
    for model in catalog.values():
        by_provider[model.provider].append(model)

    provider_display = {
        "openai": "OpenAI",
        "anthropic": "Anthropic",
        "google": "Google",
        "groq": "Groq",
    }

    selected_ids: list[str] = []

    for provider_key in ["openai", "anthropic", "google", "groq"]:
        models = by_provider.get(provider_key, [])
        if not models:
            continue

        display_name = provider_display.get(provider_key, provider_key)
        with st.expander(f"**{display_name}** ({len(models)} models)", expanded=True):
            for model in models:
                cost_label = f"${model.cost_input_1m:.2f}/1M in"
                checked = st.checkbox(
                    f"`{model.model_id}` — {cost_label}",
                    key=f"model_{model.model_id}",
                    value=False,
                )
                if checked:
                    selected_ids.append(model.model_id)

    # Summary
    if selected_ids:
        st.success(f"{len(selected_ids)} model(s) selected")
    else:
        st.warning("Select at least one model")

    return selected_ids
