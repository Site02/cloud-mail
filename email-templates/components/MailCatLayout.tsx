import type { ReactNode } from "react";

import {
  Body,
  Container,
  Head,
  Html,
  Preview,
} from "react-email";

interface MailCatLayoutProps {
  children: ReactNode;
  preview?: string;
  backgroundColor?: string;
  containerColor?: string;
}

export default function MailCatLayout({
  children,
  preview = "Mail Cat",
  backgroundColor = "#f3f3f1",
  containerColor = "#ffffff",
}: MailCatLayoutProps) {
  return (
    <Html>
      <Head />

      <Preview>{preview}</Preview>

      <Body
        style={{
          margin: "0",
          padding: "0",
          backgroundColor,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, Helvetica, sans-serif',
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: containerColor,
          }}
        >
          {children}
        </Container>
      </Body>
    </Html>
  );
}