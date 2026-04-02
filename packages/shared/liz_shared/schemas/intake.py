from datetime import datetime

from pydantic import BaseModel, Field

from liz_shared.enums import Category, Urgency


class PhotoUpload(BaseModel):
    file_url: str
    file_type: str = "image/jpeg"
    uploaded_at: datetime


class AIOutput(BaseModel):
    category: Category
    urgency: Urgency
    recommended_action: str
    confidence_score: float = Field(ge=0.0, le=1.0)


class SourceInfo(BaseModel):
    origin: str
    subreddit: str | None = None
    post_url: str | None = None
    post_title: str | None = None


class IntakeInput(BaseModel):
    tenant_message: str
    photo_upload: list[PhotoUpload] = []


class IntakeSample(BaseModel):
    """Represents one intake/samples/ directory entry."""

    sample_id: str  # e.g. "sample_01_plumbing_sewer"
    input: IntakeInput
    ai_output: AIOutput
    source: SourceInfo
    photo_paths: list[str] = []  # absolute paths to photo files on disk
