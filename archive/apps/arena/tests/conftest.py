"""Shared test fixtures for arena tests."""

import json
import os
import sys
import tempfile
from datetime import datetime
from pathlib import Path

import pytest
import yaml

# Ensure shared package is importable
_shared_path = str(Path(__file__).resolve().parents[3] / "packages" / "shared")
if _shared_path not in sys.path:
    sys.path.insert(0, _shared_path)

# Ensure arena package is importable
_arena_path = str(Path(__file__).resolve().parents[1])
if _arena_path not in sys.path:
    sys.path.insert(0, _arena_path)

from liz_shared.enums import Category, Feature, Urgency
from liz_shared.schemas.intake import (
    AIOutput,
    IntakeInput,
    IntakeSample,
    PhotoUpload,
    SourceInfo,
)
from liz_shared.schemas.model_registry import FeatureAssignment, ModelConfig


@pytest.fixture
def sample_plumbing() -> IntakeSample:
    """A plumbing emergency sample."""
    return IntakeSample(
        sample_id="sample_01_plumbing_sewer",
        input=IntakeInput(
            tenant_message="Main sewer line has rusted out and is clogged.",
            photo_upload=[
                PhotoUpload(
                    file_url="photo_01.jpg",
                    file_type="image/jpeg",
                    uploaded_at=datetime(2023, 4, 27, 14, 0, 0),
                ),
            ],
        ),
        ai_output=AIOutput(
            category=Category.PLUMBING,
            urgency=Urgency.EMERGENCY,
            recommended_action="Dispatch emergency plumber immediately.",
            confidence_score=0.97,
        ),
        source=SourceInfo(origin="reddit", subreddit="r/mildlyinfuriating"),
        photo_paths=[],
    )


@pytest.fixture
def sample_electrical() -> IntakeSample:
    """An electrical emergency sample."""
    return IntakeSample(
        sample_id="sample_07_electrical_unsafe_adapter",
        input=IntakeInput(
            tenant_message="Fridge and stove on 2-to-3 prong adapter with extension cord.",
            photo_upload=[],
        ),
        ai_output=AIOutput(
            category=Category.ELECTRICAL,
            urgency=Urgency.EMERGENCY,
            recommended_action="Send licensed electrician to install proper outlets.",
            confidence_score=0.98,
        ),
        source=SourceInfo(origin="reddit", subreddit="r/electrical"),
        photo_paths=[],
    )


@pytest.fixture
def sample_general_medium() -> IntakeSample:
    """A general medium-urgency sample."""
    return IntakeSample(
        sample_id="sample_02_general_duct_tape",
        input=IntakeInput(
            tenant_message="Laundry room has multiple duct-tape repairs.",
            photo_upload=[],
        ),
        ai_output=AIOutput(
            category=Category.GENERAL,
            urgency=Urgency.MEDIUM,
            recommended_action="Schedule inspection of laundry room.",
            confidence_score=0.91,
        ),
        source=SourceInfo(origin="reddit"),
        photo_paths=[],
    )


@pytest.fixture
def all_samples(sample_plumbing, sample_electrical, sample_general_medium) -> list[IntakeSample]:
    """Three diverse samples for testing."""
    return [sample_plumbing, sample_electrical, sample_general_medium]


@pytest.fixture
def model_catalog() -> dict[str, ModelConfig]:
    """Small model catalog for testing."""
    return {
        "gpt-4o": ModelConfig(
            model_id="gpt-4o",
            provider="openai",
            supports_vision=True,
            cost_input_1m=2.50,
            cost_output_1m=10.00,
            max_tokens=128000,
        ),
        "gemini-2.0-flash": ModelConfig(
            model_id="gemini-2.0-flash",
            provider="google",
            supports_vision=True,
            cost_input_1m=0.10,
            cost_output_1m=0.40,
            max_tokens=1048576,
        ),
        "claude-sonnet-4-20250514": ModelConfig(
            model_id="claude-sonnet-4-20250514",
            provider="anthropic",
            supports_vision=True,
            cost_input_1m=3.00,
            cost_output_1m=15.00,
            max_tokens=200000,
        ),
        "llama-4-scout-17b-16e-instruct": ModelConfig(
            model_id="llama-4-scout-17b-16e-instruct",
            provider="groq",
            supports_vision=True,
            cost_input_1m=0.11,
            cost_output_1m=0.34,
            max_tokens=131072,
        ),
    }


@pytest.fixture
def feature_assignments() -> list[FeatureAssignment]:
    """Default feature assignments for testing."""
    return [
        FeatureAssignment(feature=Feature.GATEKEEPER, model_id="gemini-2.0-flash"),
        FeatureAssignment(feature=Feature.ESTIMATOR, model_id="gpt-4o"),
        FeatureAssignment(feature=Feature.MATCHMAKER, model_id="claude-sonnet-4-20250514"),
        FeatureAssignment(feature=Feature.LEDGER, model_id="llama-4-scout-17b-16e-instruct"),
    ]


@pytest.fixture
def tmp_samples_dir(sample_plumbing, sample_electrical) -> Path:
    """Create a temporary samples directory with real intake.json files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        for sample in [sample_plumbing, sample_electrical]:
            sample_dir = Path(tmpdir) / sample.sample_id
            sample_dir.mkdir()
            intake_data = {
                "ai_maintenance_intake": {
                    "input": {
                        "tenant_message": sample.input.tenant_message,
                        "photo_upload": [
                            p.model_dump(mode="json") for p in sample.input.photo_upload
                        ],
                    },
                    "ai_output": sample.ai_output.model_dump(mode="json"),
                    "source": sample.source.model_dump(mode="json"),
                }
            }
            with open(sample_dir / "intake.json", "w") as f:
                json.dump(intake_data, f)
        yield Path(tmpdir)


@pytest.fixture
def tmp_config_file(model_catalog, feature_assignments) -> Path:
    """Create a temporary models.yaml config file."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        data = {
            "models": {
                model_id: {
                    "provider": m.provider,
                    "supports_vision": m.supports_vision,
                    "cost_input_1m": m.cost_input_1m,
                    "cost_output_1m": m.cost_output_1m,
                    "max_tokens": m.max_tokens,
                }
                for model_id, m in model_catalog.items()
            },
            "feature_assignments": {
                str(a.feature): a.model_id for a in feature_assignments
            },
        }
        yaml.dump(data, f, default_flow_style=False)
        tmp_path = Path(f.name)
    yield tmp_path
    tmp_path.unlink(missing_ok=True)


@pytest.fixture
def real_samples_dir() -> Path:
    """Path to the real intake/samples/ directory."""
    return Path(__file__).resolve().parents[3] / "intake" / "samples"
