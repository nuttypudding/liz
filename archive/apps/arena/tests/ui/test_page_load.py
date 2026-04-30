"""UI tests: Page load and basic structure."""

from .helpers import get_compact_page_text


class TestPageLoad:
    def test_page_title(self, page):
        assert "Liz LLM Arena" in page.title()

    def test_main_heading_visible(self, page):
        assert "Liz LLM Arena" in page.locator("h1").first.text_content()

    def test_subtitle_visible(self, page):
        page.wait_for_selector("text=Compare vision-capable LLMs")

    def test_no_sidebar_expanded(self, page):
        sidebar = page.locator("[data-testid='stSidebar']")
        assert not sidebar.is_visible() or sidebar.bounding_box()["width"] < 50

    def test_samples_header_in_main(self, page):
        assert page.locator("text=Samples").first.is_visible()

    def test_run_arena_button_exists(self, page):
        assert page.locator("button", has_text="Run Arena").is_visible()

    def test_three_llm_dropdowns_exist(self, page):
        for i in range(1, 4):
            assert page.locator(f"text=LLM Model {i}").is_visible()

    def test_hidden_assignment_placeholder(self, page):
        """Uncheck all to get compact view, then verify footer is rendered."""
        text = get_compact_page_text(page)
        assert "coming soon" in text.lower()

    def test_no_error_messages(self, page):
        assert page.locator("[data-testid='stException']").count() == 0


class TestResponsiveLayout:
    def test_mobile_viewport(self, arena_server, browser):
        ctx = browser.new_context(viewport={"width": 375, "height": 812})
        p = ctx.new_page()
        p.goto(arena_server, wait_until="networkidle")
        p.wait_for_selector("[data-testid='stAppViewContainer']", timeout=15000)
        assert p.locator("text=Liz LLM Arena").first.is_visible()
        ctx.close()

    def test_wide_viewport(self, arena_server, browser):
        ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
        p = ctx.new_page()
        p.goto(arena_server, wait_until="networkidle")
        p.wait_for_selector("[data-testid='stAppViewContainer']", timeout=15000)
        assert p.locator("text=Liz LLM Arena").first.is_visible()
        ctx.close()
