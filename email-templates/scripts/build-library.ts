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

      description:
        template.description,

      category:
        template.category,

      tags:
        template.tags,

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