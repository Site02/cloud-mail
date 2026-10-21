import {
  Heading,
  Link,
  Section,
  Text,
} from "react-email";

import MailCatLayout from "../components/MailCatLayout";
import MailCatHeader from "../components/MailCatHeader";
import MailCatFooter from "../components/MailCatFooter";

interface NewsletterProps {
  issue?: string;
  headline?: string;
}

export default function Newsletter({
  issue = "ISSUE 001",
  headline = "The inbox is becoming interesting again.",
}: NewsletterProps) {
  return (
    <MailCatLayout
      preview={headline}
      backgroundColor="#e9e9e4"
    >
      <MailCatHeader label={`MAIL CAT / ${issue}`} />

      <Section
        style={{
          padding: "28px 40px 46px",
        }}
      >
        <Text
          style={{
            margin: "0 0 18px",
            fontSize: "11px",
            color: "#888888",
            letterSpacing: "2px",
            fontWeight: "700",
          }}
        >
          SIGNAL / 01
        </Text>

        <Heading
          style={{
            margin: "0",
            color: "#111111",
            fontSize: "48px",
            lineHeight: "50px",
            letterSpacing: "-2.5px",
          }}
        >
          {headline}
        </Heading>

        <Text
          style={{
            margin: "26px 0 0",
            color: "#555555",
            fontSize: "18px",
            lineHeight: "29px",
          }}
        >
          Most email products optimise the act of sending.
          Far fewer reconsider what the inbox itself could become.
        </Text>

       <hr
  style={{
    border: "0",
    borderTop: "1px solid #ddddda",
    margin: "40px 0",
  }}
/>

        <Text
          style={{
            margin: "0 0 10px",
            color: "#111111",
            fontSize: "13px",
            fontWeight: "700",
          }}
        >
          THE OBSERVATION
        </Text>

        <Text
          style={{
            margin: "0",
            color: "#555555",
            fontSize: "16px",
            lineHeight: "27px",
          }}
        >
          Templates are usually treated as decoration. But a template
          can encode hierarchy, persuasion, readability and behaviour.
          The design system becomes part of the product.
        </Text>

        <Section
          style={{
            marginTop: "34px",
            backgroundColor: "#111111",
            padding: "28px",
          }}
        >
          <Text
            style={{
              margin: "0 0 8px",
              color: "#888888",
              fontSize: "11px",
              letterSpacing: "2px",
            }}
          >
            ONE THING
          </Text>

          <Text
            style={{
              margin: "0",
              color: "#ffffff",
              fontSize: "23px",
              lineHeight: "31px",
              letterSpacing: "-0.5px",
            }}
          >
            Great email design should make the reader feel the hierarchy
            before they consciously understand it.
          </Text>
        </Section>

        <Text
          style={{
            margin: "34px 0 0",
          }}
        >
          <Link
            href="https://mailcat.co.za"
            style={{
              color: "#111111",
              fontWeight: "700",
              fontSize: "14px",
            }}
          >
            Continue reading →
          </Link>
        </Text>
      </Section>

      <MailCatFooter />
    </MailCatLayout>
  );
}

Newsletter.PreviewProps = {
  issue: "ISSUE 001",
  headline: "The inbox is becoming interesting again.",
};