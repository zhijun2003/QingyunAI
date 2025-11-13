// ==========================================
// Naive UI 插件配置
// ==========================================
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import {
  create,
  NButton,
  NCard,
  NConfigProvider,
  NDialogProvider,
  NForm,
  NFormItem,
  NInput,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NLayoutSider,
  NLoadingBarProvider,
  NMenu,
  NMessageProvider,
  NModal,
  NNotificationProvider,
  NSpace,
  NSpin,
  NSwitch,
  NTab,
  NTabPane,
  NTabs,
} from 'naive-ui'

export default defineNuxtPlugin((nuxtApp) => {
  const naive = create({
    components: [
      NButton,
      NCard,
      NConfigProvider,
      NDialogProvider,
      NForm,
      NFormItem,
      NInput,
      NLayout,
      NLayoutHeader,
      NLayoutSider,
      NLayoutContent,
      NLoadingBarProvider,
      NMenu,
      NMessageProvider,
      NModal,
      NNotificationProvider,
      NSpace,
      NSpin,
      NSwitch,
      NTab,
      NTabPane,
      NTabs,
    ],
  })

  nuxtApp.vueApp.use(naive)
})
