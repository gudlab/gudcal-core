import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Button,
} from "@react-email/components";

interface BookingReminderEmailProps {
  guestName: string;
  hostName: string;
  eventTitle: string;
  dateStr: string;
  timeStr: string;
  location?: string;
  bookingUid: string;
  notes?: string;
}

export default function BookingReminderEmail({
  guestName = "John Doe",
  hostName = "Jane Smith",
  eventTitle = "Quick Chat",
  dateStr = "Wednesday, February 19, 2025",
  timeStr = "2:00 PM - 2:30 PM (EST)",
  location,
  bookingUid = "test-uid",
  notes,
}: BookingReminderEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const bookingUrl = `${baseUrl}/booking/${bookingUid}`;

  return (
    <Html>
      <Head />
      <Preview>
        Reminder: {eventTitle} with {hostName} tomorrow
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Upcoming Meeting Reminder</Heading>
          <Text style={text}>
            Hi {guestName}, this is a reminder that your{" "}
            <strong>{eventTitle}</strong> with {hostName} is tomorrow.
          </Text>
          <Section style={detailsSection}>
            <Text style={detailLabel}>What</Text>
            <Text style={detailValue}>{eventTitle}</Text>
            <Text style={detailLabel}>When</Text>
            <Text style={detailValue}>{dateStr}</Text>
            <Text style={detailValue}>{timeStr}</Text>
            {location && (
              <>
                <Text style={detailLabel}>Where</Text>
                <Text style={detailValue}>
                  {/^https?:\/\//.test(location) ? (
                    <Link href={location} style={locationLink}>
                      Join Meeting
                    </Link>
                  ) : (
                    location
                  )}
                </Text>
              </>
            )}
            {notes && (
              <>
                <Text style={detailLabel}>Notes</Text>
                <Text style={detailValue}>{notes}</Text>
              </>
            )}
          </Section>
          <Hr style={hr} />
          <Section style={{ textAlign: "center" as const }}>
            <Button href={bookingUrl} style={button}>
              View Booking Details
            </Button>
          </Section>
          <Text style={footer}>
            GudCal — Scheduling for the AI era
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "480px",
  borderRadius: "8px",
};

const h1 = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600" as const,
  lineHeight: "1.25",
  marginBottom: "16px",
};

const text = {
  color: "#4a4a4a",
  fontSize: "14px",
  lineHeight: "1.5",
  marginBottom: "24px",
};

const detailsSection = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px 20px",
  marginBottom: "24px",
};

const detailLabel = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "600" as const,
  textTransform: "uppercase" as const,
  marginBottom: "2px",
  marginTop: "12px",
};

const detailValue = {
  color: "#1a1a1a",
  fontSize: "14px",
  marginBottom: "0",
  marginTop: "2px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const button = {
  backgroundColor: "#0069FF",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const locationLink = {
  color: "#0069FF",
  textDecoration: "underline",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  textAlign: "center" as const,
  marginTop: "24px",
};
