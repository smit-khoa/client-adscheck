<script setup lang="ts">
import { computed } from 'vue';
import { useAccountList } from '../composables/use-account-list';
import type { AdAccount } from '../types/account-list.types';
import { useAccountSelection } from '../composables/use-account-selection';
import { ToolPanel } from '../tools';

const { accounts } = useAccountList();
const { selectedIds } = useAccountSelection();

const selectedAccounts = computed<AdAccount[]>(() =>
  accounts.value.filter((account) => selectedIds.value.has(account.id))
);
</script>

<template>
  <ToolPanel :selected-accounts="selectedAccounts" />
</template>
