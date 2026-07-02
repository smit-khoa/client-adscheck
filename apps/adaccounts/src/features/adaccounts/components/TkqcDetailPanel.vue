<script setup lang="ts">
import { computed } from 'vue';
import { ToolDetailPanel } from '../tools';
import { useAccountList } from '../composables/use-account-list';
import { useAccountSelection } from '../composables/use-account-selection';
import type { AdAccount } from '../types/account-list.types';

const { accounts } = useAccountList();
const { selectedIds } = useAccountSelection();

const selectedAccounts = computed<AdAccount[]>(() =>
  accounts.value.filter((account) => selectedIds.value.has(account.id))
);
</script>

<template>
  <ToolDetailPanel :selected-accounts="selectedAccounts" />
</template>
