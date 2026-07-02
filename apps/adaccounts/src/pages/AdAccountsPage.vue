<script setup lang="ts">
import { Toaster } from '@mf2/shared-ui/sonner';
import { AdAccountsWorkspace } from '../features/workspace';
// Federated chunk carries Tailwind utilities (no preflight) so classes render
// correctly when this page is mounted inside the host.
import '../remote-styles.css';
</script>

<template>
  <AdAccountsWorkspace />

  <!-- Single toast outlet for the remote (tool results, FB errors). -->
  <Toaster position="bottom-center" rich-colors />
</template>
