import {
  cp,
  mkdir,
  rm,
} from "node:fs/promises";

import {
  join,
} from "node:path";

const root = process.cwd();

const source = join(
  root,
  "output",
);

const destination = join(
  root,
  "..",
  "mail-vue",
  "public",
  "templates",
);

async function syncTemplateLibrary() {
  console.log("\nMail Cat Template Sync\n");

  await rm(destination, {
    recursive: true,
    force: true,
  });

  await mkdir(destination, {
    recursive: true,
  });

  await cp(
    source,
    destination,
    {
      recursive: true,
    },
  );

  console.log(
    `✓ Synced templates to:\n${destination}\n`,
  );
}

syncTemplateLibrary().catch(
  (error) => {
    console.error(
      "\nTemplate sync failed:\n",
    );

    console.error(error);

    process.exit(1);
  },
);