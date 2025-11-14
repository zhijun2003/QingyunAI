<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <NMessageProvider>
      <NDialogProvider>
        <NNotificationProvider>
          <div class="h-screen flex flex-col bg-gray-50">
            <!-- 头部 -->
            <header class="bg-white shadow-sm border-b border-gray-200">
              <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                  <div class="flex items-center space-x-4">
                    <h1 class="text-2xl font-bold text-gray-900">清云AI - 管理后台</h1>
                    <NButton text @click="router.push('/')">
                      返回前台
                    </NButton>
                  </div>

                  <div class="flex items-center space-x-4">
                    <div class="text-sm text-gray-700">
                      <span>{{ userStore.user?.displayName || userStore.user?.username }}</span>
                      <NTag :type="userStore.user?.role === 'ADMIN' ? 'success' : 'default'" size="small" class="ml-2">
                        {{ userStore.user?.role === 'ADMIN' ? '管理员' : '普通用户' }}
                      </NTag>
                    </div>
                    <NButton @click="handleLogout">退出</NButton>
                  </div>
                </div>
              </div>
            </header>

            <div class="flex-1 flex overflow-hidden">
              <!-- 侧边栏 -->
              <aside class="w-64 bg-white border-r border-gray-200">
                <nav class="p-4 space-y-1">
                  <NButton
                    v-for="item in menuItems"
                    :key="item.path"
                    :type="isActive(item.path) ? 'primary' : 'default'"
                    :text="!isActive(item.path)"
                    block
                    class="justify-start"
                    @click="router.push(item.path)"
                  >
                    {{ item.label }}
                  </NButton>
                </nav>
              </aside>

              <!-- 主体内容 -->
              <main class="flex-1 overflow-y-auto">
                <slot />
              </main>
            </div>
          </div>
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider, NButton, NTag, useMessage } from 'naive-ui'
import { useUserStore } from '~/stores/user'

const themeOverrides = {
  common: {
    primaryColor: '#18a058',
    primaryColorHover: '#36ad6a',
    primaryColorPressed: '#0c7a43',
  },
}

const message = useMessage()
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 菜单项
const menuItems = [
  { label: '数据看板', path: '/admin/dashboard' },
  { label: 'Provider 管理', path: '/admin/providers' },
  { label: '模型管理', path: '/admin/models' },
  { label: '用户管理', path: '/admin/users' },
  { label: '交易管理', path: '/admin/transactions' },
  { label: '充值套餐', path: '/admin/recharge-packages' },
  { label: '应用管理', path: '/admin/applications' },
  { label: '系统配置', path: '/admin/system-config' },
  { label: '系统设置', path: '/admin/settings' },
]

// 检查菜单项是否激活
function isActive(path: string) {
  return route.path.startsWith(path)
}

// 退出登录
function handleLogout() {
  userStore.logout()
  message.success('已退出登录')
  router.push('/login')
}

// 权限检查
onMounted(() => {
  if (!userStore.isAdmin) {
    message.error('无权访问管理后台')
    router.push('/')
  }
})
</script>
