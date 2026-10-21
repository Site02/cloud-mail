type EditableField = {
  id?: string;
  key?: string;
  name?: string;
  type?: string;
  default?: unknown;
  defaultValue?: unknown;
  value?: unknown;
};

function fieldId(field: EditableField): string {
  return String(
    field.id ??
    field.key ??
    field.name ??
    ""
  );
}

function markerFor(id: string): string {
  return `__MAILCAT_${id}__`;
}

/**
 * We do NOT pass __MAILCAT_x__ directly into React Email for every field.
 *
 * CSS renderers may reject an invalid colour value, and URL handling may
 * transform invalid URLs. Instead we give React Email valid sentinel values,
 * render the HTML, then convert those sentinels into Mail Cat markers.
 */
function sentinelFor(
  field: EditableField,
  index: number
): string {
  const id = fieldId(field);
  const type = field.type ?? "text";

  if (type === "color") {
    // Valid, unique CSS colour.
    const number =
      0xa00000 + ((index + 1) * 0x101);

    return `#${number
      .toString(16)
      .padStart(6, "0")
      .slice(-6)}`;
  }

  if (type === "url") {
    // Valid URL so React Email preserves the attribute.
    return `https://mailcat.invalid/editable/${index}/${encodeURIComponent(id)}`;
  }

  return `MAILCAT_FIELD_${index}_${id}_7F3A91`;
}

function makeEditableValues(
  fields: EditableField[]
): {
  values: Record<string, string>;
  sentinels: Map<string, string>;
} {
  const values: Record<string, string> = {};
  const sentinels = new Map<string, string>();

  fields.forEach((field, index) => {
    const id = fieldId(field);

    if (!id) {
      throw new Error(
        `Template field at index ${index} has no id/key/name`
      );
    }

    const sentinel =
      sentinelFor(field, index);

    values[id] = sentinel;
    sentinels.set(id, sentinel);
  });

  return {
    values,
    sentinels
  };
}

function convertSentinelsToMarkers(
  html: string,
  sentinels: Map<string, string>
): string {
  let output = html;

  for (const [id, sentinel] of sentinels) {
    const marker = markerFor(id);

    // Normally this is enough.
    output = output.split(sentinel).join(marker);

    // URL serializers may percent-encode portions.
    output = output
      .split(encodeURI(sentinel))
      .join(marker);

    output = output
      .split(encodeURIComponent(sentinel))
      .join(marker);
  }

  return output;
}

function assertMarkersPresent(
  html: string,
  fields: EditableField[],
  templateId: string
): void {
  const missing =
    fields
      .map(field => fieldId(field))
      .filter(
        id =>
          id &&
          !html.includes(markerFor(id))
      );

  if (missing.length) {
    throw new Error(
      `Editable build for "${templateId}" is missing markers: ${missing.join(", ")}`
    );
  }
}

import {
  mkdir,
  rm,
  writeFile,
} from "node:fs/promises";

import {
  join,
} from "node:path";

import {
  templates,
  getDefaultValues,
} from "../metadata/templates";

import {
  renderTemplate,
} from "../render-template";

import {
  validateRegistry,
} from "../registry";

const root = process.cwd();

const outputDirectory = join(
  root,
  "output",
);

interface ManifestTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  featured: boolean;
  editable: boolean;
  html: string;
  fields: unknown[];
  defaults: Record<string, string>;
}

async function buildLibrary() {
  console.log("\nMail Cat Template Builder\n");

  validateRegistry();

  await rm(
    outputDirectory,
    {
      recursive: true,
      force: true,
    },
  );

  await mkdir(
    outputDirectory,
    {
      recursive: true,
    },
  );

  const manifest: ManifestTemplate[] = [];

  for (const template of templates) {
    console.log(
      `Rendering ${template.name}...`,
    );

    const defaults =
      getDefaultValues(template);

    const html =
      await renderTemplate(
        template.id,
        defaults,
      );
const fields =
  (template.fields ?? []) as EditableField[];

/*
 * 1. NORMAL PRODUCTION HTML
 */

const normalHtml =
  await renderTemplate(
    template.id
  );

const normalFile =
  `mailcat-${template.id}.html`;

await fs.writeFile(
  path.join(outputDir, normalFile),
  normalHtml,
  "utf8"
);


/*
 * 2. EDITABLE BUILD
 */

const {
  values: editableValues,
  sentinels
} =
  makeEditableValues(fields);

const renderedEditableHtml =
  await renderTemplate(
    template.id,
    editableValues
  );

const editableHtml =
  convertSentinelsToMarkers(
    renderedEditableHtml,
    sentinels
  );

assertMarkersPresent(
  editableHtml,
  fields,
  template.id
);

const editableFile =
  `mailcat-${template.id}.editable.html`;

await fs.writeFile(
  path.join(outputDir, editableFile),
  editableHtml,
  "utf8"
);
    const htmlFilename =
      `${template.id}.html`;

    const htmlPath =
      join(
        outputDirectory,
        htmlFilename,
      );

    await writeFile(
      htmlPath,
      html,
      "utf8",
    );

    manifest.push({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      tags: template.tags,
      featured:
        template.featured ?? false,
      editable:
        template.editable,
      html:
        htmlFilename,
      fields:
        template.fields,
      defaults,
    });

    console.log(
      `✓ ${htmlFilename}`,
    );
  }

  const manifestPath =
    join(
      outputDirectory,
      "templates.json",
    );

  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        version: 1,
        generatedAt:
          new Date().toISOString(),
        templates:
          manifest,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log("\n✓ templates.json");

  console.log(
    `\nBuilt ${manifest.length} templates.\n`,
  );
}

buildLibrary().catch(
  (error) => {
    console.error(
      "\nTemplate build failed:\n",
    );

    console.error(error);

    process.exit(1);
  },
);

/*
 * 2. EDITABLE HTML
 */

const {
  values: editableValues,
  sentinels
} =
  makeEditableValues(fields);

const renderedEditableHtml =
  await renderTemplate(
    template.id,
    editableValues,
  );

const editableHtml =
  convertSentinelsToMarkers(
    renderedEditableHtml,
    sentinels
  );

assertMarkersPresent(
  editableHtml,
  fields,
  template.id
);

const editableFile =
  `mailcat-${template.id}.editable.html`;

await fs.writeFile(
  path.join(outputDir, editableFile),
  editableHtml,
  "utf8"
);