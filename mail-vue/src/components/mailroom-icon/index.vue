<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path v-for="(path, index) in paths[name] || paths.mail" :key="index" :d="path" />
  </svg>
</template>
<script setup>
defineProps({ name: { type: String, default: 'mail' } });
const paths = {
  mail: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'm2 6 10 7L22 6'],
  folder: ['M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z'],
  copy: ['M9 9h11v11H9Z', 'M5 15H3V3h12v2'],
  settings: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', 'M10 2h4l1 3 3 1 3-1 2 4-2 2v2l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-2L1 9l2-4 3 1 3-1 1-3Z'],
  plus: ['M12 5v14', 'M5 12h14'],
  refresh: ['M20 11a8 8 0 1 0-2 6', 'M20 4v7h-7'],
  pencil: ['m16 3 5 5-12 12-6 1 1-6L16 3Z', 'm13 6 5 5'],
  sun: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5'],
  moon: ['M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10Z'],
  notice: ['M3 9v6h5l12 5V4L8 9H3Z', 'm8 15 2 6H6l-2-6']
};
</script>
