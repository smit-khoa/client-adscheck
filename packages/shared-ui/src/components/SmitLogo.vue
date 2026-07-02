<script setup lang="ts">
import { useId } from "vue";
import { cn } from "../lib/utils";

const props = withDefaults(
  defineProps<{
    width?: number | string;
    height?: number | string;
    class?: string;
  }>(),
  { width: 31, height: 24 }
);

const uid = useId().replace(/:/g, "");
const clip_id = `smit-logo-clip-${uid}`;
const g0_id = `smit-logo-g0-${uid}`;
const g1_id = `smit-logo-g1-${uid}`;
</script>

<template>
  <svg
    :width="props.width"
    :height="props.height"
    viewBox="0 0 31 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :class="cn(props.class)"
  >
    <g :clip-path="`url(#${clip_id})`">
      <path
        d="M6.56466 13.1373C6.56466 13.1373 13.9812 15.8051 18.6028 9.53764L15.4947 4.53853V0L21.6687 10.2817C21.6687 10.2817 12.9322 24 0 24L6.56466 13.1373Z"
        :fill="`url(#${g0_id})`"
      />
      <path
        d="M24.4353 13.1373C24.4353 13.1373 17.0189 15.8051 12.3972 9.53764L15.5053 4.53853V0L9.33133 10.2817C9.33133 10.2817 18.0678 24 31 24L24.4353 13.1373Z"
        :fill="`url(#${g1_id})`"
      />
    </g>
    <defs>
      <linearGradient
        :id="g0_id"
        x1="-4.63926"
        y1="24.3189"
        x2="25.8214"
        y2="1.00342"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#39E7E4" />
        <stop offset="0.07" stop-color="#57E9C7" />
        <stop offset="0.14" stop-color="#6CEBB2" />
        <stop offset="0.2" stop-color="#79ECA6" />
        <stop offset="0.26" stop-color="#7EEDA2" />
        <stop offset="0.54" stop-color="#93F197" stop-opacity="0.2" />
        <stop offset="0.57" stop-color="#94F196" stop-opacity="0.24" />
        <stop offset="0.63" stop-color="#97F194" stop-opacity="0.36" />
        <stop offset="0.71" stop-color="#9DF291" stop-opacity="0.55" />
        <stop offset="0.81" stop-color="#A4F48D" stop-opacity="0.81" />
        <stop offset="0.88" stop-color="#AAF58B" />
        <stop offset="0.93" stop-color="#D4FD73" />
      </linearGradient>
      <linearGradient
        :id="g1_id"
        x1="9.33133"
        y1="12"
        x2="31"
        y2="12"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#35E7E9" />
        <stop offset="0.45" stop-color="#7EEDA2" />
        <stop offset="0.93" stop-color="#D4FD73" />
      </linearGradient>
      <clipPath :id="clip_id">
        <rect width="31" height="24" fill="white" />
      </clipPath>
    </defs>
  </svg>
</template>
