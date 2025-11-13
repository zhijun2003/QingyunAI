<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h1 class="text-center text-3xl font-extrabold text-gray-900">
          清云AI
        </h1>
        <p class="mt-2 text-center text-sm text-gray-600">
          {{ isLogin ? '登录您的账号' : '创建新账号' }}
        </p>
      </div>

      <NCard class="mt-8">
        <NTabs v-model:value="activeTab" @update:value="handleTabChange">
          <NTabPane name="login" tab="登录">
            <NForm
              ref="loginFormRef"
              :model="loginForm"
              :rules="loginRules"
              size="large"
            >
              <NFormItem path="login" label="用户名/邮箱/手机号">
                <NInput
                  v-model:value="loginForm.login"
                  placeholder="请输入用户名、邮箱或手机号"
                  @keydown.enter="handleLogin"
                />
              </NFormItem>

              <NFormItem path="password" label="密码">
                <NInput
                  v-model:value="loginForm.password"
                  type="password"
                  show-password-on="click"
                  placeholder="请输入密码"
                  @keydown.enter="handleLogin"
                />
              </NFormItem>

              <NButton
                type="primary"
                size="large"
                block
                :loading="loading"
                @click="handleLogin"
              >
                登录
              </NButton>
            </NForm>
          </NTabPane>

          <NTabPane name="register" tab="注册">
            <NForm
              ref="registerFormRef"
              :model="registerForm"
              :rules="registerRules"
              size="large"
            >
              <NFormItem path="username" label="用户名">
                <NInput
                  v-model:value="registerForm.username"
                  placeholder="请输入用户名（可选）"
                />
              </NFormItem>

              <NFormItem path="email" label="邮箱">
                <NInput
                  v-model:value="registerForm.email"
                  placeholder="请输入邮箱（可选）"
                />
              </NFormItem>

              <NFormItem path="phone" label="手机号">
                <NInput
                  v-model:value="registerForm.phone"
                  placeholder="请输入手机号（可选）"
                />
              </NFormItem>

              <NFormItem path="password" label="密码">
                <NInput
                  v-model:value="registerForm.password"
                  type="password"
                  show-password-on="click"
                  placeholder="请输入密码（至少6位）"
                />
              </NFormItem>

              <NFormItem path="confirmPassword" label="确认密码">
                <NInput
                  v-model:value="registerForm.confirmPassword"
                  type="password"
                  show-password-on="click"
                  placeholder="请再次输入密码"
                  @keydown.enter="handleRegister"
                />
              </NFormItem>

              <NButton
                type="primary"
                size="large"
                block
                :loading="loading"
                @click="handleRegister"
              >
                注册
              </NButton>
            </NForm>
          </NTabPane>
        </NTabs>
      </NCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FormInst, FormRules, useMessage } from 'naive-ui'
import { useUserStore } from '~/stores/user'

definePageMeta({
  layout: false,
})

const message = useMessage()
const userStore = useUserStore()
const router = useRouter()

// 当前选项卡
const activeTab = ref<'login' | 'register'>('login')
const isLogin = computed(() => activeTab.value === 'login')

// 表单引用
const loginFormRef = ref<FormInst | null>(null)
const registerFormRef = ref<FormInst | null>(null)

// 加载状态
const loading = ref(false)

// 登录表单
const loginForm = reactive({
  login: '',
  password: '',
})

// 注册表单
const registerForm = reactive({
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
})

// 登录表单验证规则
const loginRules: FormRules = {
  login: [
    {
      required: true,
      message: '请输入用户名、邮箱或手机号',
      trigger: ['blur', 'input'],
    },
  ],
  password: [
    {
      required: true,
      message: '请输入密码',
      trigger: ['blur', 'input'],
    },
  ],
}

// 注册表单验证规则
const registerRules: FormRules = {
  password: [
    {
      required: true,
      message: '请输入密码',
      trigger: ['blur', 'input'],
    },
    {
      min: 6,
      message: '密码至少6位',
      trigger: ['blur', 'input'],
    },
  ],
  confirmPassword: [
    {
      required: true,
      message: '请再次输入密码',
      trigger: ['blur', 'input'],
    },
    {
      validator: (rule: any, value: string) => {
        if (value !== registerForm.password) {
          return new Error('两次输入的密码不一致')
        }
        return true
      },
      trigger: ['blur', 'input'],
    },
  ],
}

// 切换选项卡
function handleTabChange(tab: 'login' | 'register') {
  activeTab.value = tab
  // 清空表单
  loginForm.login = ''
  loginForm.password = ''
  registerForm.username = ''
  registerForm.email = ''
  registerForm.phone = ''
  registerForm.password = ''
  registerForm.confirmPassword = ''
}

// 处理登录
async function handleLogin() {
  if (loading.value) return

  try {
    await loginFormRef.value?.validate()
    loading.value = true

    const success = await userStore.login({
      login: loginForm.login,
      password: loginForm.password,
    })

    if (success) {
      message.success('登录成功')
      router.push('/')
    } else {
      message.error('登录失败，请检查用户名和密码')
    }
  } catch (error) {
    console.error('Login validation failed:', error)
  } finally {
    loading.value = false
  }
}

// 处理注册
async function handleRegister() {
  if (loading.value) return

  try {
    await registerFormRef.value?.validate()

    // 检查至少提供一种登录方式
    if (!registerForm.username && !registerForm.email && !registerForm.phone) {
      message.error('请至少提供用户名、邮箱或手机号中的一个')
      return
    }

    loading.value = true

    const success = await userStore.register({
      username: registerForm.username || undefined,
      email: registerForm.email || undefined,
      phone: registerForm.phone || undefined,
      password: registerForm.password,
    })

    if (success) {
      message.success('注册成功')
      router.push('/')
    } else {
      message.error('注册失败，请稍后重试')
    }
  } catch (error) {
    console.error('Register validation failed:', error)
  } finally {
    loading.value = false
  }
}

// 如果已登录，跳转到首页
onMounted(() => {
  if (userStore.isLoggedIn) {
    router.push('/')
  }
})
</script>

<style scoped>
.n-form {
  margin-top: 20px;
}
</style>
