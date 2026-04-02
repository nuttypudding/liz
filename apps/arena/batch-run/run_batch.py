"""Batch runner — evaluates samples 01-10 against all models, saves JSON results."""

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Resolve paths
_app_dir = str(Path(__file__).resolve().parents[1])  # apps/arena/
_shared_dir = str(Path(__file__).resolve().parents[3] / "packages" / "shared")
for _p in [_app_dir, _shared_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from arena.services.config_loader import load_model_catalog
from arena.services.llm_runner import run_model
from arena.services.sample_loader import load_all_samples


def main():
    catalog = load_model_catalog()
    all_samples = load_all_samples()
    samples = [
        s for s in all_samples
        if s.sample_id.split("_")[1].isdigit() and int(s.sample_id.split("_")[1]) <= 10
    ]

    model_ids = list(catalog.keys())
    total = len(samples) * len(model_ids)
    print(f"Running {len(samples)} samples x {len(model_ids)} models = {total} evaluations\n")

    results = {
        "metadata": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sample_count": len(samples),
            "model_count": len(model_ids),
            "total_evaluations": total,
            "models": {
                mid: {
                    "provider": cfg.provider,
                    "vision_tier": cfg.vision_tier,
                    "cost_input_1m": cfg.cost_input_1m,
                    "cost_output_1m": cfg.cost_output_1m,
                }
                for mid, cfg in catalog.items()
            },
        },
        "samples": {},
    }

    done = 0
    errors = []
    start_time = time.time()

    for sample in samples:
        ground_truth = {
            "category": sample.ai_output.category.value,
            "urgency": sample.ai_output.urgency.value,
            "recommended_action": sample.ai_output.recommended_action,
            "confidence_score": sample.ai_output.confidence_score,
        }

        sample_result = {
            "ground_truth": ground_truth,
            "tenant_message": sample.input.tenant_message[:300],
            "photo_count": len(sample.photo_paths),
            "models": {},
        }

        for model_id in model_ids:
            done += 1
            cfg = catalog[model_id]
            print(f"  [{done}/{total}] {model_id} <- {sample.sample_id} ... ", end="", flush=True)

            t0 = time.time()
            try:
                output = run_model(model_id, cfg.provider, sample)
                elapsed = round(time.time() - t0, 2)
                sample_result["models"][model_id] = {
                    "category": output.category.value,
                    "urgency": output.urgency.value,
                    "recommended_action": output.recommended_action,
                    "confidence_score": output.confidence_score,
                    "category_match": output.category == sample.ai_output.category,
                    "urgency_match": output.urgency == sample.ai_output.urgency,
                    "latency_s": elapsed,
                    "error": None,
                }
                cat_ok = "✅" if output.category == sample.ai_output.category else "❌"
                urg_ok = "✅" if output.urgency == sample.ai_output.urgency else "❌"
                print(f"cat={output.category.value} {cat_ok}  urg={output.urgency.value} {urg_ok}  ({elapsed}s)")
            except Exception as e:
                elapsed = round(time.time() - t0, 2)
                err_msg = str(e)[:200]
                errors.append(f"{model_id} / {sample.sample_id}: {err_msg}")
                sample_result["models"][model_id] = {
                    "category": None,
                    "urgency": None,
                    "recommended_action": None,
                    "confidence_score": None,
                    "category_match": False,
                    "urgency_match": False,
                    "latency_s": elapsed,
                    "error": err_msg,
                }
                print(f"ERROR ({elapsed}s): {err_msg[:80]}")

        results["samples"][sample.sample_id] = sample_result

    total_time = round(time.time() - start_time, 1)
    results["metadata"]["total_time_s"] = total_time
    results["metadata"]["errors"] = errors

    # Save
    out_dir = Path(__file__).resolve().parent
    out_file = out_dir / "results.json"
    with open(out_file, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n{'='*60}")
    print(f"Done! {total} evaluations in {total_time}s")
    print(f"Errors: {len(errors)}")
    print(f"Results saved to: {out_file}")


if __name__ == "__main__":
    main()
