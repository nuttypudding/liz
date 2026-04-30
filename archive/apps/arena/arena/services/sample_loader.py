"""Load intake samples from the intake/samples/ directory."""

import json
from pathlib import Path

from liz_shared.schemas.intake import (
    AIOutput,
    IntakeInput,
    IntakeSample,
    PhotoUpload,
    SourceInfo,
)


def get_samples_dir() -> Path:
    """Return path to intake/samples/ relative to project root."""
    return Path(__file__).resolve().parents[4] / "intake" / "samples"


def load_sample(sample_dir: Path) -> IntakeSample:
    """Load a single sample from its directory."""
    intake_path = sample_dir / "intake.json"
    with open(intake_path) as f:
        data = json.load(f)

    raw = data["ai_maintenance_intake"]

    photos = [PhotoUpload(**p) for p in raw["input"].get("photo_upload", [])]
    photo_paths = sorted(str(p) for p in sample_dir.glob("*.jpg"))

    return IntakeSample(
        sample_id=sample_dir.name,
        input=IntakeInput(
            tenant_message=raw["input"]["tenant_message"],
            photo_upload=photos,
        ),
        ai_output=AIOutput(**raw["ai_output"]),
        source=SourceInfo(**raw["source"]),
        photo_paths=photo_paths,
    )


def load_all_samples(samples_dir: Path | None = None) -> list[IntakeSample]:
    """Load all samples, sorted by directory name."""
    samples_dir = samples_dir or get_samples_dir()
    sample_dirs = sorted(
        d for d in samples_dir.iterdir() if d.is_dir() and (d / "intake.json").exists()
    )
    return [load_sample(d) for d in sample_dirs]
