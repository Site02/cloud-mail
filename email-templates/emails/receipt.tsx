import {
  Column,
  Heading,
  Row,
  Section,
  Text,
} from "react-email";

import MailCatLayout from "../components/MailCatLayout";
import MailCatHeader from "../components/MailCatHeader";
import MailCatFooter from "../components/MailCatFooter";

export interface ReceiptProps {
  customer?: string;
  invoice?: string;
  amount?: string;
}

export default function Receipt({
  customer = "Nazia",
  invoice = "MC-1048",
  amount = "R199.00",
}: ReceiptProps) {
  return (
    <MailCatLayout
      preview={`Receipt ${invoice} — ${amount}`}
    >
      <MailCatHeader label="MAIL CAT / RECEIPT" />

      <Section
        style={{
          padding: "28px 40px",
        }}
      >
        <Text
          style={{
            margin: "0 0 10px",
            fontSize: "12px",
            letterSpacing: "2px",
            color: "#888888",
          }}
        >
          PAYMENT RECEIVED
        </Text>

        <Heading
          style={{
            margin: "0",
            fontSize: "36px",
            lineHeight: "41px",
            letterSpacing: "-1.5px",
            color: "#111111",
          }}
        >
          Thanks, {customer}.
        </Heading>

        <Text
          style={{
            margin: "18px 0 30px",
            color: "#666666",
            fontSize: "16px",
            lineHeight: "25px",
          }}
        >
          Your payment has been processed successfully.
        </Text>

        <Section
          style={{
            padding: "22px",
            backgroundColor: "#f5f5f3",
            borderRadius: "10px",
          }}
        >
          <Row>
            <Column>
              <Text
                style={{
                  margin: "0",
                  color: "#777777",
                  fontSize: "12px",
                }}
              >
                INVOICE
              </Text>

              <Text
                style={{
                  margin: "5px 0 0",
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "#111111",
                }}
              >
                {invoice}
              </Text>
            </Column>

            <Column align="right">
              <Text
                style={{
                  margin: "0",
                  color: "#777777",
                  fontSize: "12px",
                }}
              >
                TOTAL
              </Text>

              <Text
                style={{
                  margin: "5px 0 0",
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "#111111",
                }}
              >
                {amount}
              </Text>
            </Column>
          </Row>
        </Section>

        <hr
          style={{
            border: "0",
            borderTop: "1px solid #eeeeee",
            margin: "34px 0",
          }}
        />

        <Row>
          <Column>
            <Text
              style={{
                margin: "0",
                color: "#555555",
                fontSize: "14px",
              }}
            >
              Mail Cat Pro
            </Text>
          </Column>

          <Column align="right">
            <Text
              style={{
                margin: "0",
                color: "#111111",
                fontSize: "14px",
                fontWeight: "700",
              }}
            >
              {amount}
            </Text>
          </Column>
        </Row>
      </Section>

      <MailCatFooter />
    </MailCatLayout>
  );
}

Receipt.PreviewProps = {
  customer: "Nazia",
  invoice: "MC-1048",
  amount: "R199.00",
};