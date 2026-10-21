import {
  Column,
  Heading,
  Row,
  Section,
  Text,
} from "react-email";

import MailCatLayout from "../components/MailCatLayout";
import MailCatFooter from "../components/MailCatFooter";

export default function Experimental() {
  return (
    <MailCatLayout
      preview="MAIL CAT / Experimental transmission"
      backgroundColor="#000000"
      containerColor="#000000"
    >
      <Section
        style={{
          padding: "36px 34px 10px",
          backgroundColor: "#000000",
        }}
      >
        <Row>
          <Column>
            <Text
              style={{
                margin: "0",
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "3px",
              }}
            >
              MAIL CAT
            </Text>
          </Column>

          <Column align="right">
            <Text
              style={{
                margin: "0",
                color: "#555555",
                fontSize: "10px",
                letterSpacing: "2px",
              }}
            >
              SIGNAL / 001
            </Text>
          </Column>
        </Row>
      </Section>

      <Section
        style={{
          padding: "52px 34px 42px",
          backgroundColor: "#000000",
        }}
      >
        <Text
          style={{
            margin: "0 0 12px",
            color: "#555555",
            fontSize: "10px",
            letterSpacing: "4px",
          }}
        >
          TRANSMISSION DETECTED
        </Text>

        <Heading
          style={{
            margin: "0",
            color: "#ffffff",
            fontSize: "58px",
            lineHeight: "55px",
            letterSpacing: "-3.5px",
            fontWeight: "700",
          }}
        >
          EMAIL
          <br />
          DOESN'T
          <br />
          HAVE TO
          <br />
          LOOK LIKE
          <br />
          EMAIL.
        </Heading>
      </Section>

      <Section
        style={{
          margin: "0 34px",
          padding: "1px",
          backgroundColor: "#333333",
        }}
      />

      <Section
        style={{
          padding: "34px",
          backgroundColor: "#000000",
        }}
      >
        <Row>
          <Column
            style={{
              width: "32%",
              verticalAlign: "top",
            }}
          >
            <Text
              style={{
                margin: "0",
                color: "#666666",
                fontSize: "10px",
                lineHeight: "16px",
                letterSpacing: "1px",
              }}
            >
              SYSTEM
              <br />
              MAILCAT
              <br />
              STATUS
              <br />
              ONLINE
            </Text>
          </Column>

          <Column
            style={{
              width: "68%",
              verticalAlign: "top",
            }}
          >
            <Text
              style={{
                margin: "0",
                color: "#bbbbbb",
                fontSize: "15px",
                lineHeight: "24px",
              }}
            >
              The constraints are the medium.
              Tables. Inline styles. Strange rendering engines.
              Limited CSS.
            </Text>

            <Text
              style={{
                margin: "20px 0 0",
                color: "#ffffff",
                fontSize: "15px",
                lineHeight: "24px",
                fontWeight: "700",
              }}
            >
              Instead of hiding those constraints,
              we can design with them.
            </Text>
          </Column>
        </Row>
      </Section>

      <Section
        style={{
          margin: "4px 34px 40px",
          padding: "22px",
          border: "1px solid #333333",
        }}
      >
        <Text
          style={{
            margin: "0",
            color: "#666666",
            fontSize: "10px",
            letterSpacing: "2px",
          }}
        >
          COMMAND
        </Text>

        <Text
          style={{
            margin: "8px 0 0",
            color: "#ffffff",
            fontSize: "14px",
            fontFamily: "monospace",
          }}
        >
          &gt; MAKE_THE_INBOX_INTERESTING_
        </Text>
      </Section>

      <MailCatFooter dark />
    </MailCatLayout>
  );
}