import type { Meta, StoryObj } from "@storybook/react"
import { DisclaimerBanner } from "./DisclaimerBanner"
import { COMPLIANCE_DISCLAIMERS } from "@/lib/compliance/disclaimers"

const meta = {
  title: "Compliance/DisclaimerBanner",
  component: DisclaimerBanner,
  parameters: {
    layout: "padded",
  },
  args: {
    text: COMPLIANCE_DISCLAIMERS.NOT_LEGAL_ADVICE,
    type: "info",
    dismissable: false,
    icon: true,
  },
} satisfies Meta<typeof DisclaimerBanner>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Default info disclaimer
 */
export const Info: Story = {
  args: {
    type: "info",
    text: COMPLIANCE_DISCLAIMERS.NOT_LEGAL_ADVICE,
  },
}

/**
 * Warning disclaimer
 */
export const Warning: Story = {
  args: {
    type: "warning",
    text: COMPLIANCE_DISCLAIMERS.REVIEW_BEFORE_SEND,
  },
}

/**
 * Error/critical disclaimer
 */
export const Error: Story = {
  args: {
    type: "error",
    text: COMPLIANCE_DISCLAIMERS.FAIR_HOUSING_REMINDER,
  },
}

/**
 * With dismiss button
 */
export const Dismissable: Story = {
  args: {
    type: "info",
    text: COMPLIANCE_DISCLAIMERS.JURISDICTION_SPECIFIC,
    dismissable: true,
  },
}

/**
 * Without icon
 */
export const NoIcon: Story = {
  args: {
    type: "warning",
    text: COMPLIANCE_DISCLAIMERS.VERIFY_STATUTE,
    icon: false,
  },
}

/**
 * Long text wrapping
 */
export const LongText: Story = {
  args: {
    type: "info",
    text: "This is a long disclaimer that spans multiple lines to demonstrate how the component handles longer text content. The banner will expand to accommodate the full text while maintaining proper alignment with the icon and optional dismiss button.",
  },
}

/**
 * All variants together
 */
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <DisclaimerBanner
        type="info"
        text={COMPLIANCE_DISCLAIMERS.NOT_LEGAL_ADVICE}
      />
      <DisclaimerBanner
        type="warning"
        text={COMPLIANCE_DISCLAIMERS.REVIEW_BEFORE_SEND}
      />
      <DisclaimerBanner
        type="error"
        text={COMPLIANCE_DISCLAIMERS.FAIR_HOUSING_REMINDER}
      />
      <DisclaimerBanner
        type="info"
        text={COMPLIANCE_DISCLAIMERS.JURISDICTION_SPECIFIC}
        dismissable
      />
    </div>
  ),
}
