<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- 头部 -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <h1 class="text-2xl font-bold text-gray-900">清云AI</h1>
          </div>

          <div class="flex items-center space-x-4">
            <NButton v-if="!userStore.isLoggedIn" @click="router.push('/login')">
              登录
            </NButton>
            <template v-else>
              <div class="text-sm text-gray-700">
                <span>{{ userStore.user?.displayName || userStore.user?.username }}</span>
                <span class="ml-2 text-green-600">余额: ¥{{ formatBalance(userStore.user?.balance || 0) }}</span>
              </div>
              <NButton @click="handleLogout">退出</NButton>
            </template>
          </div>
        </div>
      </div>
    </header>

    <!-- 主体内容 -->
    <div class="flex-1 flex overflow-hidden">
      <NuxtPage />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { useUserStore } from '~/stores/user'

const message = useMessage()
const router = useRouter()
const userStore = useUserStore()

// 格式化余额
function formatBalance(balance: number): string {
  return (balance / 100).toFixed(2)
}

// 退出登录
function handleLogout() {
  userStore.logout()
  message.success('已退出登录')
  router.push('/login')
}

// 检查登录状态
onMounted(async () => {
  if (userStore.isLoggedIn) {
    await userStore.fetchUserInfo()
  }
})
</script>
