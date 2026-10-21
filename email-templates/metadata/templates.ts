import type {
  TemplateDefinition,
  TemplateValues,
} from "./types";

export const templates: TemplateDefinition[] = [
  {
    id: "mailcat-welcome",
    name: "Welcome",
    description:
      "Clean onboarding email for new Mail Cat users.",

    category: "Onboarding",

    tags: [
      "welcome",
      "minimal",
      "onboarding",
    ],

    editable: true,
    featured: true,

    file: "welcome",

    fields: [
      {
        key: "name",
        label: "Recipient name",
        type: "text",
        defaultValue: "Nazia",
        placeholder: "Jane",
        required: true,
        group: "Content",
        maxLength: 80,
      },
    ],
  },

  {
    id: "mailcat-newsletter",
    name: "Signal Newsletter",
    description:
      "Editorial newsletter with strong typography and content hierarchy.",

    category: "Newsletter",

    tags: [
      "newsletter",
      "editorial",
      "content",
    ],

    editable: true,
    featured: true,

    file: "newsletter",

    fields: [
      {
        key: "issue",
        label: "Issue",
        type: "text",
        defaultValue: "ISSUE 001",
        group: "Content",
      },

      {
        key: "headline",
        label: "Headline",
        type: "textarea",
        defaultValue:
          "The inbox is becoming interesting again.",
        group: "Content",
        maxLength: 140,
      },
    ],
  },

  {
    id: "mailcat-promotion",
    name: "Product Drop",
    description:
      "Dark promotional layout designed around a strong offer.",

    category: "Marketing",

    tags: [
      "promotion",
      "dark",
      "sales",
    ],

    editable: true,
    featured: true,

    file: "promotion",

    fields: [
      {
        key: "product",
        label: "Product name",
        type: "text",
        defaultValue: "MAIL CAT PRO",
        required: true,
        group: "Offer",
        maxLength: 60,
      },

      {
        key: "offer",
        label: "Offer label",
        type: "text",
        defaultValue: "EARLY ACCESS",
        group: "Offer",
        maxLength: 60,
      },

      {
        key: "headline",
        label: "Headline",
        type: "textarea",
        defaultValue:
          "Send smarter. Own the stack.",
        required: true,
        group: "Content",
        maxLength: 120,
      },

      {
        key: "body",
        label: "Description",
        type: "textarea",
        defaultValue:
          "Advanced email infrastructure with templates, analytics and control without the usual platform lock-in.",
        group: "Content",
        maxLength: 320,
      },

      {
        key: "price",
        label: "Price",
        type: "text",
        defaultValue: "R199",
        group: "Offer",
        maxLength: 30,
      },

      {
        key: "priceCaption",
        label: "Price caption",
        type: "text",
        defaultValue: "introductory plan",
        group: "Offer",
        maxLength: 80,
      },

      {
        key: "ctaText",
        label: "Button text",
        type: "text",
        defaultValue: "Get early access",
        group: "Call to action",
        maxLength: 60,
      },

      {
        key: "ctaUrl",
        label: "Button URL",
        type: "url",
        defaultValue: "https://mailcat.co.za",
        group: "Call to action",
        required: true,
      },

      {
        key: "cardColor",
        label: "Offer card colour",
        type: "color",
        defaultValue: "#1a1a1a",
        group: "Design",
      },
    ],
  },

  {
    id: "mailcat-receipt",
    name: "Receipt",
    description:
      "Minimal transactional receipt and payment confirmation.",

    category: "Transactional",

    tags: [
      "receipt",
      "transactional",
      "payment",
    ],

    editable: true,

    file: "receipt",

    fields: [
      {
        key: "customer",
        label: "Customer",
        type: "text",
        defaultValue: "Nazia",
        group: "Receipt",
      },

      {
        key: "invoice",
        label: "Invoice",
        type: "text",
        defaultValue: "MC-1048",
        group: "Receipt",
      },

      {
        key: "amount",
        label: "Amount",
        type: "text",
        defaultValue: "R199.00",
        group: "Receipt",
      },
    ],
  },

  {
    id: "mailcat-experimental",
    name: "Transmission",
    description:
      "Experimental brutalist email built to explore the edges of email design.",

    category: "Experimental",

    tags: [
      "experimental",
      "brutalist",
      "dark",
      "typography",
    ],

    editable: false,
    featured: true,

    file: "experimental",

    fields: [],
  },
];

export function getTemplateDefinition(
  templateId: string,
): TemplateDefinition | undefined {
  return templates.find(
    (template) => template.id === templateId,
  );
}

export function getDefaultValues(
  template: TemplateDefinition,
): TemplateValues {
  return Object.fromEntries(
    template.fields.map((field) => [
      field.key,
      field.defaultValue,
    ]),
  );
}