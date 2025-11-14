<template>
  <div class="p-6">
    <!-- 返回按钮 -->
    <NButton text class="mb-4" @click="router.push('/knowledge-bases')">
      <template #icon>
        <Icon name="carbon:arrow-left" />
      </template>
      返回知识库列表
    </NButton>

    <div v-if="loading" class="flex justify-center py-20">
      <NSpin size="large" />
    </div>

    <div v-else-if="!knowledgeBase" class="text-center py-20 text-gray-500">
      <Icon name="carbon:folder-off" class="text-6xl mb-4" />
      <p>知识库不存在</p>
    </div>

    <div v-else>
      <!-- 知识库信息 -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="flex items-start justify-between">
          <div class="flex items-center space-x-4">
            <Icon :name="knowledgeBase.icon || 'carbon:folder'" class="text-5xl text-blue-600" />
            <div>
              <div class="flex items-center space-x-2">
                <h1 class="text-3xl font-bold">{{ knowledgeBase.name }}</h1>
                <NTag :type="knowledgeBase.isActive ? 'success' : 'default'">
                  {{ knowledgeBase.isActive ? '启用' : '停用' }}
                </NTag>
              </div>
              <p class="text-gray-600 mt-2">{{ knowledgeBase.description || '暂无描述' }}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ knowledgeBase.documentCount }}</div>
            <div class="text-sm text-gray-600 mt-1">文档数量</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ knowledgeBase.chunkCount }}</div>
            <div class="text-sm text-gray-600 mt-1">分块数量</div>
          </div>
          <div class="text-center">
            <div class="text-sm text-gray-600">嵌入模型</div>
            <div class="mt-1 font-mono text-xs">{{ knowledgeBase.embeddingModel }}</div>
          </div>
          <div class="text-center">
            <div class="text-sm text-gray-600">创建时间</div>
            <div class="mt-1 text-sm">{{ formatDate(knowledgeBase.createdAt) }}</div>
          </div>
        </div>
      </div>

      <!-- 文档管理 -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">文档列表</h2>
          <NUpload
            :custom-request="handleUpload"
            :show-file-list="false"
            accept=".pdf,.doc,.docx,.txt,.md,.markdown,.xls,.xlsx,.csv"
          >
            <NButton type="primary" :loading="uploading">
              <template #icon>
                <Icon name="carbon:cloud-upload" />
              </template>
              上传文档
            </NButton>
          </NUpload>
        </div>

        <div v-if="!knowledgeBase.documents || knowledgeBase.documents.length === 0" class="text-center py-10 text-gray-500">
          <Icon name="carbon:document-blank" class="text-5xl mb-4" />
          <p>暂无文档，上传您的第一个文档吧！</p>
        </div>

        <NDataTable
          v-else
          :columns="columns"
          :data="knowledgeBase.documents"
          :pagination="false"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  NButton,
  NTag,
  NSpin,
  NUpload,
  NDataTable,
  NProgress,
  useMessage,
  useDialog,
  type UploadCustomRequestOptions,
  type DataTableColumns,
} from 'naive-ui'
import { h } from 'vue'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const api = useApi()

const knowledgeBaseId = route.params.id as string

// 状态
const loading = ref(false)
const uploading = ref(false)
const knowledgeBase = ref<any>(null)

// 表格列定义
const columns: DataTableColumns<any> = [
  {
    title: '文件名',
    key: 'filename',
    render: (row) => {
      return h('div', { class: 'flex items-center space-x-2' }, [
        h(Icon, { name: getFileIcon(row.fileType), class: 'text-lg' }),
        h('span', row.filename),
      ])
    },
  },
  {
    title: '大小',
    key: 'fileSize',
    render: (row) => formatFileSize(row.fileSize),
  },
  {
    title: '状态',
    key: 'parseStatus',
    render: (row) => {
      const statusMap: Record<string, { type: any; text: string }> = {
        pending: { type: 'default', text: '等待处理' },
        processing: { type: 'info', text: '处理中' },
        success: { type: 'success', text: '已完成' },
        failed: { type: 'error', text: '处理失败' },
      }
      const status = statusMap[row.parseStatus] || { type: 'default', text: '未知' }
      return h(NTag, { type: status.type, size: 'small' }, { default: () => status.text })
    },
  },
  {
    title: '分块数',
    key: 'chunkCount',
  },
  {
    title: '上传时间',
    key: 'createdAt',
    render: (row) => formatDate(row.createdAt),
  },
  {
    title: '操作',
    key: 'actions',
    render: (row) => {
      return h('div', { class: 'flex space-x-2' }, [
        h(
          NButton,
          {
            size: 'small',
            text: true,
            type: 'error',
            onClick: () => handleDeleteDocument(row),
          },
          { default: () => '删除' }
        ),
      ])
    },
  },
]

// 加载知识库详情
async function loadKnowledgeBase() {
  loading.value = true
  try {
    const { data } = await api.get(`/api/knowledge-bases/${knowledgeBaseId}`)
    knowledgeBase.value = data
  } catch (error: any) {
    message.error(error.message || '加载知识库详情失败')
    setTimeout(() => {
      router.push('/knowledge-bases')
    }, 2000)
  } finally {
    loading.value = false
  }
}

// 上传文档
async function handleUpload(options: UploadCustomRequestOptions) {
  const { file, onError, onFinish } = options

  if (!file.file) {
    onError()
    return
  }

  uploading.value = true

  try {
    const formData = new FormData()
    formData.append('file', file.file)

    const response = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || '上传失败')
    }

    message.success('文档上传成功，正在处理中...')
    onFinish()

    // 重新加载知识库详情
    setTimeout(() => {
      loadKnowledgeBase()
    }, 1000)
  } catch (error: any) {
    message.error(error.message || '上传失败')
    onError()
  } finally {
    uploading.value = false
  }
}

// 删除文档
function handleDeleteDocument(doc: any) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除文档"${doc.filename}"吗？删除后将无法恢复。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.request(`/api/knowledge-bases/${knowledgeBaseId}/documents/${doc.id}`, {
          method: 'DELETE',
        })
        message.success('文档删除成功')
        loadKnowledgeBase()
      } catch (error: any) {
        message.error(error.message || '删除失败')
      }
    },
  })
}

// 工具函数
function getFileIcon(fileType: string) {
  const iconMap: Record<string, string> = {
    pdf: 'carbon:document-pdf',
    doc: 'carbon:document-word-processor',
    docx: 'carbon:document-word-processor',
    xls: 'carbon:document-table',
    xlsx: 'carbon:document-table',
    csv: 'carbon:document-table',
    txt: 'carbon:document',
    md: 'carbon:document',
    markdown: 'carbon:document',
  }
  return iconMap[fileType.toLowerCase()] || 'carbon:document'
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 定时刷新（用于更新文档处理状态）
let refreshTimer: NodeJS.Timeout | null = null

onMounted(() => {
  loadKnowledgeBase()

  // 每5秒刷新一次
  refreshTimer = setInterval(() => {
    if (knowledgeBase.value) {
      const hasProcessing = knowledgeBase.value.documents?.some(
        (doc: any) => doc.parseStatus === 'processing' || doc.parseStatus === 'pending'
      )
      if (hasProcessing) {
        loadKnowledgeBase()
      }
    }
  }, 5000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>
