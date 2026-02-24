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

interface PasswordResetEmailProps {
  firstName: string;
  resetUrl: string;
}

export default function PasswordResetEmail({
  firstName = "there",
  resetUrl = "http://localhost:3000/reset-password?token=test",
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your GudCal password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Reset Your Password</Heading>
          <Text style={text}>
            Hi {firstName},
          </Text>
          <Text style={text}>
            We received a request to reset the password for your GudCal account.
            Click the button below to set a new password.
          </Text>
          <Section style={{ textAlign: "center" as const }}>
            <Button href={resetUrl} style={button}>
              Reset Password
            </Button>
          </Section>
          <Text style={text}>
            This link will expire in 1 hour. If you didn&apos;t request a
            password reset, you can safely ignore this email.
          </Text>
          <Hr style={hr} />
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
