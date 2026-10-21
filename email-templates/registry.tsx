import type {
  ComponentType,
} from "react";

import WelcomeEmail from "./emails/welcome";
import Newsletter from "./emails/newsletter";
import Promotion from "./emails/promotion";
import Receipt from "./emails/receipt";
import Experimental from "./emails/experimental";

import {
  getDefaultValues,
  getTemplateDefinition,
  templates,
} from "./metadata/templates";

import type {
  TemplateValues,
} from "./metadata/types";

export interface TemplateRuntimeEntry {
  id: string;

  component: ComponentType<any>;
}

export const templateRegistry: TemplateRuntimeEntry[] = [
  {
    id: "mailcat-welcome",
    component: WelcomeEmail,
  },

  {
    id: "mailcat-newsletter",
    component: Newsletter,
  },

  {
    id: "mailcat-promotion",
    component: Promotion,
  },

  {
    id: "mailcat-receipt",
    component: Receipt,
  },

  {
    id: "mailcat-experimental",
    component: Experimental,
  },
];

export function getTemplateComponent(
  templateId: string,
): ComponentType<any> {
  const entry = templateRegistry.find(
    (item) => item.id === templateId,
  );

  if (!entry) {
    throw new Error(
      `No React component registered for template "${templateId}".`,
    );
  }

  return entry.component;
}

export function resolveTemplateValues(
  templateId: string,
  overrides: TemplateValues = {},
): TemplateValues {
  const definition =
    getTemplateDefinition(templateId);

  if (!definition) {
    throw new Error(
      `Unknown template "${templateId}".`,
    );
  }

  return {
    ...getDefaultValues(definition),
    ...overrides,
  };
}

export function validateRegistry() {
  const metadataIds = new Set(
    templates.map((template) => template.id),
  );

  const runtimeIds = new Set(
    templateRegistry.map((template) => template.id),
  );

  for (const id of metadataIds) {
    if (!runtimeIds.has(id)) {
      throw new Error(
        `Template "${id}" exists in metadata but has no React component.`,
      );
    }
  }

  for (const id of runtimeIds) {
    if (!metadataIds.has(id)) {
      throw new Error(
        `Template "${id}" has a React component but no metadata.`,
      );
    }
  }
}