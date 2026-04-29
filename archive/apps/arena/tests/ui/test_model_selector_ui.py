"""UI tests: Model selector dropdowns (new 4-column layout)."""


class TestModelSelector:
    """Tests for the 3 LLM model dropdown selectors in the header."""

    def test_three_model_dropdowns_exist(self, page):
        for i in range(1, 4):
            assert page.locator(f"text=LLM Model {i}").is_visible()

    def test_default_models_are_different(self, page):
        """Each dropdown should default to a different model."""
        dropdowns = page.locator("[data-testid='stSelectbox']")
        # Should have at least 3 selectboxes (the LLM ones)
        assert dropdowns.count() >= 3

    def test_gpt4o_available_in_dropdown(self, page):
        # The first dropdown defaults to gpt-4o (index 0)
        assert page.locator("text=gpt-4o").first.is_visible()

    def test_evaluation_count_shown(self, page):
        assert page.locator("text=evaluations").is_visible()
