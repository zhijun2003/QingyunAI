<template>
  <div class="flex-1 overflow-y-auto bg-gray-50">
    <div class="max-w-4xl mx-auto p-6">
      <h1 class="text-2xl font-bold mb-6">个人设置</h1>

      <!-- 基本信息卡片 -->
      <NCard title="基本信息" class="mb-6">
        <NForm
          ref="infoFormRef"
          :model="infoForm"
          :rules="infoRules"
          label-placement="left"
          label-width="100"
        >
          <NFormItem label="用户名" path="username">
            <NInput
              v-model:value="infoForm.username"
              placeholder="请输入用户名"
            />
          </NFormItem>

          <NFormItem label="邮箱" path="email">
            <NInput
              v-model:value="infoForm.email"
              placeholder="请输入邮箱"
            />
          </NFormItem>

          <NFormItem label="手机号" path="phone">
            <NInput
              v-model:value="infoForm.phone"
              placeholder="请输入手机号"
            />
          </NFormItem>

          <NFormItem label="显示名称" path="displayName">
            <NInput
              v-model:value="infoForm.displayName"
              placeholder="请输入显示名称"
            />
          </NFormItem>

          <NFormItem>
            <NButton
              type="primary"
              :loading="savingInfo"
              @click="handleSaveInfo"
            >
              保存信息
            </NButton>
          </NFormItem>
        </NForm>
      </NCard>

      <!-- 账户信息卡片 -->
      <NCard title="账户信息" class="mb-6">
        <div class="space-y-4">
          <div class="flex justify-between items-center py-2 border-b">
            <span class="text-gray-600">用户角色</span>
            <NTag :type="userStore.user?.role === 'ADMIN' ? 'success' : 'info'">
              {{ userStore.user?.role === 'ADMIN' ? '管理员' : '普通用户' }}
            </NTag>
          </div>

          <div class="flex justify-between items-center py-2 border-b">
            <span class="text-gray-600">账户状态</span>
            <NTag :type="getStatusType(userStore.user?.status || 'ACTIVE')">
              {{ getStatusText(userStore.user?.status || 'ACTIVE') }}
            </NTag>
          </div>

          <div class="flex justify-between items-center py-2 border-b">
            <span class="text-gray-600">账户余额</span>
            <span class="text-lg font-semibold text-green-600">
              ¥{{ formatBalance(userStore.user?.balance || 0) }}
            </span>
          </div>

          <div class="flex justify-between items-center py-2">
            <span class="text-gray-600">免费额度</span>
            <span class="text-lg font-semibold text-blue-600">
              ¥{{ formatBalance(userStore.user?.freeQuota || 0) }}
            </span>
          </div>
        </div>
      </NCard>

      <!-- 修改密码卡片 -->
      <NCard title="修改密码" class="mb-6">
        <NForm
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordRules"
          label-placement="left"
          label-width="100"
        >
          <NFormItem label="当前密码" path="oldPassword">
            <NInput
              v-model:value="passwordForm.oldPassword"
              type="password"
              show-password-on="click"
              placeholder="请输入当前密码"
            />
          </NFormItem>

          <NFormItem label="新密码" path="newPassword">
            <NInput
              v-model:value="passwordForm.newPassword"
              type="password"
              show-password-on="click"
              placeholder="请输入新密码（至少6位）"
            />
          </NFormItem>

          <NFormItem label="确认密码" path="confirmPassword">
            <NInput
              v-model:value="passwordForm.confirmPassword"
              type="password"
              show-password-on="click"
              placeholder="请再次输入新密码"
            />
          </NFormItem>

          <NFormItem>
            <NButton
              type="primary"
              :loading="changingPassword"
              @click="handleChangePassword"
            >
              修改密码
            </NButton>
          </NFormItem>
        </NForm>
      </NCard>

      <!-- 危险操作 -->
      <NCard title="危险操作" class="mb-6">
        <NSpace vertical>
          <NAlert type="warning" title="警告">
            以下操作不可逆，请谨慎操作
          </NAlert>
          <NButton type="error" ghost @click="handleDeleteAccount">
            删除账号
          </NButton>
        </NSpace>
      </NCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSpace,
  NTag,
  type FormInst,
  type FormRules,
  useMessage,
  useDialog,
} from 'naive-ui'
import { useUserStore } from '~/stores/user'

definePageMeta({
  middleware: 'auth',
})

const message = useMessage()
const dialog = useDialog()
const userStore = useUserStore()
const router = useRouter()
const { put, post } = useApi()

// 表单引用
const infoFormRef = ref<FormInst | null>(null)
const passwordFormRef = ref<FormInst | null>(null)

// 加载状态
const savingInfo = ref(false)
const changingPassword = ref(false)

// 基本信息表单
const infoForm = reactive({
  username: '',
  email: '',
  phone: '',
  displayName: '',
})

// 密码表单
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// 基本信息验证规则
const infoRules: FormRules = {
  email: [
    {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: '请输入有效的邮箱地址',
      trigger: ['blur', 'input'],
    },
  ],
  phone: [
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入有效的手机号',
      trigger: ['blur', 'input'],
    },
  ],
}

// 密码验证规则
const passwordRules: FormRules = {
  oldPassword: [
    {
      required: true,
      message: '请输入当前密码',
      trigger: ['blur', 'input'],
    },
  ],
  newPassword: [
    {
      required: true,
      message: '请输入新密码',
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
      message: '请再次输入新密码',
      trigger: ['blur', 'input'],
    },
    {
      validator: (rule: any, value: string) => {
        if (value !== passwordForm.newPassword) {
          return new Error('两次输入的密码不一致')
        }
        return true
      },
      trigger: ['blur', 'input'],
    },
  ],
}

// 格式化余额
function formatBalance(balance: number): string {
  return (balance / 100).toFixed(2)
}

// 获取状态类型
function getStatusType(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'SUSPENDED':
      return 'warning'
    case 'BANNED':
      return 'error'
    default:
      return 'default'
  }
}

// 获取状态文本
function getStatusText(status: string) {
  switch (status) {
    case 'ACTIVE':
      return '正常'
    case 'SUSPENDED':
      return '已暂停'
    case 'BANNED':
      return '已封禁'
    default:
      return '未知'
  }
}

// 保存基本信息
async function handleSaveInfo() {
  if (savingInfo.value) return

  try {
    await infoFormRef.value?.validate()
    savingInfo.value = true

    const response = await put('/api/user/me', {
      username: infoForm.username || undefined,
      email: infoForm.email || undefined,
      phone: infoForm.phone || undefined,
      displayName: infoForm.displayName || undefined,
    })

    if (response.success) {
      message.success('保存成功')
      await userStore.fetchUserInfo()
    } else {
      message.error(response.message || '保存失败')
    }
  } catch (error) {
    console.error('Save info failed:', error)
  } finally {
    savingInfo.value = false
  }
}

// 修改密码
async function handleChangePassword() {
  if (changingPassword.value) return

  try {
    await passwordFormRef.value?.validate()
    changingPassword.value = true

    const response = await post('/api/user/change-password', {
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    })

    if (response.success) {
      message.success('密码修改成功，请重新登录')
      // 清空表单
      passwordForm.oldPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
      // 退出登录
      setTimeout(() => {
        userStore.logout()
        router.push('/login')
      }, 1500)
    } else {
      message.error(response.message || '密码修改失败')
    }
  } catch (error) {
    console.error('Change password failed:', error)
  } finally {
    changingPassword.value = false
  }
}

// 删除账号
function handleDeleteAccount() {
  dialog.warning({
    title: '确认删除账号',
    content: '此操作不可逆，删除后将无法恢复。确定要删除账号吗？',
    positiveText: '确定删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      const response = await post('/api/user/delete', {})
      if (response.success) {
        message.success('账号已删除')
        userStore.logout()
        router.push('/login')
      } else {
        message.error(response.message || '删除失败')
      }
    },
  })
}

// 初始化表单
onMounted(() => {
  if (userStore.user) {
    infoForm.username = userStore.user.username || ''
    infoForm.email = userStore.user.email || ''
    infoForm.phone = userStore.user.phone || ''
    infoForm.displayName = userStore.user.displayName || ''
  }
})
</script>

<style scoped>
.n-form {
  max-width: 500px;
}
</style>
