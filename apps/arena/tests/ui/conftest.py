"""UI test fixtures — manages Streamlit server lifecycle for Playwright."""

import subprocess
import sys
import time
from pathlib import Path

import pytest
import requests


ARENA_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = ARENA_DIR.parents[1]
STREAMLIT_PORT = 8599  # Use non-default port to avoid conflicts
STREAMLIT_URL = f"http://localhost:{STREAMLIT_PORT}"


@pytest.fixture(scope="session")
def arena_server():
    """Start Streamlit server for the test session, yield URL, then shut down."""
    env = {
        "PYTHONPATH": str(PROJECT_ROOT / "packages" / "shared"),
        "PATH": subprocess.os.environ.get("PATH", ""),
        "HOME": subprocess.os.environ.get("HOME", ""),
    }

    proc = subprocess.Popen(
        [
            sys.executable, "-m", "streamlit", "run",
            str(ARENA_DIR / "arena" / "app.py"),
            "--server.headless", "true",
            "--server.port", str(STREAMLIT_PORT),
            "--browser.gatherUsageStats", "false",
        ],
        cwd=str(ARENA_DIR),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    # Wait for server to be ready
    for _ in range(30):
        try:
            r = requests.get(f"{STREAMLIT_URL}/_stcore/health", timeout=1)
            if r.text == "ok":
                break
        except requests.ConnectionError:
            pass
        time.sleep(1)
    else:
        proc.kill()
        stdout = proc.stdout.read().decode() if proc.stdout else ""
        pytest.fail(f"Streamlit server did not start within 30s.\nOutput: {stdout}")

    yield STREAMLIT_URL

    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()


@pytest.fixture
def page(arena_server, browser):
    """Create a new Playwright page with a very tall viewport to avoid virtualization."""
    # Use a very tall viewport so Streamlit renders ALL content (no virtualization)
    context = browser.new_context(viewport={"width": 1440, "height": 8000})
    page = context.new_page()
    page.goto(arena_server, wait_until="networkidle")
    # Wait for Streamlit to finish rendering
    page.wait_for_selector("[data-testid='stAppViewContainer']", timeout=15000)
    # Wait a bit extra for all samples to render
    page.wait_for_timeout(2000)
    yield page
    context.close()


@pytest.fixture(scope="session")
def browser(playwright):
    """Launch a Chromium browser for the test session."""
    browser = playwright.chromium.launch(headless=True)
    yield browser
    browser.close()


@pytest.fixture(scope="session")
def playwright():
    """Start Playwright."""
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        yield p
