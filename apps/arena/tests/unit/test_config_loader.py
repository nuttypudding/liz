"""Unit tests for arena.services.config_loader."""

from pathlib import Path

import pytest
import yaml

from arena.services.config_loader import (
    load_feature_assignments,
    load_model_catalog,
    save_feature_assignments,
)
from liz_shared.enums import Feature
from liz_shared.schemas.model_registry import FeatureAssignment, ModelConfig


class TestLoadModelCatalog:
    """Tests for loading the model catalog from YAML."""

    def test_loads_all_models(self, tmp_config_file: Path):
        catalog = load_model_catalog(tmp_config_file)
        assert len(catalog) == 4

    def test_model_ids_are_keys(self, tmp_config_file: Path):
        catalog = load_model_catalog(tmp_config_file)
        for model_id, model in catalog.items():
            assert model.model_id == model_id

    def test_provider_set_correctly(self, tmp_config_file: Path):
        catalog = load_model_catalog(tmp_config_file)
        assert catalog["gpt-4o"].provider == "openai"
        assert catalog["gemini-2.0-flash"].provider == "google"
        assert catalog["claude-sonnet-4-20250514"].provider == "anthropic"
        assert catalog["llama-4-scout-17b-16e-instruct"].provider == "groq"

    def test_vision_support_flag(self, tmp_config_file: Path):
        catalog = load_model_catalog(tmp_config_file)
        for model in catalog.values():
            assert model.supports_vision is True

    def test_cost_values_loaded(self, tmp_config_file: Path):
        catalog = load_model_catalog(tmp_config_file)
        gpt4o = catalog["gpt-4o"]
        assert gpt4o.cost_input_1m == 2.50
        assert gpt4o.cost_output_1m == 10.00

    def test_max_tokens_loaded(self, tmp_config_file: Path):
        catalog = load_model_catalog(tmp_config_file)
        assert catalog["gpt-4o"].max_tokens == 128000
        assert catalog["gemini-2.0-flash"].max_tokens == 1048576

    def test_missing_file_raises(self, tmp_path: Path):
        with pytest.raises(FileNotFoundError):
            load_model_catalog(tmp_path / "nonexistent.yaml")

    def test_handles_model_id_key_in_yaml(self, tmp_path: Path):
        """Ensure we don't crash if YAML includes model_id as a field."""
        config_path = tmp_path / "models.yaml"
        config_path.write_text(yaml.dump({
            "models": {
                "test-model": {
                    "model_id": "test-model",
                    "provider": "openai",
                    "supports_vision": True,
                    "cost_input_1m": 1.0,
                    "cost_output_1m": 2.0,
                    "max_tokens": 4096,
                }
            },
            "feature_assignments": {},
        }))
        catalog = load_model_catalog(config_path)
        assert "test-model" in catalog
        assert catalog["test-model"].model_id == "test-model"

    def test_loads_real_config(self):
        """Integration: verify real models.yaml loads correctly."""
        from arena.services.config_loader import get_config_path

        config_path = get_config_path()
        if not config_path.exists():
            pytest.skip("Real config not available")
        catalog = load_model_catalog(config_path)
        assert len(catalog) == 8

        providers = {m.provider for m in catalog.values()}
        assert providers == {"openai", "anthropic", "google", "groq"}


class TestLoadFeatureAssignments:
    """Tests for loading feature-to-model assignments."""

    def test_loads_all_assignments(self, tmp_config_file: Path):
        assignments = load_feature_assignments(tmp_config_file)
        assert len(assignments) == 4

    def test_assignment_features(self, tmp_config_file: Path):
        assignments = load_feature_assignments(tmp_config_file)
        features = {a.feature for a in assignments}
        assert features == {
            Feature.GATEKEEPER,
            Feature.ESTIMATOR,
            Feature.MATCHMAKER,
            Feature.LEDGER,
        }

    def test_assignment_model_ids(self, tmp_config_file: Path):
        assignments = load_feature_assignments(tmp_config_file)
        assignment_map = {a.feature: a.model_id for a in assignments}
        assert assignment_map[Feature.GATEKEEPER] == "gemini-2.0-flash"
        assert assignment_map[Feature.ESTIMATOR] == "gpt-4o"

    def test_empty_assignments(self, tmp_path: Path):
        config_path = tmp_path / "models.yaml"
        config_path.write_text(yaml.dump({"models": {}, "feature_assignments": {}}))
        assignments = load_feature_assignments(config_path)
        assert assignments == []

    def test_missing_assignments_key(self, tmp_path: Path):
        config_path = tmp_path / "models.yaml"
        config_path.write_text(yaml.dump({"models": {}}))
        assignments = load_feature_assignments(config_path)
        assert assignments == []


class TestSaveFeatureAssignments:
    """Tests for persisting feature assignments back to YAML."""

    def test_save_and_reload(self, tmp_config_file: Path):
        new_assignments = [
            FeatureAssignment(feature=Feature.GATEKEEPER, model_id="gpt-4o"),
            FeatureAssignment(feature=Feature.ESTIMATOR, model_id="gpt-4o"),
            FeatureAssignment(feature=Feature.MATCHMAKER, model_id="gpt-4o"),
            FeatureAssignment(feature=Feature.LEDGER, model_id="gpt-4o"),
        ]
        save_feature_assignments(new_assignments, tmp_config_file)

        reloaded = load_feature_assignments(tmp_config_file)
        assert len(reloaded) == 4
        for a in reloaded:
            assert a.model_id == "gpt-4o"

    def test_preserves_model_catalog(self, tmp_config_file: Path):
        new_assignments = [
            FeatureAssignment(feature=Feature.GATEKEEPER, model_id="gpt-4o"),
        ]
        save_feature_assignments(new_assignments, tmp_config_file)

        catalog = load_model_catalog(tmp_config_file)
        assert len(catalog) == 4  # original models preserved

    def test_overwrites_previous_assignments(self, tmp_config_file: Path):
        first = [FeatureAssignment(feature=Feature.GATEKEEPER, model_id="gpt-4o")]
        save_feature_assignments(first, tmp_config_file)

        second = [FeatureAssignment(feature=Feature.GATEKEEPER, model_id="gemini-2.0-flash")]
        save_feature_assignments(second, tmp_config_file)

        reloaded = load_feature_assignments(tmp_config_file)
        gatekeeper = next(a for a in reloaded if a.feature == Feature.GATEKEEPER)
        assert gatekeeper.model_id == "gemini-2.0-flash"
