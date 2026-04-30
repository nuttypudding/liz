import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface RescheduleRequestProps {
  landlordName: string;
  vendorName: string;
  currentAppointmentDate: string;
  currentAppointmentTimeStart: string;
  currentAppointmentTimeEnd: string;
  originalWorkOrderTitle: string;
  vendorReason?: string;
  rescheduleLink: string;
}

export function RescheduleRequest({
  landlordName = "Landlord",
  vendorName = "ABC Plumbing",
  currentAppointmentDate = "Monday, April 14, 2026",
  currentAppointmentTimeStart = "9:00 AM",
  currentAppointmentTimeEnd = "11:00 AM",
  originalWorkOrderTitle = "Leaking faucet repair",
  vendorReason = "",
  rescheduleLink = "https://web-lovat-sigma-36.vercel.app/work-orders",
}: RescheduleRequestProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Reschedule requested by {vendorName} — {originalWorkOrderTitle}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logoText}>Liz</Heading>
            <Text style={tagline}>AI Property Manager</Text>
          </Section>

          {/* Alert Banner */}
          <Section style={alertBanner}>
            <Text style={alertText}>⚠ Reschedule Requested</Text>
          </Section>

          {/* Hero */}
          <Section style={heroSection}>
            <Heading as="h1" style={heroHeading}>
              Your appointment needs to be rescheduled
            </Heading>
            <Text style={heroSubtext}>Hi {landlordName},</Text>
            <Text style={heroSubtext}>
              <strong>{vendorName}</strong> has requested to reschedule the
              following appointment. Please review and select a new time.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Current Appointment */}
          <Section style={cardSection}>
            <Heading as="h2" style={sectionHeading}>
              Current Appointment
            </Heading>
            <Row>
              <Column>
                <Text style={labelText}>Work Order</Text>
                <Text style={valueText}>{originalWorkOrderTitle}</Text>
              </Column>
              <Column>
                <Text style={labelText}>Vendor</Text>
                <Text style={valueText}>{vendorName}</Text>
              </Column>
            </Row>
            <Row style={{ marginTop: "12px" }}>
              <Column>
                <Text style={labelText}>Date</Text>
                <Text style={cancelledText}>{currentAppointmentDate}</Text>
              </Column>
              <Column>
                <Text style={labelText}>Time</Text>
                <Text style={cancelledText}>
                  {currentAppointmentTimeStart} – {currentAppointmentTimeEnd}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Vendor Reason (optional) */}
          {vendorReason && (
            <>
              <Hr style={divider} />
              <Section style={cardSection}>
                <Heading as="h2" style={sectionHeading}>
                  Reason from Vendor
                </Heading>
                <Text style={reasonText}>&ldquo;{vendorReason}&rdquo;</Text>
              </Section>
            </>
          )}

          <Hr style={divider} />

          {/* CTA */}
          <Section style={ctaSection}>
            <Text style={ctaLabel}>
              Review the request and select a new appointment time:
            </Text>
            <Button style={button} href={rescheduleLink}>
              Review Reschedule Request
            </Button>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              Sent via Liz — AI Property Manager
            </Text>
            <Text style={footerText}>
              If you believe this is an error, contact your vendor directly.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default RescheduleRequest;

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

const alertBanner: React.CSSProperties = {
  backgroundColor: "#fef3c7",
  borderBottom: "1px solid #fde68a",
  padding: "12px 32px",
};

const alertText: React.CSSProperties = {
  color: "#92400e",
  fontSize: "14px",
  fontWeight: "600",
  margin: 0,
  textAlign: "center",
};

const heroSection: React.CSSProperties = {
  padding: "32px 32px 16px",
};

const heroHeading: React.CSSProperties = {
  color: "#0f172a",
  fontSize: "22px",
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
  margin: "0 0 2px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const valueText: React.CSSProperties = {
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: "500",
  margin: "0 0 4px",
};

const cancelledText: React.CSSProperties = {
  color: "#dc2626",
  fontSize: "15px",
  fontWeight: "500",
  margin: "0 0 4px",
  textDecoration: "line-through",
};

const reasonText: React.CSSProperties = {
  color: "#475569",
  fontSize: "14px",
  fontStyle: "italic",
  borderLeft: "3px solid #e2e8f0",
  paddingLeft: "12px",
  margin: 0,
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
