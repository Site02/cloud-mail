import {
  Heading,
  Section,
  Text,
} from "react-email";

import MailCatLayout from "../components/MailCatLayout";
import MailCatHeader from "../components/MailCatHeader";
import MailCatButton from "../components/MailCatButton";
import MailCatFooter from "../components/MailCatFooter";

interface WelcomeEmailProps {
  name?: string;
}

export default function WelcomeEmail({
  name = "Nazia",
}: WelcomeEmailProps) {
  return (
    <MailCatLayout
      preview={`Welcome to Mail Cat, ${name}.`}
    >
      <MailCatHeader />

      <Section
        style={{
          padding: "36px 40px 48px 40px",
        }}
      >
        <Text
          style={{
            margin: "0 0 18px",
            color: "#777777",
            fontSize: "12px",
            fontWeight: "700",
            letterSpacing: "2px",
          }}
        >
          WELCOME
        </Text>

        <Heading
          style={{
            margin: "0",
            color: "#111111",
            fontSize: "44px",
            lineHeight: "48px",
            letterSpacing: "-2px",
          }}
        >
          Your inbox just
          <br />
          grew claws.
        </Heading>

        <Text
          style={{
            margin: "26px 0 10px",
            color: "#555555",
            fontSize: "17px",
            lineHeight: "27px",
          }}
        >
          Hi {name},
        </Text>

        <Text
          style={{
            margin: "0 0 28px",
            color: "#555555",
            fontSize: "17px",
            lineHeight: "27px",
          }}
        >
          Welcome to Mail Cat. You now have a cleaner way to create,
          manage and send email without giving up control of the
          infrastructure underneath it.
        </Text>

        <MailCatButton href="https://mailcat.co.za">
          Open Mail Cat
        </MailCatButton>
      </Section>

      <MailCatFooter />
    </MailCatLayout>
  );
}

WelcomeEmail.PreviewProps = {
  name: "Nazia",
};