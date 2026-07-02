<script setup lang="ts">
// Standalone entry: renders the page directly. Inside the host, the shell mounts
// this remote's child routes (./routes) into RemoteHost's <router-view> instead.
import AdAccountsPage from './pages/AdAccountsPage.vue';
</script>

<template>
  <AdAccountsPage />
</template>
