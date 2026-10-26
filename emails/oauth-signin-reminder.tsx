import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Button,
} from "@react-email/components";

interface OAuthSignInReminderEmailProps {
  firstName: string;
  loginUrl: string;
}

export default function OAuthSignInReminderEmail({
  firstName = "there",
  loginUrl = "http://localhost:3000/login",
}: OAuthSignInReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Sign in to GudCal with Google</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Sign in with Google</Heading>
          <Text style={text}>Hi {firstName},</Text>
          <Text style={text}>
            You requested a password reset, but this GudCal account signs in with
            Google. There is no password to reset.
          </Text>
          <Section style={{ textAlign: "center" as const }}>
            <Button href={loginUrl} style={button}>
              Continue with Google
            </Button>
          </Section>
          <Text style={text}>
            Use Continue with Google on the login page to access your account. If
            you didn&apos;t request this, you can safely ignore this email.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>GudCal</Text>
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

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const button = {
  backgroundColor: "#10b981",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  textAlign: "center" as const,
  marginTop: "24px",
};
