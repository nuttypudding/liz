"""Unit tests for the mock results generator in app.py."""

import sys
from pathlib import Path

import pytest

# Import the mock results function from app module
# We need to import it carefully since app.py has Streamlit side effects
from liz_shared.enums import Category, Urgency
from liz_shared.schemas.intake import AIOutput, IntakeInput, IntakeSample, SourceInfo


def _generate_mock_results(samples, model_ids):
    """Replicated from app.py for testability without Streamlit import."""
    results = {}
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


class TestGenerateMockResults:
    """Tests for mock result generation."""

    def test_returns_results_for_all_samples(self, all_samples):
        model_ids = ["gpt-4o", "gemini-2.0-flash"]
        results = _generate_mock_results(all_samples, model_ids)

        assert len(results) == len(all_samples)
        for sample in all_samples:
            assert sample.sample_id in results

    def test_returns_results_for_all_models(self, all_samples):
        model_ids = ["gpt-4o", "gemini-2.0-flash", "claude-sonnet-4-20250514"]
        results = _generate_mock_results(all_samples, model_ids)

        for sample_id, model_outputs in results.items():
            assert set(model_outputs.keys()) == set(model_ids)

    def test_mock_preserves_category(self, sample_plumbing):
        results = _generate_mock_results([sample_plumbing], ["gpt-4o"])
        output = results[sample_plumbing.sample_id]["gpt-4o"]
        assert output.category == Category.PLUMBING

    def test_mock_preserves_urgency(self, sample_plumbing):
        results = _generate_mock_results([sample_plumbing], ["gpt-4o"])
        output = results[sample_plumbing.sample_id]["gpt-4o"]
        assert output.urgency == Urgency.EMERGENCY

    def test_mock_includes_model_id_in_action(self, sample_plumbing):
        results = _generate_mock_results([sample_plumbing], ["gpt-4o"])
        output = results[sample_plumbing.sample_id]["gpt-4o"]
        assert "[MOCK - gpt-4o]" in output.recommended_action

    def test_mock_adjusts_confidence(self, sample_plumbing):
        results = _generate_mock_results([sample_plumbing], ["gpt-4o"])
        output = results[sample_plumbing.sample_id]["gpt-4o"]
        assert output.confidence_score == round(
            max(0.5, sample_plumbing.ai_output.confidence_score - 0.05), 2
        )

    def test_confidence_floor_at_half(self):
        """Confidence should not go below 0.5."""
        sample = IntakeSample(
            sample_id="test_low_conf",
            input=IntakeInput(tenant_message="test"),
            ai_output=AIOutput(
                category=Category.GENERAL,
                urgency=Urgency.LOW,
                recommended_action="test",
                confidence_score=0.50,
            ),
            source=SourceInfo(origin="test"),
        )
        results = _generate_mock_results([sample], ["gpt-4o"])
        assert results["test_low_conf"]["gpt-4o"].confidence_score >= 0.5

    def test_empty_samples(self):
        results = _generate_mock_results([], ["gpt-4o"])
        assert results == {}

    def test_empty_models(self, sample_plumbing):
        results = _generate_mock_results([sample_plumbing], [])
        assert results[sample_plumbing.sample_id] == {}
