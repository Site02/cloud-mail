import {
  Link,
  Section,
  Text,
} from "react-email";

interface MailCatFooterProps {
  dark?: boolean;
}

export default function MailCatFooter({
  dark = false,
}: MailCatFooterProps) {
  const color = dark ? "#777777" : "#888888";

  return (
    <Section
      style={{
        padding: "10px 40px 34px 40px",
        backgroundColor: dark ? "#101010" : "#ffffff",
      }}
    >
      <hr
        style={{
          border: "0",
          borderTop: `1px solid ${dark ? "#272727" : "#e8e8e8"}`,
          margin: "0 0 24px 0",
        }}
      />

      <Text
        style={{
          margin: "0 0 8px 0",
          color,
          fontSize: "12px",
          lineHeight: "18px",
        }}
      >
        Sent with Mail Cat.
      </Text>

      <Text
        style={{
          margin: "0",
          color,
          fontSize: "12px",
          lineHeight: "18px",
        }}
      >
        <Link
          href="https://mailcat.co.za"
          style={{
            color: dark ? "#bbbbbb" : "#555555",
            textDecoration: "underline",
          }}
        >
          mailcat.co.za
        </Link>
      </Text>
    </Section>
  );
}