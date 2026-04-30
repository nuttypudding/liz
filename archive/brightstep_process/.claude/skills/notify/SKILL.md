---
name: notify
description: Send a Pushover notification to the user's phone. Use when you need input, hit a blocker, or want to report results.
---

# Pushover Notification

Send a push notification to the user's phone via the Pushover API. Use this whenever you:
- Need user input and they're not watching
- Hit a blocker you can't resolve autonomously
- Complete a long-running task (overnight QA, deploy, etc.)
- Find a critical issue that needs immediate attention

## Configuration

Pushover credentials (set in environment):
- **User key**: `u1xaswoavfko3jjne9aex27vkfg8fv`
- **App token**: `ahfefqbmiywgyhah4gizmdzre7enta`

## Sending a notification

Use curl to send the notification:

```bash
curl -s -X POST https://api.pushover.net/1/messages.json \
  -d "token=ahfefqbmiywgyhah4gizmdzre7enta" \
  -d "user=u1xaswoavfko3jjne9aex27vkfg8fv" \
  -d "title=<TITLE>" \
  -d "message=<MESSAGE>" \
  -d "priority=<PRIORITY>"
```

## Priority levels

| Priority | Value | Use Case |
|----------|-------|----------|
| Lowest   | -2    | Informational (task complete, status update) |
| Low      | -1    | Non-urgent notification |
| Normal   | 0     | Standard notification (default) |
| High     | 1     | Needs attention soon (blocker, failing tests) |
| Emergency| 2     | Critical issue (production down, data loss risk) — requires `retry` and `expire` params |

## Examples

**Task completed:**
```bash
curl -s -X POST https://api.pushover.net/1/messages.json \
  -d "token=ahfefqbmiywgyhah4gizmdzre7enta" \
  -d "user=u1xaswoavfko3jjne9aex27vkfg8fv" \
  -d "title=BrightStep QA Complete" \
  -d "message=All 47 tests passed. Production is healthy." \
  -d "priority=-1"
```

**Need input:**
```bash
curl -s -X POST https://api.pushover.net/1/messages.json \
  -d "token=ahfefqbmiywgyhah4gizmdzre7enta" \
  -d "user=u1xaswoavfko3jjne9aex27vkfg8fv" \
  -d "title=BrightStep: Input Needed" \
  -d "message=GROQ_API_KEY is missing from Vercel. Please provide it." \
  -d "priority=1"
```

**Critical issue:**
```bash
curl -s -X POST https://api.pushover.net/1/messages.json \
  -d "token=ahfefqbmiywgyhah4gizmdzre7enta" \
  -d "user=u1xaswoavfko3jjne9aex27vkfg8fv" \
  -d "title=BrightStep: PRODUCTION DOWN" \
  -d "message=Backend health check failing. Railway container crashed." \
  -d "priority=2" \
  -d "retry=60" \
  -d "expire=3600"
```

## Guidelines

- Keep titles short (under 50 chars) — they show on the lock screen
- Keep messages under 500 chars — include only the key info
- Use priority 1 (high) for blockers requiring user action
- Use priority -1 (low) for "FYI" notifications (task complete, all tests pass)
- Always include actionable info: what happened, what's needed, what to do
- For long reports, summarize in the notification and say "full report in terminal"
