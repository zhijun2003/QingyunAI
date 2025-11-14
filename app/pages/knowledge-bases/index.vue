<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold">知识库管理</h2>
        <p class="text-gray-600 text-sm mt-1">管理您的知识库和文档</p>
      </div>
      <NButton type="primary" @click="showCreateModal = true">
        + 创建知识库
      </NButton>
    </div>

    <!-- 搜索和筛选 -->
    <div class="flex space-x-4 mb-4">
      <NInput
        v-model:value="searchKeyword"
        placeholder="搜索知识库名称或描述"
        clearable
        class="flex-1"
        @update:value="handleSearch"
      >
        <template #prefix>
          <Icon name="carbon:search" />
        </template>
      </NInput>
      <NSelect
        v-model:value="statusFilter"
        :options="statusOptions"
        style="width: 150px"
        @update:value="handleSearch"
      />
    </div>

    <!-- 知识库列表 -->
    <div v-if="loading" class="flex justify-center py-20">
      <NSpin size="large" />
    </div>

    <div v-else-if="knowledgeBases.length === 0" class="text-center py-20 text-gray-500">
      <Icon name="carbon:folder-off" class="text-6xl mb-4" />
      <p>暂无知识库，创建您的第一个知识库吧！</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <NCard
        v-for="kb in knowledgeBases"
        :key="kb.id"
        class="cursor-pointer hover:shadow-lg transition-shadow"
        @click="router.push(`/knowledge-bases/${kb.id}`)"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center space-x-2">
            <Icon :name="kb.icon || 'carbon:folder'" class="text-2xl text-blue-600" />
            <h3 class="font-semibold text-lg">{{ kb.name }}</h3>
          </div>
          <NTag :type="kb.isActive ? 'success' : 'default'" size="small">
            {{ kb.isActive ? '启用' : '停用' }}
          </NTag>
        </div>

        <p class="text-gray-600 text-sm mb-4 line-clamp-2">
          {{ kb.description || '暂无描述' }}
        </p>

        <div class="flex items-center justify-between text-sm text-gray-500">
          <div class="flex items-center space-x-4">
            <span>
              <Icon name="carbon:document" class="inline" />
              {{ kb.documentCount }} 个文档
            </span>
            <span>
              <Icon name="carbon:cube" class="inline" />
              {{ kb.chunkCount }} 个分块
            </span>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between">
          <span class="text-xs text-gray-400">
            {{ formatDate(kb.createdAt) }}
          </span>
          <div class="flex space-x-2" @click.stop>
            <NButton size="small" text @click="handleEdit(kb)">
              <Icon name="carbon:edit" />
            </NButton>
            <NButton size="small" text type="error" @click="handleDelete(kb)">
              <Icon name="carbon:trash-can" />
            </NButton>
          </div>
        </div>
      </NCard>
    </div>

    <!-- 分页 -->
    <div v-if="total > limit" class="mt-6 flex justify-center">
      <NPagination
        v-model:page="page"
        :page-count="Math.ceil(total / limit)"
        @update:page="handlePageChange"
      />
    </div>

    <!-- 创建/编辑知识库弹窗 -->
    <NModal
      v-model:show="showCreateModal"
      preset="card"
      :title="editingKb ? '编辑知识库' : '创建知识库'"
      style="width: 600px"
    >
      <NForm
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-placement="left"
        label-width="100"
      >
        <NFormItem label="名称" path="name">
          <NInput v-model:value="formData.name" placeholder="请输入知识库名称" />
        </NFormItem>

        <NFormItem label="描述" path="description">
          <NInput
            v-model:value="formData.description"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="请输入知识库描述"
          />
        </NFormItem>

        <NFormItem label="图标" path="icon">
          <NInput v-model:value="formData.icon" placeholder="carbon:folder (可选)" />
        </NFormItem>

        <NFormItem v-if="editingKb" label="状态" path="isActive">
          <NSwitch v-model:value="formData.isActive">
            <template #checked>启用</template>
            <template #unchecked>停用</template>
          </NSwitch>
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <NButton @click="showCreateModal = false">取消</NButton>
          <NButton type="primary" :loading="saving" @click="handleSave">
            {{ editingKb ? '保存' : '创建' }}
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
  NTag,
  NInput,
  NSelect,
  NSpin,
  NPagination,
  NModal,
  NForm,
  NFormItem,
  NSwitch,
  useMessage,
  useDialog,
} from 'naive-ui'

definePageMeta({
  middleware: 'auth',
})

const message = useMessage()
const dialog = useDialog()
const router = useRouter()
const api = useApi()

// 状态
const loading = ref(false)
const saving = ref(false)
const knowledgeBases = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(12)
const searchKeyword = ref('')
const statusFilter = ref<boolean | null>(null)

const showCreateModal = ref(false)
const editingKb = ref<any>(null)
const formRef = ref<any>(null)

const statusOptions = [
  { label: '全部', value: null },
  { label: '启用', value: true },
  { label: '停用', value: false },
]

const formData = ref({
  name: '',
  description: '',
  icon: 'carbon:folder',
  isActive: true,
})

const formRules = {
  name: [
    { required: true, message: '请输入知识库名称', trigger: 'blur' },
    { min: 1, max: 100, message: '名称长度在 1 到 100 个字符', trigger: 'blur' },
  ],
  description: [
    { max: 500, message: '描述不能超过 500 个字符', trigger: 'blur' },
  ],
}

// 加载知识库列表
async function loadKnowledgeBases() {
  loading.value = true
  try {
    const { data } = await api.get('/api/knowledge-bases', {
      params: {
        page: page.value,
        limit: limit.value,
        search: searchKeyword.value,
        isActive: statusFilter.value,
      },
    })
    knowledgeBases.value = data.list
    total.value = data.pagination.total
  } catch (error: any) {
    message.error(error.message || '加载知识库列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  page.value = 1
  loadKnowledgeBases()
}

// 翻页
function handlePageChange() {
  loadKnowledgeBases()
}

// 编辑
function handleEdit(kb: any) {
  editingKb.value = kb
  formData.value = {
    name: kb.name,
    description: kb.description || '',
    icon: kb.icon || 'carbon:folder',
    isActive: kb.isActive,
  }
  showCreateModal.value = true
}

// 保存
async function handleSave() {
  await formRef.value?.validate(async (errors: any) => {
    if (errors) return

    saving.value = true
    try {
      if (editingKb.value) {
        // 更新
        await api.request(`/api/knowledge-bases/${editingKb.value.id}`, {
          method: 'PUT',
          body: formData.value,
        })
        message.success('知识库更新成功')
      } else {
        // 创建
        await api.request('/api/knowledge-bases', {
          method: 'POST',
          body: formData.value,
        })
        message.success('知识库创建成功')
      }

      showCreateModal.value = false
      loadKnowledgeBases()
    } catch (error: any) {
      message.error(error.message || '操作失败')
    } finally {
      saving.value = false
    }
  })
}

// 删除
function handleDelete(kb: any) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除知识库"${kb.name}"吗？删除后将无法恢复，所有相关文档和数据也会被删除。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.request(`/api/knowledge-bases/${kb.id}`, {
          method: 'DELETE',
        })
        message.success('知识库删除成功')
        loadKnowledgeBases()
      } catch (error: any) {
        message.error(error.message || '删除失败')
      }
    },
  })
}

// 格式化日期
function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

// 监听弹窗关闭，重置表单
watch(showCreateModal, (newVal) => {
  if (!newVal) {
    editingKb.value = null
    formData.value = {
      name: '',
      description: '',
      icon: 'carbon:folder',
      isActive: true,
    }
  }
})

// 初始化
onMounted(() => {
  loadKnowledgeBases()
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
