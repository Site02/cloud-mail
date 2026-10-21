import type { ReactNode } from "react";

import {
  Button,
} from "react-email";

interface MailCatButtonProps {
  href: string;
  children: ReactNode;
  inverted?: boolean;
}

export default function MailCatButton({
  href,
  children,
  inverted = false,
}: MailCatButtonProps) {
  return (
    <Button
      href={href}
      style={{
        display: "inline-block",
        backgroundColor: inverted ? "#ffffff" : "#111111",
        color: inverted ? "#111111" : "#ffffff",
        borderRadius: "8px",
        padding: "14px 22px",
        fontSize: "14px",
        fontWeight: "700",
        textDecoration: "none",
        letterSpacing: "-0.1px",
      }}
    >
      {children}
    </Button>
  );
}