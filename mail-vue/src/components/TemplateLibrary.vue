<script setup>
import { computed, onMounted, ref } from "vue";

const templates = ref([]);
const loading = ref(true);
const error = ref("");

const search = ref("");
const activeCategory = ref("All");

const selectedTemplate = ref(null);

const categories = computed(() => {
  const values = new Set(
    templates.value.map((template) => template.category)
  );

  return ["All", ...values];
});

const filteredTemplates = computed(() => {
  const query = search.value.trim().toLowerCase();

  return templates.value.filter((template) => {
    const matchesCategory =
      activeCategory.value === "All" ||
      template.category === activeCategory.value;

    if (!matchesCategory) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      template.name,
      template.description,
      template.category,
      ...(template.tags ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
});

function previewUrl(template) {
  return `/templates/${template.html}`;
}

function openTemplate(template) {
  selectedTemplate.value = template;
}

function closeTemplate() {
  selectedTemplate.value = null;
}

async function loadTemplates() {
  loading.value = true;
  error.value = "";

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      5000
    );

  try {
    const url =
      `/templates/templates.json?v=${Date.now()}`;

    console.log(
      "[Mail Cat] Loading templates:",
      url
    );

    const response =
      await fetch(
        url,
        {
          cache: "no-store",
          signal: controller.signal
        }
      );

    console.log(
      "[Mail Cat] Template response:",
      response.status,
      response.headers.get("content-type")
    );

    if (!response.ok) {
      throw new Error(
        `Template manifest HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    console.log(
      "[Mail Cat] Manifest:",
      data
    );

    templates.value =
      Array.isArray(data)
        ? data
        : Array.isArray(data.templates)
          ? data.templates
          : [];

    console.log(
      "[Mail Cat] Loaded templates:",
      templates.value.length
    );

    if (!templates.value.length) {
      throw new Error(
        "Template manifest contained no templates."
      );
    }

  } catch (err) {
    console.error(
      "[Mail Cat] Template loading failed:",
      err
    );

    if (err.name === "AbortError") {
      error.value =
        "Template loading timed out.";
    } else {
      error.value =
        `Mail Cat could not load the template library: ${err.message}`;
    }

  } finally {
    clearTimeout(timeout);
    loading.value = false;
  }
}

onMounted(() => {
  loadTemplates();
});






</script>

<template>
  <section class="template-library">
    <header class="library-header">
      <div>
        <p class="eyebrow">
          MAIL CAT
        </p>

        <h1>
          Template Library
        </h1>

        <p class="intro">
          Start with something good.
          Then make it yours.
        </p>
      </div>

      <div class="template-count">
        {{ filteredTemplates.length }}
        templates
      </div>
    </header>

    <div class="controls">
      <input
        v-model="search"
        class="search"
        type="search"
        placeholder="Search templates..."
      />

      <div class="categories">
        <button
          v-for="category in categories"
          :key="category"
          class="category-button"
          :class="{
            active:
              activeCategory === category
          }"
          type="button"
          @click="
            activeCategory = category
          "
        >
          {{ category }}
        </button>
      </div>
    </div>

    <div
      v-if="loading"
      class="state"
    >
      Loading templates…
    </div>

    <div
      v-else-if="error"
      class="state error"
    >
      {{ error }}
    </div>

    <div
      v-else
      class="template-grid"
    >
      <article
        v-for="template in filteredTemplates"
        :key="template.id"
        class="template-card"
      >
        <button
          class="preview-wrapper"
          type="button"
          @click="
            openTemplate(template)
          "
        >
          <iframe
            :src="
              previewUrl(template)
            "
            class="template-preview"
            tabindex="-1"
            loading="lazy"
          />

          <div class="preview-cover">
            <span>
              Preview
            </span>
          </div>
        </button>

        <div class="card-content">
          <div class="card-meta">
            <span class="category">
              {{ template.category }}
            </span>

            <span
              v-if="template.featured"
              class="featured"
            >
              Featured
            </span>
          </div>

          <h2>
            {{ template.name }}
          </h2>

          <p>
            {{ template.description }}
          </p>

          <div class="tags">
            <span
              v-for="tag in template.tags"
              :key="tag"
            >
              {{ tag }}
            </span>
          </div>

          <button
            class="open-button"
            type="button"
            @click="
              openTemplate(template)
            "
          >
            Open template
            <span>→</span>
          </button>
        </div>
      </article>
    </div>

    <Teleport to="body">
      <div
        v-if="selectedTemplate"
        class="modal-backdrop"
        @click.self="closeTemplate"
      >
        <div class="template-modal">
          <header class="modal-header">
            <div>
              <p class="eyebrow">
                {{
                  selectedTemplate.category
                }}
              </p>

              <h2>
                {{
                  selectedTemplate.name
                }}
              </h2>
            </div>

            <button
              class="close-button"
              type="button"
              @click="closeTemplate"
            >
              ×
            </button>
          </header>

          <div class="modal-body">
            <div class="full-preview">
              <iframe
                :src="
                  previewUrl(
                    selectedTemplate
                  )
                "
              />
            </div>

            <aside class="editor-placeholder">
              <p class="panel-label">
                EDIT
              </p>

              <h3>
                Customise template
              </h3>

              <p class="editor-intro">
                These controls are being
                generated directly from
                the template schema.
              </p>

              <div
                v-if="
                  selectedTemplate.fields
                    ?.length
                "
                class="field-list"
              >
                <div
                  v-for="field in selectedTemplate.fields"
                  :key="field.key"
                  class="field"
                >
                  <label>
                    {{ field.label }}
                  </label>

                  <textarea
                    v-if="
                      field.type ===
                      'textarea'
                    "
                    :value="
                      field.defaultValue
                    "
                    :maxlength="
                      field.maxLength
                    "
                    rows="4"
                  />

                  <input
                    v-else
                    :type="
                      field.type ===
                      'color'
                        ? 'color'
                        : field.type ===
                            'url'
                          ? 'url'
                          : 'text'
                    "
                    :value="
                      field.defaultValue
                    "
                    :maxlength="
                      field.maxLength
                    "
                  />

                  <small
                    v-if="
                      field.helpText
                    "
                  >
                    {{
                      field.helpText
                    }}
                  </small>
                </div>
              </div>

              <div
                v-else
                class="no-fields"
              >
                This template currently
                has no editable fields.
              </div>

              <button
                class="use-button"
                type="button"
              >
                Use this template
              </button>
            </aside>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.template-library {
  min-height: 100vh;
  padding: 48px;
  background: #f5f5f2;
  color: #111;
}

.library-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 42px;
}

.eyebrow {
  margin: 0 0 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #777;
}

.library-header h1 {
  margin: 0;
  font-size: clamp(42px, 6vw, 78px);
  line-height: 0.95;
  letter-spacing: -0.055em;
}

.intro {
  margin: 22px 0 0;
  max-width: 520px;
  font-size: 17px;
  line-height: 1.6;
  color: #666;
}

.template-count {
  padding-bottom: 8px;
  font-size: 13px;
  color: #888;
}

.controls {
  margin-bottom: 34px;
}

.search {
  width: 100%;
  padding: 18px 20px;
  margin-bottom: 18px;

  border: 1px solid #ddd;
  border-radius: 12px;

  background: white;

  font: inherit;
  font-size: 15px;
}

.categories {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-button {
  padding: 9px 15px;

  border: 1px solid #ddd;
  border-radius: 999px;

  background: transparent;
  color: #666;

  cursor: pointer;
}

.category-button.active {
  background: #111;
  border-color: #111;
  color: white;
}

.template-grid {
  display: grid;
  grid-template-columns:
    repeat(
      auto-fill,
      minmax(310px, 1fr)
    );

  gap: 22px;
}

.template-card {
  overflow: hidden;

  border: 1px solid #e4e4e0;
  border-radius: 18px;

  background: white;

  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

.template-card:hover {
  transform: translateY(-3px);

  box-shadow:
    0 18px 50px
    rgba(0, 0, 0, 0.08);
}

.preview-wrapper {
  position: relative;
  display: block;

  width: 100%;
  height: 330px;
  padding: 0;

  overflow: hidden;

  border: 0;

  background: #e8e8e5;

  cursor: pointer;
}

.template-preview {
  position: absolute;

  top: 0;
  left: 50%;

  width: 600px;
  height: 780px;

  border: 0;

  pointer-events: none;

  transform:
    translateX(-50%)
    scale(0.52);

  transform-origin: top center;
}

.preview-cover {
  position: absolute;
  inset: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  background:
    rgba(0, 0, 0, 0);

  color: transparent;

  transition:
    background 180ms ease,
    color 180ms ease;
}

.preview-wrapper:hover
.preview-cover {
  background:
    rgba(0, 0, 0, 0.55);

  color: white;
}

.preview-cover span {
  padding: 10px 16px;

  border: 1px solid
    rgba(255, 255, 255, 0.35);

  border-radius: 999px;

  font-size: 13px;
  font-weight: 600;
}

.card-content {
  padding: 22px;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;

  margin-bottom: 16px;
}

.category,
.featured {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #999;
}

.featured {
  color: #111;
}

.card-content h2 {
  margin: 0;

  font-size: 24px;
  letter-spacing: -0.04em;
}

.card-content > p {
  min-height: 44px;

  margin:
    10px 0 18px;

  color: #777;

  font-size: 14px;
  line-height: 1.55;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  margin-bottom: 20px;
}

.tags span {
  padding: 6px 9px;

  border-radius: 7px;

  background: #f3f3f0;

  font-size: 11px;
  color: #777;
}

.open-button {
  display: flex;
  justify-content: space-between;

  width: 100%;
  padding: 14px 0 0;

  border: 0;
  border-top: 1px solid #eee;

  background: transparent;

  font-weight: 600;

  cursor: pointer;
}

.state {
  padding: 60px 0;
  color: #777;
}

.error {
  color: #a00;
}

.modal-backdrop {
  position: fixed;
  z-index: 9999;
  inset: 0;

  padding: 24px;

  display: flex;
  align-items: center;
  justify-content: center;

  background:
    rgba(0, 0, 0, 0.75);

  backdrop-filter: blur(12px);
}

.template-modal {
  width: min(1500px, 100%);
  height: min(900px, 94vh);

  overflow: hidden;

  border-radius: 18px;

  background: #f4f4f1;

  box-shadow:
    0 40px 120px
    rgba(0, 0, 0, 0.45);
}

.modal-header {
  height: 82px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 0 26px;

  border-bottom: 1px solid #ddd;
  background: white;
}

.modal-header .eyebrow {
  margin-bottom: 4px;
}

.modal-header h2 {
  margin: 0;

  font-size: 21px;
}

.close-button {
  width: 42px;
  height: 42px;

  border: 0;
  border-radius: 50%;

  background: #f1f1ee;

  font-size: 28px;
  line-height: 1;

  cursor: pointer;
}

.modal-body {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    390px;

  height: calc(100% - 82px);
}

.full-preview {
  overflow: auto;

  display: flex;
  justify-content: center;

  padding: 40px;

  background: #deded9;
}

.full-preview iframe {
  width: 600px;
  min-height: 900px;

  border: 0;

  background: white;

  box-shadow:
    0 12px 50px
    rgba(0, 0, 0, 0.12);
}

.editor-placeholder {
  overflow-y: auto;

  padding: 28px;

  border-left: 1px solid #ddd;

  background: white;
}

.panel-label {
  margin: 0 0 10px;

  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;

  color: #999;
}

.editor-placeholder h3 {
  margin: 0;

  font-size: 27px;
  letter-spacing: -0.04em;
}

.editor-intro {
  margin: 10px 0 30px;

  color: #777;

  font-size: 13px;
  line-height: 1.6;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field label {
  display: block;

  margin-bottom: 7px;

  font-size: 12px;
  font-weight: 600;

  color: #444;
}

.field input,
.field textarea {
  box-sizing: border-box;

  width: 100%;
  padding: 12px;

  border: 1px solid #ddd;
  border-radius: 9px;

  background: #fafafa;

  font: inherit;
  font-size: 14px;
}

.field input[type="color"] {
  height: 48px;
  padding: 6px;
}

.field small {
  display: block;

  margin-top: 6px;

  color: #999;
}

.no-fields {
  padding: 20px;

  border-radius: 10px;

  background: #f5f5f2;

  color: #777;

  font-size: 13px;
}

.use-button {
  width: 100%;

  margin-top: 28px;
  padding: 16px;

  border: 0;
  border-radius: 10px;

  background: #111;
  color: white;

  font-weight: 700;

  cursor: pointer;
}

@media (
  max-width: 900px
) {
  .template-library {
    padding: 24px;
  }

  .library-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .modal-body {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .full-preview {
    min-height: 600px;
  }

  .editor-placeholder {
    border-left: 0;
    border-top: 1px solid #ddd;
  }
}
</style>