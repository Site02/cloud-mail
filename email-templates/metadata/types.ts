export type TemplateCategory =
  | "Onboarding"
  | "Newsletter"
  | "Marketing"
  | "Transactional"
  | "Experimental";

export type TemplateFieldType =
  | "text"
  | "textarea"
  | "url"
  | "color";

export interface TemplateField {
  key: string;
  label: string;
  type: TemplateFieldType;

  defaultValue: string;

  placeholder?: string;
  helpText?: string;

  required?: boolean;

  group?: string;

  maxLength?: number;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;

  category: TemplateCategory;

  tags: string[];

  featured?: boolean;
  editable: boolean;

  file: string;

  fields: TemplateField[];
}

export type TemplateValues = Record<string, string>;