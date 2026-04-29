"""LLM Runner — sends maintenance intake to vision models and parses structured responses."""

import base64
import json
import os
from pathlib import Path

from dotenv import load_dotenv

from liz_shared.schemas.intake import AIOutput, IntakeSample

# Load .env from project root
_project_root = Path(__file__).resolve().parents[4]
load_dotenv(_project_root / ".env")

SYSTEM_PROMPT = """You are an AI property maintenance triage system. Analyze the tenant's maintenance request (message and any photos) and classify it.

Respond with ONLY a JSON object — no markdown, no explanation:
{
  "category": "<one of: plumbing, electrical, hvac, structural, pest, appliance, general>",
  "urgency": "<one of: low, medium, emergency>",
  "recommended_action": "<brief recommended next step for the landlord>",
  "confidence_score": <float 0.0-1.0>
}"""


def _encode_image(path: str) -> str:
    """Base64-encode an image file."""
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def _parse_ai_output(raw_text: str) -> AIOutput:
    """Extract JSON from LLM response text and parse into AIOutput."""
    import re

    text = raw_text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
    # Remove trailing commas before } or ] (common LLM mistake)
    text = re.sub(r",\s*([}\]])", r"\1", text)
    # Remove single-line comments (// ...)
    text = re.sub(r"//[^\n]*", "", text)
    data = json.loads(text)
    return AIOutput(**data)


def run_model(model_id: str, provider: str, sample: IntakeSample) -> AIOutput:
    """Run a single model against a single sample. Returns AIOutput."""
    user_text = f"Tenant message: {sample.input.tenant_message}"
    photos = [p for p in sample.photo_paths if Path(p).exists()]

    if provider == "openai":
        return _run_openai(model_id, user_text, photos)
    elif provider == "anthropic":
        return _run_anthropic(model_id, user_text, photos)
    elif provider == "google":
        return _run_google(model_id, user_text, photos)
    elif provider == "groq":
        return _run_groq(model_id, user_text, photos)
    else:
        raise ValueError(f"Unknown provider: {provider}")


def _run_openai(model_id: str, user_text: str, photos: list[str]) -> AIOutput:
    from openai import OpenAI

    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    content: list[dict] = [{"type": "text", "text": user_text}]
    for photo in photos:
        b64 = _encode_image(photo)
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "low"},
        })

    resp = client.chat.completions.create(
        model=model_id,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ],
        max_tokens=300,
        temperature=0.0,
    )
    return _parse_ai_output(resp.choices[0].message.content)


def _run_anthropic(model_id: str, user_text: str, photos: list[str]) -> AIOutput:
    import anthropic

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    content: list[dict] = []
    for photo in photos:
        b64 = _encode_image(photo)
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": b64},
        })
    content.append({"type": "text", "text": user_text})

    resp = client.messages.create(
        model=model_id,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": content}],
        max_tokens=300,
        temperature=0.0,
    )
    return _parse_ai_output(resp.content[0].text)


def _run_google(model_id: str, user_text: str, photos: list[str]) -> AIOutput:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])

    parts: list = []
    for photo in photos:
        b64 = _encode_image(photo)
        parts.append(types.Part.from_bytes(data=base64.b64decode(b64), mime_type="image/jpeg"))
    parts.append(types.Part.from_text(text=user_text))

    resp = client.models.generate_content(
        model=model_id,
        contents=[types.Content(role="user", parts=parts)],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            max_output_tokens=1000,
            temperature=0.0,
            response_mime_type="application/json",
        ),
    )
    return _parse_ai_output(resp.text)


def _run_groq(model_id: str, user_text: str, photos: list[str]) -> AIOutput:
    from groq import Groq

    client = Groq(api_key=os.environ["GROQ_API_KEY"])

    content: list[dict] = [{"type": "text", "text": user_text}]
    for photo in photos:
        b64 = _encode_image(photo)
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "low"},
        })

    resp = client.chat.completions.create(
        model=model_id,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ],
        max_tokens=300,
        temperature=0.0,
    )
    return _parse_ai_output(resp.choices[0].message.content)
