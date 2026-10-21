import {
  createElement,
} from "react";

import {
  render,
} from "react-email";

import {
  getTemplateComponent,
  resolveTemplateValues,
} from "./registry";

import type {
  TemplateValues,
} from "./metadata/types";

export async function renderTemplate(
  templateId: string,

  values: TemplateValues = {},
): Promise<string> {
  const Component =
    getTemplateComponent(templateId);

  const props =
    resolveTemplateValues(
      templateId,
      values,
    );

  const element =
    createElement(
      Component,
      props,
    );

  const html =
    await render(element);

  return html;
}