import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "react-email";

export default function MailCatWelcome() {
  return (
    <Html>
      <Head />

      <Preview>
        Welcome to Mail Cat — email with sharper claws.
      </Preview>

      <Body
        style={{
          backgroundColor: "#f5f5f5",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
          margin: 0,
          padding: "40px 0",
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "18px",
            overflow: "hidden",
          }}
        >
          <Section
            style={{
              backgroundColor: "#111111",
              padding: "48px 40px",
            }}
          >
            <Text
              style={{
                color: "#999999",
                fontSize: "12px",
                letterSpacing: "3px",
                margin: "0 0 20px",
              }}
            >
              MAIL CAT
            </Text>

            <Heading
              style={{
                color: "#ffffff",
                fontSize: "42px",
                lineHeight: "46px",
                letterSpacing: "-2px",
                margin: 0,
              }}
            >
              Email with
              <br />
              sharper claws.
            </Heading>

            <Text
              style={{
                color: "#b8b8b8",
                fontSize: "17px",
                lineHeight: "27px",
                margin: "26px 0 0",
              }}
            >
              Beautiful email infrastructure without sacrificing control.
            </Text>
          </Section>

          <Section
            style={{
              padding: "40px",
            }}
          >
            <Heading
              as="h2"
              style={{
                fontSize: "24px",
                letterSpacing: "-0.6px",
                margin: "0 0 14px",
              }}
            >
              Welcome aboard.
            </Heading>

            <Text
              style={{
                color: "#555555",
                fontSize: "16px",
                lineHeight: "26px",
              }}
            >
              This is our first React Email template running inside the Mail Cat
              template library experiment.
            </Text>

            <Button
              href="https://mailcat.co.za"
              style={{
                backgroundColor: "#111111",
                borderRadius: "10px",
                color: "#ffffff",
                display: "inline-block",
                fontSize: "15px",
                fontWeight: 600,
                padding: "14px 24px",
                textDecoration: "none",
                marginTop: "14px",
              }}
            >
              Explore Mail Cat
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}