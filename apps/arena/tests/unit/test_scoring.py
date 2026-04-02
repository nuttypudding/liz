"""Unit tests for scoring logic (extracted from results_grid aggregate scoring)."""

from liz_shared.enums import Category, Urgency
from liz_shared.schemas.intake import AIOutput


def compute_accuracy(
    results: dict[str, dict[str, AIOutput]],
    ground_truth: dict[str, AIOutput],
    model_id: str,
) -> dict[str, float]:
    """Extract scoring logic from results_grid for testability."""
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

    if total == 0:
        return {"category_accuracy": 0.0, "urgency_accuracy": 0.0, "total": 0}

    return {
        "category_accuracy": cat_correct / total,
        "urgency_accuracy": urg_correct / total,
        "total": total,
    }


class TestAccuracyScoring:
    """Tests for the accuracy scoring algorithm."""

    def _make_output(self, category, urgency, confidence=0.9):
        return AIOutput(
            category=category,
            urgency=urgency,
            recommended_action="test action",
            confidence_score=confidence,
        )

    def test_perfect_score(self):
        truth = {
            "s1": self._make_output(Category.PLUMBING, Urgency.EMERGENCY),
            "s2": self._make_output(Category.ELECTRICAL, Urgency.LOW),
        }
        results = {
            "s1": {"model_a": self._make_output(Category.PLUMBING, Urgency.EMERGENCY)},
            "s2": {"model_a": self._make_output(Category.ELECTRICAL, Urgency.LOW)},
        }
        scores = compute_accuracy(results, truth, "model_a")
        assert scores["category_accuracy"] == 1.0
        assert scores["urgency_accuracy"] == 1.0
        assert scores["total"] == 2

    def test_zero_score(self):
        truth = {
            "s1": self._make_output(Category.PLUMBING, Urgency.EMERGENCY),
        }
        results = {
            "s1": {"model_a": self._make_output(Category.HVAC, Urgency.LOW)},
        }
        scores = compute_accuracy(results, truth, "model_a")
        assert scores["category_accuracy"] == 0.0
        assert scores["urgency_accuracy"] == 0.0

    def test_partial_category_match(self):
        truth = {
            "s1": self._make_output(Category.PLUMBING, Urgency.EMERGENCY),
            "s2": self._make_output(Category.ELECTRICAL, Urgency.LOW),
        }
        results = {
            "s1": {"model_a": self._make_output(Category.PLUMBING, Urgency.EMERGENCY)},
            "s2": {"model_a": self._make_output(Category.HVAC, Urgency.LOW)},
        }
        scores = compute_accuracy(results, truth, "model_a")
        assert scores["category_accuracy"] == 0.5
        assert scores["urgency_accuracy"] == 1.0

    def test_partial_urgency_match(self):
        truth = {
            "s1": self._make_output(Category.PLUMBING, Urgency.EMERGENCY),
            "s2": self._make_output(Category.ELECTRICAL, Urgency.LOW),
        }
        results = {
            "s1": {"model_a": self._make_output(Category.PLUMBING, Urgency.MEDIUM)},
            "s2": {"model_a": self._make_output(Category.ELECTRICAL, Urgency.LOW)},
        }
        scores = compute_accuracy(results, truth, "model_a")
        assert scores["category_accuracy"] == 1.0
        assert scores["urgency_accuracy"] == 0.5

    def test_missing_model_in_results(self):
        truth = {"s1": self._make_output(Category.PLUMBING, Urgency.EMERGENCY)}
        results = {"s1": {}}
        scores = compute_accuracy(results, truth, "model_a")
        assert scores["total"] == 0

    def test_missing_ground_truth(self):
        results = {
            "s1": {"model_a": self._make_output(Category.PLUMBING, Urgency.EMERGENCY)},
        }
        scores = compute_accuracy(results, {}, "model_a")
        assert scores["total"] == 0

    def test_empty_results(self):
        scores = compute_accuracy({}, {}, "model_a")
        assert scores["total"] == 0
        assert scores["category_accuracy"] == 0.0

    def test_multiple_models_independent(self):
        truth = {"s1": self._make_output(Category.PLUMBING, Urgency.EMERGENCY)}
        results = {
            "s1": {
                "model_a": self._make_output(Category.PLUMBING, Urgency.EMERGENCY),
                "model_b": self._make_output(Category.HVAC, Urgency.LOW),
            },
        }
        scores_a = compute_accuracy(results, truth, "model_a")
        scores_b = compute_accuracy(results, truth, "model_b")

        assert scores_a["category_accuracy"] == 1.0
        assert scores_b["category_accuracy"] == 0.0
