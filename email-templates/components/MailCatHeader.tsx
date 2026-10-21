import {
  Section,
  Text,
} from "react-email";

interface MailCatHeaderProps {
  label?: string;
  dark?: boolean;
}

export default function MailCatHeader({
  label = "MAIL CAT",
  dark = false,
}: MailCatHeaderProps) {
  return (
    <Section
      style={{
        padding: "28px 40px 20px 40px",
        backgroundColor: dark ? "#101010" : "#ffffff",
      }}
    >
      <Text
        style={{
          margin: "0",
          fontSize: "12px",
          fontWeight: "700",
          letterSpacing: "3px",
          color: dark ? "#ffffff" : "#111111",
        }}
      >
        {label}
      </Text>
    </Section>
  );
}