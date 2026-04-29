"""UI tests: Model assignment section (hidden with placeholder)."""

from .helpers import get_compact_page_text


class TestModelAssignmentHidden:
    def test_coming_soon_in_compact_view(self, page):
        """In compact view (no photos), the footer is rendered."""
        text = get_compact_page_text(page)
        assert "coming soon" in text.lower()

    def test_hidden_info_in_dom(self, page):
        """The expander info text is in the DOM (innerHTML)."""
        html = page.evaluate("document.body.innerHTML")
        assert "Per-feature model assignment is hidden" in html

    def test_no_save_button_visible(self, page):
        assert not page.locator("button", has_text="Save Assignments").is_visible()
