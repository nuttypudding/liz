from pydantic import BaseModel

from liz_shared.enums import Feature


class ModelConfig(BaseModel):
    model_id: str
    provider: str  # openai, anthropic, google, groq
    supports_vision: bool = False
    vision_tier: int = 3  # 1=best, 2=good, 3=basic
    vision_note: str = ""
    cost_input_1m: float = 0.0  # cost per 1M input tokens
    cost_output_1m: float = 0.0  # cost per 1M output tokens
    max_tokens: int = 128000


class FeatureAssignment(BaseModel):
    feature: Feature
    model_id: str
