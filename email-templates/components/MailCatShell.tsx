import {
  Body,
  Container,
  Head,
  Html,
  Preview,
} from "react-email";

interface MailCatShellProps {
  preview: string;
  children: React.ReactNode;
  background?: string;
}

export function MailCatShell({
  preview,
  children,
  background = "#f4f4f1",
}: MailCatShellProps) {
  return (
    <Html>
      <Head />

      <Preview>{preview}</Preview>

      <Body
        style={{
          margin: 0,
          padding: "40px 16px",
          backgroundColor: background,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
          color: "#111111",
        }}
      >
        <Container
          style={{
            width: "100%",
            maxWidth: "640px",
            margin: "0 auto",
          }}
        >
          {children}
        </Container>
      </Body>
    </Html>
  );
}