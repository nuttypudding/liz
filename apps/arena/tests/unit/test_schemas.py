"""Unit tests for shared Pydantic schemas and enums."""

import pytest
from pydantic import ValidationError

from liz_shared.enums import Category, Feature, Urgency
from liz_shared.schemas.intake import AIOutput, IntakeInput, IntakeSample, PhotoUpload, SourceInfo
from liz_shared.schemas.model_registry import FeatureAssignment, ModelConfig


class TestCategory:
    def test_all_categories_exist(self):
        expected = {"plumbing", "electrical", "hvac", "structural", "pest", "appliance", "general"}
        assert {c.value for c in Category} == expected

    def test_category_is_string(self):
        assert Category.PLUMBING == "plumbing"
        assert str(Category.HVAC) == "hvac"


class TestUrgency:
    def test_all_urgencies_exist(self):
        assert {u.value for u in Urgency} == {"low", "medium", "emergency"}

    def test_urgency_ordering_semantics(self):
        # Just verify all three exist -- no natural ordering in StrEnum
        assert Urgency.LOW == "low"
        assert Urgency.MEDIUM == "medium"
        assert Urgency.EMERGENCY == "emergency"


class TestFeature:
    def test_all_features_exist(self):
        assert {f.value for f in Feature} == {
            "gatekeeper", "estimator", "matchmaker", "ledger"
        }


class TestAIOutput:
    def test_valid_output(self):
        output = AIOutput(
            category=Category.PLUMBING,
            urgency=Urgency.EMERGENCY,
            recommended_action="Fix it",
            confidence_score=0.95,
        )
        assert output.category == Category.PLUMBING
        assert output.confidence_score == 0.95

    def test_confidence_score_bounds(self):
        with pytest.raises(ValidationError):
            AIOutput(
                category=Category.PLUMBING,
                urgency=Urgency.LOW,
                recommended_action="test",
                confidence_score=1.5,
            )

    def test_confidence_score_negative(self):
        with pytest.raises(ValidationError):
            AIOutput(
                category=Category.PLUMBING,
                urgency=Urgency.LOW,
                recommended_action="test",
                confidence_score=-0.1,
            )

    def test_confidence_score_zero_valid(self):
        output = AIOutput(
            category=Category.GENERAL,
            urgency=Urgency.LOW,
            recommended_action="test",
            confidence_score=0.0,
        )
        assert output.confidence_score == 0.0

    def test_confidence_score_one_valid(self):
        output = AIOutput(
            category=Category.GENERAL,
            urgency=Urgency.LOW,
            recommended_action="test",
            confidence_score=1.0,
        )
        assert output.confidence_score == 1.0

    def test_invalid_category_rejects(self):
        with pytest.raises(ValidationError):
            AIOutput(
                category="invalid_cat",
                urgency=Urgency.LOW,
                recommended_action="test",
                confidence_score=0.5,
            )

    def test_invalid_urgency_rejects(self):
        with pytest.raises(ValidationError):
            AIOutput(
                category=Category.PLUMBING,
                urgency="critical",
                recommended_action="test",
                confidence_score=0.5,
            )

    def test_serialization_roundtrip(self):
        output = AIOutput(
            category=Category.PEST,
            urgency=Urgency.MEDIUM,
            recommended_action="Call exterminator",
            confidence_score=0.88,
        )
        data = output.model_dump(mode="json")
        restored = AIOutput(**data)
        assert restored == output


class TestModelConfig:
    def test_valid_config(self):
        config = ModelConfig(
            model_id="gpt-4o",
            provider="openai",
            supports_vision=True,
            cost_input_1m=2.50,
            cost_output_1m=10.00,
            max_tokens=128000,
        )
        assert config.model_id == "gpt-4o"
        assert config.supports_vision is True

    def test_defaults(self):
        config = ModelConfig(model_id="test", provider="test")
        assert config.supports_vision is False
        assert config.cost_input_1m == 0.0
        assert config.max_tokens == 128000


class TestFeatureAssignment:
    def test_valid_assignment(self):
        a = FeatureAssignment(feature=Feature.GATEKEEPER, model_id="gemini-2.0-flash")
        assert a.feature == Feature.GATEKEEPER
        assert a.model_id == "gemini-2.0-flash"

    def test_invalid_feature_rejects(self):
        with pytest.raises(ValidationError):
            FeatureAssignment(feature="invalid", model_id="test")


class TestIntakeSample:
    def test_full_sample(self, sample_plumbing):
        assert sample_plumbing.sample_id == "sample_01_plumbing_sewer"
        assert sample_plumbing.ai_output.category == Category.PLUMBING

    def test_photo_paths_default_empty(self):
        sample = IntakeSample(
            sample_id="test",
            input=IntakeInput(tenant_message="test"),
            ai_output=AIOutput(
                category=Category.GENERAL,
                urgency=Urgency.LOW,
                recommended_action="test",
                confidence_score=0.5,
            ),
            source=SourceInfo(origin="test"),
        )
        assert sample.photo_paths == []
