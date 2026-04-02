"""Unit tests for arena.services.sample_loader."""

import json
from pathlib import Path

import pytest

from arena.services.sample_loader import load_all_samples, load_sample
from liz_shared.enums import Category, Urgency


class TestLoadSample:
    """Tests for loading a single sample from a directory."""

    def test_loads_valid_sample(self, tmp_samples_dir: Path):
        sample_dir = tmp_samples_dir / "sample_01_plumbing_sewer"
        sample = load_sample(sample_dir)

        assert sample.sample_id == "sample_01_plumbing_sewer"
        assert sample.ai_output.category == Category.PLUMBING
        assert sample.ai_output.urgency == Urgency.EMERGENCY
        assert sample.ai_output.confidence_score == 0.97
        assert "sewer" in sample.input.tenant_message.lower()

    def test_loads_tenant_message(self, tmp_samples_dir: Path):
        sample_dir = tmp_samples_dir / "sample_07_electrical_unsafe_adapter"
        sample = load_sample(sample_dir)

        assert "adapter" in sample.input.tenant_message.lower()
        assert sample.ai_output.category == Category.ELECTRICAL

    def test_loads_source_info(self, tmp_samples_dir: Path):
        sample_dir = tmp_samples_dir / "sample_01_plumbing_sewer"
        sample = load_sample(sample_dir)

        assert sample.source.origin == "reddit"
        assert sample.source.subreddit == "r/mildlyinfuriating"

    def test_loads_photo_upload_metadata(self, tmp_samples_dir: Path):
        sample_dir = tmp_samples_dir / "sample_01_plumbing_sewer"
        sample = load_sample(sample_dir)

        assert len(sample.input.photo_upload) == 1
        assert sample.input.photo_upload[0].file_url == "photo_01.jpg"
        assert sample.input.photo_upload[0].file_type == "image/jpeg"

    def test_missing_intake_json_raises(self, tmp_path: Path):
        empty_dir = tmp_path / "sample_99_fake"
        empty_dir.mkdir()

        with pytest.raises(FileNotFoundError):
            load_sample(empty_dir)

    def test_malformed_json_raises(self, tmp_path: Path):
        bad_dir = tmp_path / "sample_99_bad"
        bad_dir.mkdir()
        (bad_dir / "intake.json").write_text("{invalid json")

        with pytest.raises(json.JSONDecodeError):
            load_sample(bad_dir)

    def test_missing_required_fields_raises(self, tmp_path: Path):
        bad_dir = tmp_path / "sample_99_missing"
        bad_dir.mkdir()
        (bad_dir / "intake.json").write_text(json.dumps({"ai_maintenance_intake": {"input": {}}}))

        with pytest.raises((KeyError, TypeError)):
            load_sample(bad_dir)

    def test_detects_jpg_photos_on_disk(self, tmp_samples_dir: Path):
        # Add a fake jpg to see if photo_paths picks it up
        sample_dir = tmp_samples_dir / "sample_01_plumbing_sewer"
        (sample_dir / "photo_01.jpg").write_bytes(b"\xff\xd8fake")

        sample = load_sample(sample_dir)
        assert len(sample.photo_paths) == 1
        assert sample.photo_paths[0].endswith("photo_01.jpg")

    def test_no_photos_returns_empty_list(self, tmp_samples_dir: Path):
        sample_dir = tmp_samples_dir / "sample_07_electrical_unsafe_adapter"
        sample = load_sample(sample_dir)

        assert sample.photo_paths == []


class TestLoadAllSamples:
    """Tests for loading all samples from a directory."""

    def test_loads_all_samples_from_dir(self, tmp_samples_dir: Path):
        samples = load_all_samples(tmp_samples_dir)
        assert len(samples) == 2

    def test_samples_sorted_by_name(self, tmp_samples_dir: Path):
        samples = load_all_samples(tmp_samples_dir)
        ids = [s.sample_id for s in samples]
        assert ids == sorted(ids)

    def test_empty_directory_returns_empty(self, tmp_path: Path):
        samples = load_all_samples(tmp_path)
        assert samples == []

    def test_skips_dirs_without_intake_json(self, tmp_samples_dir: Path):
        (tmp_samples_dir / "not_a_sample").mkdir()
        samples = load_all_samples(tmp_samples_dir)
        assert all(s.sample_id != "not_a_sample" for s in samples)

    def test_skips_files_not_dirs(self, tmp_samples_dir: Path):
        (tmp_samples_dir / "random_file.txt").write_text("not a dir")
        samples = load_all_samples(tmp_samples_dir)
        assert len(samples) == 2

    def test_loads_real_samples(self, real_samples_dir: Path):
        """Integration: verify real sample data loads correctly."""
        if not real_samples_dir.exists():
            pytest.skip("Real samples dir not available")
        samples = load_all_samples(real_samples_dir)
        assert len(samples) == 100

        categories = {s.ai_output.category for s in samples}
        assert Category.PLUMBING in categories
        assert Category.ELECTRICAL in categories
        assert Category.STRUCTURAL in categories

        for sample in samples:
            assert sample.sample_id.startswith("sample_")
            assert sample.input.tenant_message
            assert 0.0 <= sample.ai_output.confidence_score <= 1.0
