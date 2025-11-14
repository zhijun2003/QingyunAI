<template>
  <div class="flex-1 flex overflow-hidden">
    <!-- 对话列表侧边栏 -->
    <aside class="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div class="p-4 border-b border-gray-200">
        <NButton type="primary" block @click="handleNewChat">
          + 新建对话
        </NButton>
      </div>

      <!-- 搜索框 -->
      <div class="p-4 border-b border-gray-200">
        <NInput
          v-model:value="searchQuery"
          placeholder="搜索对话..."
          clearable
          size="small"
        />
      </div>

      <div class="flex-1 overflow-y-auto p-2">
        <!-- 按时间分组显示对话 -->
        <template v-for="group in groupedConversations" :key="group.label">
          <div v-if="group.conversations.length > 0">
            <div class="px-3 py-2 text-xs text-gray-500 font-semibold">
              {{ group.label }}
            </div>
            <div
              v-for="conv in group.conversations"
              :key="conv.id"
              class="p-3 mb-2 rounded cursor-pointer hover:bg-gray-50 transition-colors"
              :class="{ 'bg-blue-50': currentConversationId === conv.id }"
              @click="handleSelectConversation(conv.id)"
            >
              <div class="font-medium text-sm truncate">{{ conv.title }}</div>
              <div class="text-xs text-gray-500 mt-1">
                {{ formatDate(conv.updatedAt) }}
              </div>
            </div>
          </div>
        </template>

        <div v-if="filteredConversations.length === 0" class="text-center text-gray-400 mt-8">
          {{ searchQuery ? '未找到匹配的对话' : '暂无对话历史' }}
        </div>
      </div>
    </aside>

    <!-- 对话区域 -->
    <main class="flex-1 flex flex-col bg-gray-50">
      <!-- 工具栏 -->
      <div
        v-if="messages.length > 0"
        class="border-b border-gray-200 bg-white px-4 py-2 flex items-center justify-between"
      >
        <div class="text-sm text-gray-600">
          {{ messages.length }} 条消息
        </div>
        <div class="flex items-center space-x-2">
          <NButton size="small" @click="handleCopyConversation">
            复制对话
          </NButton>
          <NButton size="small" @click="handleExportMarkdown">
            导出 Markdown
          </NButton>
          <NButton size="small" @click="handleExportImage">
            导出图片
          </NButton>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <div v-if="messages.length === 0" class="flex items-center justify-center h-full">
          <div class="text-center text-gray-400">
            <p class="text-lg mb-2">开始新对话</p>
            <p class="text-sm">选择模型并发送消息</p>
          </div>
        </div>

        <div v-else class="max-w-4xl mx-auto space-y-4">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="flex"
            :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[80%] px-4 py-3 rounded-lg"
              :class="
                msg.role === 'user'
                  ? 'bg-blue-500 text-white user-message'
                  : 'bg-white shadow-sm border border-gray-200'
              "
            >
              <!-- 用户消息使用简单文本，AI消息使用 Markdown 渲染 -->
              <div v-if="msg.role === 'user'" class="whitespace-pre-wrap break-words">
                {{ msg.content }}
              </div>
              <MessageContent v-else :content="msg.content" />

              <div
                class="text-xs mt-2 opacity-70"
                :class="msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'"
              >
                <span v-if="msg.inputTokens || msg.outputTokens">
                  Token: {{ msg.inputTokens + msg.outputTokens }}
                </span>
                <span v-if="msg.cost" class="ml-2">
                  费用: ¥{{ (msg.cost / 100).toFixed(4) }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="isLoading" class="flex justify-start">
            <div class="max-w-[80%] px-4 py-3 rounded-lg bg-white shadow-sm border border-gray-200">
              <NSpin size="small" />
              <span class="ml-2 text-gray-500">AI 正在思考...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="border-t border-gray-200 bg-white p-4">
        <div class="max-w-4xl mx-auto">
          <div class="flex items-center space-x-2 mb-2">
            <span class="text-sm text-gray-600">模型:</span>
            <NButton size="tiny" @click="showModelSelector = true">
              {{ selectedModel?.displayName || '选择模型' }}
            </NButton>
          </div>

          <div class="flex space-x-2">
            <NInput
              v-model:value="inputMessage"
              type="textarea"
              placeholder="输入消息..."
              :autosize="{ minRows: 1, maxRows: 5 }"
              :disabled="!selectedModel || isLoading"
              @keydown.enter.prevent="handleSend"
            />
            <NButton
              type="primary"
              :disabled="!inputMessage.trim() || !selectedModel || isLoading"
              :loading="isLoading"
              @click="handleSend"
            >
              发送
            </NButton>
          </div>
        </div>
      </div>
    </main>

    <!-- 模型选择器弹窗 -->
    <NModal v-model:show="showModelSelector" preset="card" title="选择模型" style="width: 600px">
      <div class="space-y-2">
        <div
          v-for="model in availableModels"
          :key="model.id"
          class="p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
          :class="{ 'border-blue-500 bg-blue-50': selectedModel?.id === model.id }"
          @click="handleSelectModel(model)"
        >
          <div class="font-medium">{{ model.displayName }}</div>
          <div class="text-sm text-gray-600 mt-1">
            {{ model.provider.displayName }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            <span v-if="model.inputPrice">
              输入: ¥{{ (model.inputPrice / 100).toFixed(4) }}/1K
            </span>
            <span v-if="model.outputPrice" class="ml-2">
              输出: ¥{{ (model.outputPrice / 100).toFixed(4) }}/1K
            </span>
          </div>
        </div>

        <div v-if="availableModels.length === 0" class="text-center text-gray-400 py-8">
          暂无可用模型
        </div>
      </div>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { useUserStore } from '~/stores/user'
import html2canvas from 'html2canvas'

definePageMeta({
  middleware: 'auth',
})

const message = useMessage()
const userStore = useUserStore()
const { get, post } = useApi()

// 状态
const conversations = ref<any[]>([])
const currentConversationId = ref<string | null>(null)
const messages = ref<any[]>([])
const inputMessage = ref('')
const isLoading = ref(false)
const showModelSelector = ref(false)
const selectedModel = ref<any>(null)
const availableModels = ref<any[]>([])
const searchQuery = ref('')

// 格式化日期
function formatDate(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return d.toLocaleDateString('zh-CN')
  }
}

// 搜索过滤对话
const filteredConversations = computed(() => {
  if (!searchQuery.value.trim()) {
    return conversations.value
  }
  const query = searchQuery.value.toLowerCase()
  return conversations.value.filter((conv) =>
    conv.title.toLowerCase().includes(query)
  )
})

// 按时间分组对话
const groupedConversations = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const groups = {
    today: { label: '今天', conversations: [] as any[] },
    yesterday: { label: '昨天', conversations: [] as any[] },
    thisWeek: { label: '最近 7 天', conversations: [] as any[] },
    thisMonth: { label: '最近 30 天', conversations: [] as any[] },
    older: { label: '更早', conversations: [] as any[] },
  }

  filteredConversations.value.forEach((conv) => {
    const convDate = new Date(conv.updatedAt)
    if (convDate >= today) {
      groups.today.conversations.push(conv)
    } else if (convDate >= yesterday) {
      groups.yesterday.conversations.push(conv)
    } else if (convDate >= weekAgo) {
      groups.thisWeek.conversations.push(conv)
    } else if (convDate >= monthAgo) {
      groups.thisMonth.conversations.push(conv)
    } else {
      groups.older.conversations.push(conv)
    }
  })

  return Object.values(groups)
})

// 加载对话列表
async function loadConversations() {
  const response = await get('/api/chat/conversations')
  if (response.success) {
    conversations.value = response.data || []
  }
}

// 加载可用模型
async function loadModels() {
  const response = await get('/api/admin/models', { isActive: true })
  if (response.success) {
    availableModels.value = response.data?.models || []
  }
}

// 创建新对话
async function handleNewChat() {
  if (!selectedModel.value) {
    message.warning('请先选择模型')
    showModelSelector.value = true
    return
  }

  const response = await post('/api/chat/conversations', {
    modelId: selectedModel.value.id,
  })

  if (response.success) {
    currentConversationId.value = response.data.id
    messages.value = []
    await loadConversations()
  }
}

// 选择对话
async function handleSelectConversation(id: string) {
  currentConversationId.value = id
  await loadMessages()
}

// 加载消息历史
async function loadMessages() {
  if (!currentConversationId.value) return

  const response = await get(`/api/chat/conversations/${currentConversationId.value}/messages`)
  if (response.success) {
    messages.value = response.data || []
  }
}

// 选择模型
function handleSelectModel(model: any) {
  selectedModel.value = model
  showModelSelector.value = false
}

// 发送消息
async function handleSend() {
  if (!inputMessage.value.trim() || !selectedModel.value || isLoading.value) return

  // 如果没有当前对话，先创建
  if (!currentConversationId.value) {
    await handleNewChat()
    if (!currentConversationId.value) return
  }

  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''

  // 添加用户消息到界面
  messages.value.push({
    id: Date.now().toString(),
    role: 'user',
    content: userMessage,
  })

  isLoading.value = true

  try {
    const response = await post('/api/chat/send', {
      conversationId: currentConversationId.value,
      content: userMessage,
    })

    if (response.success) {
      messages.value.push(response.data.reply)
      await userStore.fetchUserInfo() // 更新余额
      await loadConversations() // 更新对话列表
    } else {
      message.error(response.message || '发送失败')
    }
  } catch (error) {
    message.error('发送失败，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

// 复制对话内容
async function handleCopyConversation() {
  try {
    const text = messages.value
      .map((msg) => {
        const role = msg.role === 'user' ? '用户' : 'AI'
        return `${role}:\n${msg.content}\n`
      })
      .join('\n---\n\n')

    await navigator.clipboard.writeText(text)
    message.success('对话内容已复制到剪贴板')
  } catch (err) {
    console.error('Copy failed:', err)
    message.error('复制失败')
  }
}

// 导出 Markdown
function handleExportMarkdown() {
  try {
    const currentConv = conversations.value.find(
      (c) => c.id === currentConversationId.value
    )
    const title = currentConv?.title || '对话记录'

    let markdown = `# ${title}\n\n`
    markdown += `> 导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`
    markdown += `---\n\n`

    messages.value.forEach((msg) => {
      const role = msg.role === 'user' ? '**用户**' : '**AI**'
      markdown += `### ${role}\n\n`
      markdown += `${msg.content}\n\n`

      if (msg.inputTokens || msg.outputTokens || msg.cost) {
        markdown += `<details>\n<summary>统计信息</summary>\n\n`
        if (msg.inputTokens || msg.outputTokens) {
          markdown += `- Tokens: ${msg.inputTokens + msg.outputTokens}\n`
        }
        if (msg.cost) {
          markdown += `- 费用: ¥${(msg.cost / 100).toFixed(4)}\n`
        }
        markdown += `\n</details>\n\n`
      }

      markdown += `---\n\n`
    })

    // 创建下载链接
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}-${new Date().getTime()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    message.success('Markdown 文件已导出')
  } catch (err) {
    console.error('Export failed:', err)
    message.error('导出失败')
  }
}

// 导出图片
async function handleExportImage() {
  try {
    message.info('正在生成图片，请稍候...')

    // 找到消息容器
    const messagesContainer = document.querySelector('.max-w-4xl.mx-auto.space-y-4')
    if (!messagesContainer) {
      message.error('未找到对话内容')
      return
    }

    // 使用 html2canvas 截图
    const canvas = await html2canvas(messagesContainer as HTMLElement, {
      backgroundColor: '#f9fafb',
      scale: 2, // 提高清晰度
      logging: false,
    })

    // 转换为图片并下载
    canvas.toBlob((blob) => {
      if (!blob) {
        message.error('图片生成失败')
        return
      }

      const currentConv = conversations.value.find(
        (c) => c.id === currentConversationId.value
      )
      const title = currentConv?.title || '对话记录'

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}-${new Date().getTime()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      message.success('图片已导出')
    })
  } catch (err) {
    console.error('Export image failed:', err)
    message.error('图片导出失败')
  }
}

// 初始化
onMounted(async () => {
  await Promise.all([loadConversations(), loadModels()])
})
</script>

<style scoped>
/* 用户消息中的 Markdown 样式需要白色文本 */
:deep(.user-message .markdown-body) {
  color: white;
}

:deep(.user-message .markdown-body a) {
  color: #a8d8ff;
}

:deep(.user-message .markdown-body code) {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}
</style>
