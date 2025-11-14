<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">应用管理</h2>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <NCard>
        <div class="text-center">
          <div class="text-sm text-gray-500 mb-2">总应用数</div>
          <div class="text-2xl font-bold">{{ stats.total }}</div>
        </div>
      </NCard>
      <NCard>
        <div class="text-center">
          <div class="text-sm text-gray-500 mb-2">已启用</div>
          <div class="text-2xl font-bold text-green-600">{{ stats.enabled }}</div>
        </div>
      </NCard>
      <NCard>
        <div class="text-center">
          <div class="text-sm text-gray-500 mb-2">核心应用</div>
          <div class="text-2xl font-bold text-blue-600">{{ stats.core }}</div>
        </div>
      </NCard>
      <NCard>
        <div class="text-center">
          <div class="text-sm text-gray-500 mb-2">插件应用</div>
          <div class="text-2xl font-bold text-purple-600">{{ stats.total - stats.core }}</div>
        </div>
      </NCard>
    </div>

    <!-- 分类标签页 -->
    <NCard>
      <NTabs v-model:value="activeCategory" type="line" animated>
        <NTabPane name="ALL" tab="全部">
          <NDataTable :columns="columns" :data="filteredApplications" :loading="loading" :pagination="false" />
        </NTabPane>
        <NTabPane name="CHAT" tab="对话类">
          <NDataTable :columns="columns" :data="filteredApplications" :loading="loading" :pagination="false" />
        </NTabPane>
        <NTabPane name="AGENT" tab="智能体">
          <NDataTable :columns="columns" :data="filteredApplications" :loading="loading" :pagination="false" />
        </NTabPane>
        <NTabPane name="GENERATION" tab="生成类">
          <NDataTable :columns="columns" :data="filteredApplications" :loading="loading" :pagination="false" />
        </NTabPane>
        <NTabPane name="KNOWLEDGE" tab="知识管理">
          <NDataTable :columns="columns" :data="filteredApplications" :loading="loading" :pagination="false" />
        </NTabPane>
        <NTabPane name="PRODUCTIVITY" tab="生产力">
          <NDataTable :columns="columns" :data="filteredApplications" :loading="loading" :pagination="false" />
        </NTabPane>
        <NTabPane name="ANALYSIS" tab="分析类">
          <NDataTable :columns="columns" :data="filteredApplications" :loading="loading" :pagination="false" />
        </NTabPane>
      </NTabs>
    </NCard>

    <!-- 编辑应用弹窗 -->
    <NModal v-model:show="showEditModal" preset="card" title="编辑应用" style="width: 600px">
      <NForm ref="formRef" :model="formData" label-placement="left" label-width="120">
        <NFormItem label="应用名称">
          <NInput v-model:value="formData.displayName" placeholder="应用显示名称" />
        </NFormItem>

        <NFormItem label="应用描述">
          <NInput
            v-model:value="formData.description"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="应用描述"
          />
        </NFormItem>

        <NFormItem label="菜单标签">
          <NInput v-model:value="formData.menuLabel" placeholder="侧边栏显示的菜单标签" />
        </NFormItem>

        <NFormItem label="菜单图标">
          <NInput v-model:value="formData.menuIcon" placeholder="图标名称，如: carbon:image" />
        </NFormItem>

        <NFormItem label="排序">
          <NInputNumber v-model:value="formData.sortOrder" :min="0" style="width: 100%" placeholder="排序值（越小越靠前）" />
        </NFormItem>

        <NFormItem label="状态">
          <NSpace>
            <NSwitch v-model:value="formData.isEnabled" :disabled="editingApp?.isCore">
              <template #checked>启用</template>
              <template #unchecked>禁用</template>
            </NSwitch>
            <NSwitch v-model:value="formData.isVisible">
              <template #checked>可见</template>
              <template #unchecked>隐藏</template>
            </NSwitch>
          </NSpace>
        </NFormItem>

        <NFormItem v-if="editingApp?.isCore" label="">
          <NAlert type="info" :bordered="false">
            核心应用无法禁用，确保系统基本功能正常运行
          </NAlert>
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <NButton @click="showEditModal = false">取消</NButton>
          <NButton type="primary" :loading="saving" @click="handleSave">
            保存
          </NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSpace,
  NSwitch,
  NTabs,
  NTabPane,
  NTag,
  NAlert,
  type DataTableColumns,
  useMessage,
} from 'naive-ui'
import { h } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const message = useMessage()
const { get, put, post } = useApi()

// 状态
const applications = ref<any[]>([])
const stats = ref({
  total: 0,
  enabled: 0,
  core: 0,
  byCategory: {} as Record<string, number>,
})
const loading = ref(false)
const activeCategory = ref('ALL')
const showEditModal = ref(false)
const saving = ref(false)
const editingApp = ref<any>(null)

// 表单数据
const formRef = ref(null)
const formData = reactive({
  displayName: '',
  description: '',
  menuLabel: '',
  menuIcon: '',
  sortOrder: 0,
  isEnabled: true,
  isVisible: true,
})

// 过滤后的应用列表
const filteredApplications = computed(() => {
  if (activeCategory.value === 'ALL') {
    return applications.value
  }
  return applications.value.filter(app => app.category === activeCategory.value)
})

// 表格列
const columns: DataTableColumns<any> = [
  {
    title: '应用名称',
    key: 'displayName',
    width: 150,
  },
  {
    title: '描述',
    key: 'description',
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: '类别',
    key: 'category',
    width: 100,
    render(row) {
      const categoryMap: Record<string, string> = {
        CHAT: '对话类',
        AGENT: '智能体',
        GENERATION: '生成类',
        KNOWLEDGE: '知识管理',
        PRODUCTIVITY: '生产力',
        ANALYSIS: '分析类',
        OTHER: '其他',
      }
      return categoryMap[row.category] || row.category
    },
  },
  {
    title: '类型',
    key: 'type',
    width: 80,
    render(row) {
      if (row.isCore) {
        return h(NTag, { type: 'success', size: 'small' }, { default: () => '核心' })
      }
      return h(NTag, { type: 'default', size: 'small' }, { default: () => '插件' })
    },
  },
  {
    title: '排序',
    key: 'sortOrder',
    width: 80,
  },
  {
    title: '状态',
    key: 'isEnabled',
    width: 80,
    render(row) {
      return h(
        NTag,
        { type: row.isEnabled ? 'success' : 'default' },
        { default: () => (row.isEnabled ? '启用' : '禁用') }
      )
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render(row) {
      return h('div', { class: 'flex space-x-2' }, [
        h(
          NButton,
          {
            size: 'small',
            onClick: () => handleEdit(row),
          },
          { default: () => '编辑' }
        ),
        h(
          NButton,
          {
            size: 'small',
            type: row.isEnabled ? 'warning' : 'success',
            disabled: row.isCore && row.isEnabled,
            onClick: () => handleToggle(row),
          },
          { default: () => (row.isEnabled ? '禁用' : '启用') }
        ),
      ])
    },
  },
]

// 加载应用列表
async function loadApplications() {
  loading.value = true
  try {
    const response = await get(`/api/admin/applications?category=${activeCategory.value}`)
    if (response.success) {
      applications.value = response.data.applications
      stats.value = response.data.stats
    } else {
      message.error(response.message || '加载失败')
    }
  } catch (error) {
    console.error('Load applications failed:', error)
    message.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 编辑应用
function handleEdit(app: any) {
  editingApp.value = app
  formData.displayName = app.displayName
  formData.description = app.description || ''
  formData.menuLabel = app.menuLabel
  formData.menuIcon = app.menuIcon || ''
  formData.sortOrder = app.sortOrder
  formData.isEnabled = app.isEnabled
  formData.isVisible = app.isVisible
  showEditModal.value = true
}

// 保存
async function handleSave() {
  if (saving.value) return

  try {
    saving.value = true

    const data = {
      displayName: formData.displayName,
      description: formData.description,
      menuLabel: formData.menuLabel,
      menuIcon: formData.menuIcon,
      sortOrder: formData.sortOrder,
      isEnabled: formData.isEnabled,
      isVisible: formData.isVisible,
    }

    const response = await put(`/api/admin/applications/${editingApp.value.id}`, data)

    if (response.success) {
      message.success('应用更新成功')
      showEditModal.value = false
      editingApp.value = null
      await loadApplications()
    } else {
      message.error(response.message || '保存失败')
    }
  } catch (error) {
    console.error('Save application failed:', error)
    message.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 切换启用状态
async function handleToggle(app: any) {
  if (app.isCore && app.isEnabled) {
    message.warning('核心应用不能禁用')
    return
  }

  try {
    const response = await post(`/api/admin/applications/${app.id}/toggle`, {})
    if (response.success) {
      message.success(response.message)
      await loadApplications()
    } else {
      message.error(response.message || '操作失败')
    }
  } catch (error) {
    console.error('Toggle application failed:', error)
    message.error('操作失败')
  }
}

// 监听分类切换
watch(activeCategory, () => {
  loadApplications()
})

// 初始化
onMounted(() => {
  loadApplications()
})
</script>
