import {
  Heading,
  Section,
  Text,
} from "react-email";

import MailCatLayout from "../components/MailCatLayout";
import MailCatHeader from "../components/MailCatHeader";
import MailCatButton from "../components/MailCatButton";
import MailCatFooter from "../components/MailCatFooter";

export interface PromotionProps {
  product?: string;
  offer?: string;

  headline?: string;
  body?: string;

  price?: string;
  priceCaption?: string;

  ctaText?: string;
  ctaUrl?: string;

  cardColor?: string;
}

export default function Promotion({
  product = "MAIL CAT PRO",

  offer = "EARLY ACCESS",

  headline = "Send smarter. Own the stack.",

  body =
    "Advanced email infrastructure with templates, analytics and control without the usual platform lock-in.",

  price = "R199",

  priceCaption = "introductory plan",

  ctaText = "Get early access",

  ctaUrl = "https://mailcat.co.za",

  cardColor = "#1a1a1a",
}: PromotionProps) {
  const headlineParts = headline.split(".");

  return (
    <MailCatLayout
      preview={`${offer}: ${product}`}
      backgroundColor="#090909"
      containerColor="#101010"
    >
      <MailCatHeader
        label="MAIL CAT / DROP"
        dark
      />

      <Section
        style={{
          padding: "38px 40px 20px",
          backgroundColor: "#101010",
        }}
      >
        <Text
          style={{
            margin: "0 0 16px",

            color: "#666666",

            fontSize: "11px",
            fontWeight: "700",

            letterSpacing: "3px",
          }}
        >
          {offer}
        </Text>

        <Heading
          style={{
            margin: "0",

            color: "#ffffff",

            fontSize: "50px",
            lineHeight: "50px",

            letterSpacing: "-2.5px",
          }}
        >
          {headlineParts.map((part, index) => {
            const clean = part.trim();

            if (!clean) {
              return null;
            }

            return (
              <span key={`${clean}-${index}`}>
                {clean}
                {index < headlineParts.length - 1
                  ? "."
                  : ""}

                {index < headlineParts.length - 1 && (
                  <br />
                )}
              </span>
            );
          })}
        </Heading>

        <Text
          style={{
            margin: "28px 0",

            color: "#aaaaaa",

            fontSize: "17px",
            lineHeight: "27px",
          }}
        >
          {body}
        </Text>
      </Section>

      <Section
        style={{
          padding: "12px 40px 40px",

          backgroundColor: "#101010",
        }}
      >
        <Section
          style={{
            padding: "28px",

            backgroundColor: cardColor,

            borderRadius: "12px",
          }}
        >
          <Text
            style={{
              margin: "0",

              color: "#777777",

              fontSize: "11px",

              letterSpacing: "2px",
            }}
          >
            {product}
          </Text>

          <Text
            style={{
              margin: "10px 0 4px",

              color: "#ffffff",

              fontSize: "36px",
              lineHeight: "40px",

              fontWeight: "700",

              letterSpacing: "-1px",
            }}
          >
            {price}
          </Text>

          <Text
            style={{
              margin: "0 0 24px",

              color: "#777777",

              fontSize: "13px",
            }}
          >
            {priceCaption}
          </Text>

          <MailCatButton
            href={ctaUrl}
            inverted
          >
            {ctaText}
          </MailCatButton>
        </Section>
      </Section>

      <MailCatFooter dark />
    </MailCatLayout>
  );
}

Promotion.PreviewProps = {
  product: "MAIL CAT PRO",

  offer: "EARLY ACCESS",

  headline:
    "Send smarter. Own the stack.",

  body:
    "Advanced email infrastructure with templates, analytics and control without the usual platform lock-in.",

  price: "R199",

  priceCaption:
    "introductory plan",

  ctaText:
    "Get early access",

  ctaUrl:
    "https://mailcat.co.za",

  cardColor:
    "#1a1a1a",
};