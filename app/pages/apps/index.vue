<template>
  <div class="max-w-7xl mx-auto p-6">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">应用中心</h1>
      <p class="text-gray-600">探索并使用各种AI应用，提升工作效率</p>
    </div>

    <!-- 分类过滤 -->
    <div class="mb-6">
      <NSpace>
        <NButton
          :type="activeCategory === 'ALL' ? 'primary' : 'default'"
          @click="activeCategory = 'ALL'"
        >
          全部
        </NButton>
        <NButton
          v-for="cat in categories"
          :key="cat.value"
          :type="activeCategory === cat.value ? 'primary' : 'default'"
          @click="activeCategory = cat.value"
        >
          {{ cat.label }}
        </NButton>
      </NSpace>
    </div>

    <!-- 加载状态 -->
    <div v-if="applicationStore.loading" class="flex justify-center items-center py-20">
      <NSpin size="large" />
    </div>

    <!-- 应用网格 -->
    <div v-else-if="filteredApps.length > 0" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <NCard
        v-for="app in filteredApps"
        :key="app.key"
        hoverable
        class="cursor-pointer transition-all hover:shadow-lg"
        @click="handleOpenApp(app)"
      >
        <div class="flex flex-col items-center text-center">
          <!-- 图标 -->
          <div class="mb-4 text-5xl">
            <Icon v-if="app.icon" :name="app.icon" class="text-primary" />
            <span v-else class="text-gray-400">📦</span>
          </div>

          <!-- 应用名称 -->
          <h3 class="text-lg font-bold text-gray-900 mb-2">{{ app.displayName }}</h3>

          <!-- 应用描述 -->
          <p class="text-sm text-gray-600 mb-4 line-clamp-2">{{ app.description }}</p>

          <!-- 标签 -->
          <div v-if="app.tags && app.tags.length > 0" class="flex flex-wrap gap-1 justify-center">
            <NTag
              v-for="tag in app.tags.slice(0, 3)"
              :key="tag"
              size="small"
              :bordered="false"
            >
              {{ tag }}
            </NTag>
          </div>

          <!-- 核心应用标识 -->
          <div v-if="app.isCore" class="mt-3">
            <NTag type="success" size="small" :bordered="false">
              核心应用
            </NTag>
          </div>
        </div>
      </NCard>
    </div>

    <!-- 空状态 -->
    <NEmpty v-else description="暂无可用应用" class="py-20">
      <template #extra>
        <NButton @click="applicationStore.fetchApplications()">
          刷新
        </NButton>
      </template>
    </NEmpty>

    <!-- 应用详情模态框 -->
    <NModal v-model:show="showDetailModal" preset="card" :title="selectedApp?.displayName" style="width: 600px">
      <div v-if="selectedApp" class="space-y-4">
        <div class="flex items-center space-x-4">
          <div class="text-5xl">
            <Icon v-if="selectedApp.icon" :name="selectedApp.icon" class="text-primary" />
            <span v-else class="text-gray-400">📦</span>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold">{{ selectedApp.displayName }}</h3>
            <p class="text-sm text-gray-600">{{ getCategoryLabel(selectedApp.category) }}</p>
          </div>
        </div>

        <NDivider />

        <div>
          <h4 class="font-semibold mb-2">应用描述</h4>
          <p class="text-gray-700">{{ selectedApp.description }}</p>
        </div>

        <div v-if="selectedApp.tags && selectedApp.tags.length > 0">
          <h4 class="font-semibold mb-2">标签</h4>
          <NSpace>
            <NTag v-for="tag in selectedApp.tags" :key="tag" :bordered="false">
              {{ tag }}
            </NTag>
          </NSpace>
        </div>

        <NDivider />

        <div class="flex justify-end space-x-2">
          <NButton @click="showDetailModal = false">取消</NButton>
          <NButton type="primary" @click="navigateToApp(selectedApp)">
            打开应用
          </NButton>
        </div>
      </div>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import {
  NButton,
  NCard,
  NEmpty,
  NModal,
  NSpace,
  NSpin,
  NTag,
  NDivider,
  useMessage,
} from 'naive-ui'
import { Icon } from '#components'
import { useApplicationStore } from '~/stores/applications'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const message = useMessage()
const router = useRouter()
const applicationStore = useApplicationStore()

// 状态
const activeCategory = ref('ALL')
const showDetailModal = ref(false)
const selectedApp = ref<any>(null)

// 分类列表
const categories = [
  { label: '对话类', value: 'CHAT' },
  { label: '智能体', value: 'AGENT' },
  { label: '生成类', value: 'GENERATION' },
  { label: '知识管理', value: 'KNOWLEDGE' },
  { label: '生产力', value: 'PRODUCTIVITY' },
  { label: '分析类', value: 'ANALYSIS' },
]

// 过滤后的应用列表
const filteredApps = computed(() => {
  if (activeCategory.value === 'ALL') {
    return applicationStore.allApps
  }
  return applicationStore.allApps.filter(app => app.category === activeCategory.value)
})

// 获取分类标签
function getCategoryLabel(category: string): string {
  const cat = categories.find(c => c.value === category)
  return cat ? cat.label : category
}

// 打开应用
function handleOpenApp(app: any) {
  // 如果是核心应用或知识库，直接跳转
  if (app.isCore || app.key === 'knowledge-base') {
    router.push(app.routePath)
  } else {
    // 其他应用显示详情
    selectedApp.value = app
    showDetailModal.value = true
  }
}

// 跳转到应用
function navigateToApp(app: any) {
  showDetailModal.value = false
  router.push(app.routePath)
}

// 初始化
onMounted(() => {
  if (applicationStore.allApps.length === 0) {
    applicationStore.fetchApplications()
  }
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
