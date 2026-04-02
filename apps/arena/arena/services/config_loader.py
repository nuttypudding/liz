"""Load model catalog and feature assignments from models.yaml."""

from pathlib import Path

import yaml

from liz_shared.schemas.model_registry import FeatureAssignment, ModelConfig


def get_config_path() -> Path:
    return Path(__file__).resolve().parents[1] / "config" / "models.yaml"


def load_model_catalog(config_path: Path | None = None) -> dict[str, ModelConfig]:
    """Load all models from models.yaml, keyed by model_id."""
    config_path = config_path or get_config_path()
    with open(config_path) as f:
        data = yaml.safe_load(f)

    result = {}
    for key, attrs in data["models"].items():
        attrs.pop("model_id", None)  # avoid duplicate if present in YAML
        result[key] = ModelConfig(model_id=key, **attrs)
    return result


def load_feature_assignments(config_path: Path | None = None) -> list[FeatureAssignment]:
    """Load current feature-to-model assignments."""
    config_path = config_path or get_config_path()
    with open(config_path) as f:
        data = yaml.safe_load(f)

    return [
        FeatureAssignment(feature=feature, model_id=model_id)
        for feature, model_id in data.get("feature_assignments", {}).items()
    ]


def save_feature_assignments(
    assignments: list[FeatureAssignment], config_path: Path | None = None
) -> None:
    """Save feature-to-model assignments back to models.yaml."""
    config_path = config_path or get_config_path()
    with open(config_path) as f:
        data = yaml.safe_load(f)

    data["feature_assignments"] = {str(a.feature): a.model_id for a in assignments}

    with open(config_path, "w") as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)
