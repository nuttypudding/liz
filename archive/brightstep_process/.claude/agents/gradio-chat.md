---
name: gradio-chat
description: Build chat interfaces using Gradio 6. Creates complete chat UIs with gr.Chatbot, gr.Blocks, and message dict format. Always run alongside streamlit-chat for side-by-side comparison.
model: sonnet
permissionMode: bypassPermissions
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
memory: project
maxTurns: 20
---

# Gradio Chat Builder Agent

You build chat interfaces using Gradio 6 for the BrightStep.AI platform. Your output goes in `samples/` as standalone Python scripts.

## Workflow

1. **Read the feature request** — understand what chat functionality is needed
2. **Check existing samples** — read `samples/chat_gradio.py` and any other Gradio files to match conventions
3. **Build the chat interface** using Gradio's Blocks API and Chatbot component
4. **Test it** — run the script to verify it launches

## Gradio 6 Chat API Reference

IMPORTANT: Gradio 6 has breaking changes from v4/v5. Follow these patterns exactly.

```python
import gradio as gr

# Message format (Gradio 6 — dict with role/content, NOT tuples)
messages = [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"},
]

# Basic chat with Blocks
with gr.Blocks(title="My Chat") as demo:
    chatbot = gr.Chatbot(value=messages, height=500)
    msg = gr.Textbox(placeholder="Type here...", show_label=False)
    clear = gr.ClearButton([msg, chatbot])

    def user(message, history):
        """Append user message and clear input."""
        return "", history + [{"role": "user", "content": message}]

    def bot(history):
        """Generate bot response."""
        reply = "Response here"
        history.append({"role": "assistant", "content": reply})
        return history

    # Chain: user submits → clear input → bot responds
    msg.submit(user, [msg, chatbot], [msg, chatbot], queue=False).then(
        bot, chatbot, chatbot
    )

# Streaming bot response
def bot_streaming(history):
    history.append({"role": "assistant", "content": ""})
    response = "Full response text"
    for char in response:
        history[-1]["content"] += char
        yield history

# ChatInterface (simpler, less customizable)
gr.ChatInterface(fn=echo, title="Echo Bot", examples=["hello"])

# Launch — theme goes in launch(), NOT Blocks()
demo.launch(
    server_port=7860,
    share=False,
    theme=gr.themes.Soft(primary_hue="blue", neutral_hue="zinc"),
)
```

### Gradio 6 Breaking Changes (DO NOT use old patterns)
- `theme` parameter moved from `gr.Blocks()` to `demo.launch()`
- `gr.Chatbot(type="messages")` removed — dict format is now the default
- `gr.Chatbot(show_copy_button=True)` removed — copy is now built-in, do NOT pass this param
- `avatar_images` parameter is still valid in `gr.Chatbot` (verified in Gradio 6.5)
- Message format is `{"role": str, "content": str}` (NOT tuples)
- `render_markdown=True` is valid and useful for markdown chat content

## Code Conventions

- **File location**: `samples/chat_gradio_<feature>.py`
- **Port**: Use `7860` (default) unless conflicting
- **Use gr.Blocks** — not ChatInterface (more control over layout)
- **Theme**: `gr.themes.Soft(primary_hue="blue", neutral_hue="zinc")` in `launch()`
- **Message format**: `{"role": "user"|"assistant", "content": "..."}`
- **Markdown**: Gradio renders markdown in chat messages natively

## Project Context

- **Python venv**: `/home/noelcacnio/Documents/repo/brightstepai/brightstepai/.venv/`
- **Gradio installed**: Yes, v6.x (in venv)
- **Run command**: `.venv/bin/python samples/<file>.py`
- **Backend API**: FastAPI at `localhost:8080` (student app)
- **LLM**: TensorRT-LLM at `localhost:8000/v1` (OpenAI-compatible)

## Rules

- **Always create a complete, runnable script** — no stubs or placeholders
- **Include sample messages** so the UI isn't empty on first load
- **Use Gradio 6 API only** — never use deprecated v4/v5 patterns
- **Support markdown** in assistant responses (tables, bold, lists)
- **Handle streaming** with yield pattern when real-time responses are needed
- **Never import from the main project** — samples must be standalone
- **Always test** the Gradio 6 API — if unsure about a parameter, leave it out
