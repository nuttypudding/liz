import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface AvailabilityPromptProps {
  tenantName: string;
  workOrderTitle: string;
  propertyAddress: string;
  availabilityDeadline: string;
  tenantResponseLink: string;
  suggestedWindows?: string[];
}

export function AvailabilityPrompt({
  tenantName = "Tenant",
  workOrderTitle = "Leaking faucet repair",
  propertyAddress = "123 Main St, Apt 4B",
  availabilityDeadline = "Friday, April 18, 2026",
  tenantResponseLink = "https://web-lovat-sigma-36.vercel.app/availability",
  suggestedWindows = [],
}: AvailabilityPromptProps) {
  return (
    <Html>
      <Head />
      <Preview>Please confirm your availability — {workOrderTitle}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logoText}>Liz</Heading>
            <Text style={tagline}>AI Property Manager</Text>
          </Section>

          {/* Hero */}
          <Section style={heroSection}>
            <Heading as="h1" style={heroHeading}>
              We need your availability
            </Heading>
            <Text style={heroSubtext}>Hi {tenantName},</Text>
            <Text style={heroSubtext}>
              A repair technician needs to visit your unit for the following
              work. Please let us know when you&apos;re available so we can
              schedule the appointment.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Request Details */}
          <Section style={cardSection}>
            <Heading as="h2" style={sectionHeading}>
              Repair Details
            </Heading>
            <Text style={labelText}>What</Text>
            <Text style={valueText}>{workOrderTitle}</Text>
            <Text style={labelText}>Where</Text>
            <Text style={valueText}>{propertyAddress}</Text>
            <Text style={labelText}>Response needed by</Text>
            <Text style={deadlineText}>{availabilityDeadline}</Text>
          </Section>

          {/* Suggested Windows (optional) */}
          {suggestedWindows.length > 0 && (
            <>
              <Hr style={divider} />
              <Section style={cardSection}>
                <Heading as="h2" style={sectionHeading}>
                  Suggested Time Windows
                </Heading>
                {suggestedWindows.map((window, i) => (
                  <Text key={i} style={windowItem}>
                    • {window}
                  </Text>
                ))}
                <Text style={windowNote}>
                  You can choose one of these or submit your own availability.
                </Text>
              </Section>
            </>
          )}

          <Hr style={divider} />

          {/* CTA */}
          <Section style={ctaSection}>
            <Text style={ctaLabel}>Tap the button below to share your availability:</Text>
            <Button style={button} href={tenantResponseLink}>
              Submit My Availability
            </Button>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              This request was sent via Liz — AI Property Manager on behalf of
              your landlord.
            </Text>
            <Text style={footerText}>
              If you have questions, reply to this email or contact your
              landlord directly.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default AvailabilityPrompt;

// Styles
const body: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "32px auto",
  maxWidth: "560px",
  borderRadius: "8px",
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

const header: React.CSSProperties = {
  backgroundColor: "#0f172a",
  padding: "24px 32px",
  textAlign: "center",
};

const logoText: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "700",
  margin: 0,
};

const tagline: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "13px",
  margin: "4px 0 0",
};

const heroSection: React.CSSProperties = {
  padding: "32px 32px 16px",
};

const heroHeading: React.CSSProperties = {
  color: "#0f172a",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 12px",
};

const heroSubtext: React.CSSProperties = {
  color: "#475569",
  fontSize: "15px",
  margin: "0 0 8px",
};

const divider: React.CSSProperties = {
  borderColor: "#e2e8f0",
  margin: "0 32px",
};

const cardSection: React.CSSProperties = {
  padding: "20px 32px",
};

const sectionHeading: React.CSSProperties = {
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: "600",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  margin: "0 0 12px",
};

const labelText: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "12px",
  fontWeight: "500",
  margin: "8px 0 2px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const valueText: React.CSSProperties = {
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: "500",
  margin: "0 0 4px",
};

const deadlineText: React.CSSProperties = {
  color: "#dc2626",
  fontSize: "15px",
  fontWeight: "600",
  margin: "0 0 4px",
};

const windowItem: React.CSSProperties = {
  color: "#475569",
  fontSize: "14px",
  margin: "0 0 4px",
};

const windowNote: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "13px",
  fontStyle: "italic",
  margin: "8px 0 0",
};

const ctaSection: React.CSSProperties = {
  padding: "24px 32px",
  textAlign: "center",
};

const ctaLabel: React.CSSProperties = {
  color: "#475569",
  fontSize: "14px",
  margin: "0 0 16px",
};

const button: React.CSSProperties = {
  backgroundColor: "#0f172a",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "600",
  padding: "12px 28px",
  textDecoration: "none",
};

const footerSection: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  borderTop: "1px solid #e2e8f0",
  padding: "20px 32px",
};

const footerText: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "12px",
  margin: "0 0 4px",
  textAlign: "center",
};
