"""Shared helpers for UI tests."""


def get_page_text(page) -> str:
    """Get rendered text from the visible portion of the Streamlit app."""
    return page.locator("[data-testid='stAppViewContainer']").inner_text()


def get_compact_page_text(page) -> str:
    """Uncheck Select All to get a compact view (no photos), read full text, then restore.

    Streamlit virtualizes the DOM — with all samples expanded (photos), only the first
    sample renders. Unchecking removes photos, making the page short enough to render fully.
    """
    select_all = page.locator("[data-testid='stCheckbox']", has_text="Select All").first

    # Uncheck to get compact view
    select_all.click()
    page.wait_for_timeout(2000)
    page.wait_for_selector("[data-testid='stAppViewContainer']", timeout=10000)

    text = page.locator("[data-testid='stAppViewContainer']").inner_text()

    # Re-check to restore
    select_all.click()
    page.wait_for_timeout(2000)

    return text


def run_arena_compact(page):
    """Uncheck all samples, run arena, then check a single sample to see results.

    This avoids Streamlit's DOM virtualization issue where 10 expanded samples
    with photos prevent rendering of results below the fold.
    """
    select_all = page.locator("[data-testid='stCheckbox']", has_text="Select All").first

    # Uncheck all
    select_all.click()
    page.wait_for_timeout(2000)

    # Check just sample 01
    sample_01 = page.locator(
        "[data-testid='stCheckbox']", has_text="01 - plumbing sewer"
    ).first
    sample_01.click()
    page.wait_for_timeout(1000)

    # Run
    page.locator("button", has_text="Run Arena").click()
    page.wait_for_timeout(5000)
    page.wait_for_selector("[data-testid='stAppViewContainer']", timeout=15000)
    page.wait_for_timeout(2000)
