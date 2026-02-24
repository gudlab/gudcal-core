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

interface BookingConfirmationEmailProps {
  guestName: string;
  hostName: string;
  eventTitle: string;
  dateStr: string;        // "Wednesday, February 19, 2025"
  timeStr: string;        // "2:00 PM - 2:30 PM (EST)"
  location?: string;
  bookingUid: string;
  isHost: boolean;        // different wording & links for host vs guest
  notes?: string;
}

export default function BookingConfirmationEmail({
  guestName = "John Doe",
  hostName = "Jane Smith",
  eventTitle = "Quick Chat",
  dateStr = "Wednesday, February 19, 2025",
  timeStr = "2:00 PM - 2:30 PM (EST)",
  location,
  bookingUid = "test-uid",
  isHost = false,
  notes,
}: BookingConfirmationEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const bookingUrl = `${baseUrl}/booking/${bookingUid}`;
  const rescheduleUrl = `${baseUrl}/booking/${bookingUid}/reschedule`;
  const cancelUrl = `${baseUrl}/booking/${bookingUid}/cancel`;
  const dashboardUrl = `${baseUrl}/dashboard/bookings`;

  return (
    <Html>
      <Head />
      <Preview>
        {isHost
          ? `New booking: ${guestName} booked ${eventTitle}`
          : `Booking confirmed: ${eventTitle} with ${hostName}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {isHost ? "New Booking" : "Booking Confirmed"}
          </Heading>
          <Text style={text}>
            {isHost
              ? `${guestName} has booked a ${eventTitle} with you.`
              : `Your ${eventTitle} with ${hostName} has been confirmed.`}
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

          {isHost ? (
            /* ── Host actions: link to dashboard ── */
            <Section style={{ textAlign: "center" as const }}>
              <Button href={dashboardUrl} style={button}>
                Manage Bookings
              </Button>
            </Section>
          ) : (
            /* ── Guest actions ── */
            <Section style={{ textAlign: "center" as const }}>
              <Button href={bookingUrl} style={button}>
                View Booking Details
              </Button>
              <Text style={actionLinks}>
                {"Booked this meeting? "}
                <Link href={rescheduleUrl} style={actionLink}>
                  Reschedule
                </Link>
                {" · "}
                <Link href={cancelUrl} style={actionLink}>
                  Cancel
                </Link>
              </Text>
            </Section>
          )}

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

const actionLinks = {
  color: "#6b7280",
  fontSize: "13px",
  textAlign: "center" as const,
  marginTop: "12px",
};

const actionLink = {
  color: "#0069FF",
  textDecoration: "underline",
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
