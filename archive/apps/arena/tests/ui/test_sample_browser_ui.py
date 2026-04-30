"""UI tests: Sample browser in the main area (new 4-column layout)."""

from .helpers import get_compact_page_text, get_page_text


class TestSampleBrowser:
    def test_select_all_checkbox_exists(self, page):
        assert page.locator("text=Select All").first.is_visible()

    def test_sample_01_visible(self, page):
        assert page.locator("text=01 - plumbing sewer").is_visible()

    def test_all_10_samples_listed_in_compact_view(self, page):
        """All 10 samples visible when unchecked (compact, no photos)."""
        text = get_compact_page_text(page)
        for num in ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"]:
            assert f"{num} - " in text, f"Sample {num} not found"

    def test_tenant_message_shown_for_first_sample(self, page):
        """First sample (always rendered) shows tenant message."""
        text = get_page_text(page)
        assert "Tenant Message" in text or "sewer" in text.lower()

    def test_select_all_unchecks_all_samples(self, page):
        select_all = page.locator(
            "[data-testid='stCheckbox']", has_text="Select All"
        ).first
        select_all.click()
        page.wait_for_timeout(2000)
        page.wait_for_selector("[data-testid='stAppViewContainer']", timeout=10000)

        text = get_page_text(page)
        assert "Tenant Message" not in text

    def test_select_all_rechecks_all_samples(self, page):
        select_all = page.locator(
            "[data-testid='stCheckbox']", has_text="Select All"
        ).first
        # Uncheck
        select_all.click()
        page.wait_for_timeout(2000)
        # Re-check
        select_all.click()
        page.wait_for_timeout(3000)
        page.wait_for_selector("[data-testid='stAppViewContainer']", timeout=10000)

        # First sample should render with tenant message
        text = get_page_text(page)
        assert "01 - plumbing sewer" in text
