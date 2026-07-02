<script setup lang="ts">
// Standalone entry: renders the component showcase directly so the shared UI can
// be reviewed in isolation. Inside the host, the shell mounts this remote's child
// routes (./routes) into RemoteHost's <router-view> instead.
import ComponentShowcasePage from './pages/ComponentShowcasePage.vue';
</script>

<template>
  <ComponentShowcasePage />
</template>
