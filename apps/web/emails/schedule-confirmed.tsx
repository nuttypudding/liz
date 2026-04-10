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

export interface ScheduleConfirmedProps {
  workOrderId: string;
  workOrderTitle: string;
  propertyAddress: string;
  vendorName: string;
  scheduledDate: string;
  scheduledTimeStart: string;
  scheduledTimeEnd: string;
  landlordName: string;
  detailsUrl: string;
}

export function ScheduleConfirmed({
  workOrderId = "WO-001",
  workOrderTitle = "Leaking faucet repair",
  propertyAddress = "123 Main St, Apt 4B",
  vendorName = "ABC Plumbing",
  scheduledDate = "Monday, April 14, 2026",
  scheduledTimeStart = "9:00 AM",
  scheduledTimeEnd = "11:00 AM",
  landlordName = "Your Landlord",
  detailsUrl = "https://web-lovat-sigma-36.vercel.app/work-orders",
}: ScheduleConfirmedProps) {
  return (
    <Html>
      <Head />
      <Preview>Your appointment is confirmed — {workOrderTitle}</Preview>
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
              Appointment Confirmed
            </Heading>
            <Text style={heroSubtext}>
              Your maintenance appointment has been scheduled. Here are the
              details:
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Work Order Summary */}
          <Section style={cardSection}>
            <Heading as="h2" style={sectionHeading}>
              Work Order
            </Heading>
            <Row>
              <Column>
                <Text style={labelText}>Title</Text>
                <Text style={valueText}>{workOrderTitle}</Text>
              </Column>
              <Column>
                <Text style={labelText}>Reference</Text>
                <Text style={valueText}>#{workOrderId}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Appointment Details */}
          <Section style={cardSection}>
            <Heading as="h2" style={sectionHeading}>
              Appointment Details
            </Heading>
            <Row>
              <Column>
                <Text style={labelText}>Date</Text>
                <Text style={valueText}>{scheduledDate}</Text>
              </Column>
              <Column>
                <Text style={labelText}>Time</Text>
                <Text style={valueText}>
                  {scheduledTimeStart} – {scheduledTimeEnd}
                </Text>
              </Column>
            </Row>
            <Row style={{ marginTop: "12px" }}>
              <Column>
                <Text style={labelText}>Property</Text>
                <Text style={valueText}>{propertyAddress}</Text>
              </Column>
              <Column>
                <Text style={labelText}>Vendor</Text>
                <Text style={valueText}>{vendorName}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* CTA */}
          <Section style={ctaSection}>
            <Button style={button} href={detailsUrl}>
              View Work Order
            </Button>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              Sent by {landlordName} via Liz — AI Property Manager
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

export default ScheduleConfirmed;

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
  margin: "0 0 8px",
};

const heroSubtext: React.CSSProperties = {
  color: "#475569",
  fontSize: "15px",
  margin: 0,
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

const ctaSection: React.CSSProperties = {
  padding: "24px 32px",
  textAlign: "center",
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
