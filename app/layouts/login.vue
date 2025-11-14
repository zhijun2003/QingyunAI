<template>
  <NConfigProvider>
    <NMessageProvider>
      <slot />
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
</script>
