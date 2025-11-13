<template>
  <div class="flex-1 flex overflow-hidden">
    <!-- 对话列表侧边栏 -->
    <aside class="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div class="p-4 border-b border-gray-200">
        <NButton type="primary" block @click="handleNewChat">
          + 新建对话
        </NButton>
      </div>

      <div class="flex-1 overflow-y-auto p-2">
        <div
          v-for="conv in conversations"
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

        <div v-if="conversations.length === 0" class="text-center text-gray-400 mt-8">
          暂无对话历史
        </div>
      </div>
    </aside>

    <!-- 对话区域 -->
    <main class="flex-1 flex flex-col bg-gray-50">
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
                  ? 'bg-blue-500 text-white'
                  : 'bg-white shadow-sm border border-gray-200'
              "
            >
              <div class="whitespace-pre-wrap break-words">{{ msg.content }}</div>
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

// 初始化
onMounted(async () => {
  await Promise.all([loadConversations(), loadModels()])
})
</script>
