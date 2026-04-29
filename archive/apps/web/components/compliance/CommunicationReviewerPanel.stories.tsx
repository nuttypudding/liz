import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { fn } from "@storybook/test"
import { http, HttpResponse, delay } from "msw"
import { Button } from "@/components/ui/button"
import {
  CommunicationReviewerPanel,
  type ReviewResult,
} from "./CommunicationReviewerPanel"

// ── Mock data ──────────────────────────────────────────────────────────

const safeResult: ReviewResult = {
  property_id: "00000000-0000-0000-0000-000000000001",
  jurisdiction: { state_code: "CA", city: "Los Angeles" },
  findings: [],
  overall_risk_level: "low",
  safe_to_send: true,
  disclaimer: "This is not legal advice.",
  reviewed_at: new Date().toISOString(),
}

const findingsResult: ReviewResult = {
  property_id: "00000000-0000-0000-0000-000000000001",
  jurisdiction: { state_code: "CA", city: "Los Angeles" },
  findings: [
    {
      severity: "error",
      type: "fair_housing",
      flagged_text: "families with children are not welcome",
      reason:
        "This language discriminates based on familial status, which is a protected class under the Fair Housing Act.",
      suggestion:
        "Remove the reference to families with children. Consider stating occupancy limits instead, e.g., 'Maximum occupancy is 2 persons per bedroom.'",
    },
    {
      severity: "warning",
      type: "notice_language",
      flagged_text: "you must vacate immediately",
      reason:
        "California law requires specific notice periods for eviction. Demanding immediate vacation without proper notice may be unlawful.",
      suggestion:
        "Provide the required notice period per California Civil Code. For example, '30 days written notice is required.'",
    },
    {
      severity: "warning",
      type: "disclosure",
      flagged_text: "new rental rate starting next month",
      reason:
        "Los Angeles rent stabilization ordinance requires 30 days notice for rent increases under 10%. This message may not meet the notice requirement.",
      suggestion:
        "Specify the exact rent increase amount and effective date with at least 30 days notice, citing the applicable ordinance.",
    },
  ],
  overall_risk_level: "high",
  safe_to_send: false,
  disclaimer: "This is not legal advice.",
  reviewed_at: new Date().toISOString(),
}

const warningsOnlyResult: ReviewResult = {
  ...findingsResult,
  findings: [findingsResult.findings[1]],
  overall_risk_level: "medium",
  safe_to_send: false,
}

// ── Story wrapper ──────────────────────────────────────────────────────

function PanelWrapper({
  mockResult,
  mockDelay = 0,
  mockError = false,
  messageText = "Hello tenant, this is a reminder about your rent payment.",
}: {
  mockResult?: ReviewResult
  mockDelay?: number
  mockError?: boolean
  messageText?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>Open Review Panel</Button>
      <CommunicationReviewerPanel
        messageText={messageText}
        propertyId="00000000-0000-0000-0000-000000000001"
        isOpen={open}
        onClose={() => setOpen(false)}
        onReviewComplete={fn()}
        onSendAnyway={fn()}
        onSendMessage={fn()}
        onEditMessage={fn()}
      />
    </div>
  )
}

// ── Meta ────────────────────────────────────────────────────────────────

const meta = {
  title: "Compliance/CommunicationReviewerPanel",
  component: CommunicationReviewerPanel,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CommunicationReviewerPanel>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Loading state — API takes time to respond
 */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("/api/compliance/review", async () => {
          await delay("infinite")
          return HttpResponse.json(safeResult)
        }),
      ],
    },
  },
  render: () => <PanelWrapper mockDelay={999999} />,
}

/**
 * No findings — message is safe to send
 */
export const NoFindings: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("/api/compliance/review", async () => {
          await delay(500)
          return HttpResponse.json(safeResult)
        }),
      ],
    },
  },
  render: () => <PanelWrapper mockResult={safeResult} />,
}

/**
 * Multiple findings — errors and warnings
 */
export const MultipleFindings: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("/api/compliance/review", async () => {
          await delay(500)
          return HttpResponse.json(findingsResult)
        }),
      ],
    },
  },
  render: () => (
    <PanelWrapper
      mockResult={findingsResult}
      messageText="Dear tenant, families with children are not welcome in this unit. You must vacate immediately as we have a new rental rate starting next month."
    />
  ),
}

/**
 * Warning only — medium risk
 */
export const WarningOnly: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("/api/compliance/review", async () => {
          await delay(500)
          return HttpResponse.json(warningsOnlyResult)
        }),
      ],
    },
  },
  render: () => (
    <PanelWrapper
      mockResult={warningsOnlyResult}
      messageText="Please note that you must vacate immediately."
    />
  ),
}

/**
 * API error state
 */
export const ErrorState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("/api/compliance/review", async () => {
          await delay(300)
          return HttpResponse.json(
            { error: "AI review service unavailable" },
            { status: 503 }
          )
        }),
      ],
    },
  },
  render: () => <PanelWrapper mockError />,
}

/**
 * Long message with special characters
 */
export const LongMessage: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("/api/compliance/review", async () => {
          await delay(500)
          return HttpResponse.json(safeResult)
        }),
      ],
    },
  },
  render: () => (
    <PanelWrapper
      messageText={`Dear Tenant,\n\nThis is a detailed notice regarding the upcoming maintenance schedule for your unit (#42B).\n\nThe following items will be addressed:\n1. HVAC inspection & filter replacement\n2. Smoke detector battery check\n3. Window seal inspection (per city ordinance §4.2.1)\n\nPlease ensure access to your unit between 9:00 AM – 5:00 PM on April 15, 2026.\n\nIf you have any questions or need to reschedule, please contact our office at (555) 123-4567 or email maintenance@property.com.\n\nThank you for your cooperation.\n\nBest regards,\nProperty Management`}
    />
  ),
}
