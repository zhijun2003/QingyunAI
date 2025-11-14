<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold">系统配置</h2>
        <p class="text-gray-600 text-sm mt-1">管理系统的各项配置参数</p>
      </div>
      <NButton
        type="primary"
        :loading="saving"
        :disabled="!hasChanges"
        @click="handleSave"
      >
        保存配置
      </NButton>
    </div>

    <NAlert v-if="hasChanges" type="warning" class="mb-4">
      <template #icon>
        <Icon name="carbon:warning" />
      </template>
      您有未保存的更改，请点击右上角"保存配置"按钮
    </NAlert>

    <div v-if="loading" class="flex justify-center items-center py-20">
      <NSpin size="large" />
    </div>

    <div v-else class="space-y-4">
      <NCollapse>
        <!-- 签到配置 -->
        <NCollapseItem name="checkin" title="签到设置">
          <template #header>
            <div class="flex items-center space-x-2">
              <Icon name="carbon:calendar" class="text-lg" />
              <span class="font-semibold">签到设置</span>
            </div>
          </template>
          <div class="grid grid-cols-2 gap-4">
            <ConfigItem
              v-for="config in getGroupConfigs('checkin')"
              :key="config.key"
              :config="config"
              @update="handleConfigUpdate"
            />
          </div>
        </NCollapseItem>

        <!-- 充值配置 -->
        <NCollapseItem name="recharge" title="充值设置">
          <template #header>
            <div class="flex items-center space-x-2">
              <Icon name="carbon:money" class="text-lg" />
              <span class="font-semibold">充值设置</span>
            </div>
          </template>
          <div class="grid grid-cols-2 gap-4">
            <ConfigItem
              v-for="config in getGroupConfigs('recharge')"
              :key="config.key"
              :config="config"
              @update="handleConfigUpdate"
            />
          </div>
        </NCollapseItem>

        <!-- 支付配置 -->
        <NCollapseItem name="payment" title="支付设置">
          <template #header>
            <div class="flex items-center space-x-2">
              <Icon name="carbon:purchase" class="text-lg" />
              <span class="font-semibold">支付设置</span>
            </div>
          </template>
          <div class="space-y-6">
            <!-- 支付宝 -->
            <div>
              <h3 class="font-semibold mb-3 text-blue-600">支付宝配置</h3>
              <div class="grid grid-cols-2 gap-4">
                <ConfigItem
                  v-for="config in getGroupConfigs('payment', 'alipay')"
                  :key="config.key"
                  :config="config"
                  @update="handleConfigUpdate"
                />
              </div>
            </div>

            <!-- 微信支付 -->
            <div>
              <h3 class="font-semibold mb-3 text-green-600">微信支付配置</h3>
              <div class="grid grid-cols-2 gap-4">
                <ConfigItem
                  v-for="config in getGroupConfigs('payment', 'wechat')"
                  :key="config.key"
                  :config="config"
                  @update="handleConfigUpdate"
                />
              </div>
            </div>
          </div>
        </NCollapseItem>

        <!-- 存储配置 -->
        <NCollapseItem name="storage" title="存储设置">
          <template #header>
            <div class="flex items-center space-x-2">
              <Icon name="carbon:data-base" class="text-lg" />
              <span class="font-semibold">存储设置</span>
            </div>
          </template>
          <div class="grid grid-cols-2 gap-4">
            <ConfigItem
              v-for="config in getGroupConfigs('storage')"
              :key="config.key"
              :config="config"
              @update="handleConfigUpdate"
            />
          </div>
        </NCollapseItem>

        <!-- 通用设置 -->
        <NCollapseItem name="general" title="通用设置">
          <template #header>
            <div class="flex items-center space-x-2">
              <Icon name="carbon:settings" class="text-lg" />
              <span class="font-semibold">通用设置</span>
            </div>
          </template>
          <div class="grid grid-cols-2 gap-4">
            <ConfigItem
              v-for="config in getGroupConfigs('general')"
              :key="config.key"
              :config="config"
              @update="handleConfigUpdate"
            />
          </div>
        </NCollapseItem>
      </NCollapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCollapse,
  NCollapseItem,
  NFormItem,
  NInput,
  NInputNumber,
  NSpin,
  NSwitch,
  useMessage,
} from 'naive-ui'
import { h } from 'vue'
import { Icon } from '#components'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const message = useMessage()
const { get, put } = useApi()

// 状态
const loading = ref(false)
const saving = ref(false)
const configs = ref<Record<string, any[]>>({})
const originalConfigs = ref<string>('')
const hasChanges = ref(false)

// 配置项组件
const ConfigItem = defineComponent({
  props: {
    config: {
      type: Object,
      required: true,
    },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const localValue = ref(props.config.value)

    // 监听本地值变化
    watch(localValue, (newValue) => {
      emit('update', { key: props.config.key, value: newValue })
    })

    // 根据类型渲染不同的输入控件
    const renderInput = () => {
      const { valueType, key, description } = props.config

      // 敏感字段（密钥类）使用密码输入
      const isSensitive = key.includes('key') || key.includes('secret')

      if (valueType === 'boolean') {
        return h(
          NSwitch,
          {
            value: localValue.value === 'true',
            onUpdateValue: (val: boolean) => {
              localValue.value = val ? 'true' : 'false'
            },
          }
        )
      }

      if (valueType === 'number') {
        return h(NInputNumber, {
          value: Number(localValue.value),
          onUpdateValue: (val: number | null) => {
            localValue.value = String(val || 0)
          },
          style: { width: '100%' },
        })
      }

      // 字符串类型
      return h(NInput, {
        value: localValue.value,
        type: isSensitive ? 'password' : 'text',
        placeholder: description || `请输入${key}`,
        showPasswordOn: isSensitive ? 'click' : undefined,
        onUpdateValue: (val: string) => {
          localValue.value = val
        },
      })
    }

    return () =>
      h(NFormItem, { label: props.config.description || props.config.key }, {
        default: renderInput,
      })
  },
})

// 获取分组配置
function getGroupConfigs(group: string, subPrefix?: string) {
  const groupConfigs = configs.value[group] || []
  if (!subPrefix) {
    return groupConfigs
  }
  return groupConfigs.filter((c) =>
    c.key.includes(`${group}.${subPrefix}`)
  )
}

// 处理配置更新
function handleConfigUpdate(update: { key: string; value: string }) {
  const allConfigs = Object.values(configs.value).flat()
  const config = allConfigs.find((c) => c.key === update.key)
  if (config) {
    config.value = update.value
    checkChanges()
  }
}

// 检查是否有更改
function checkChanges() {
  const currentConfigs = JSON.stringify(configs.value)
  hasChanges.value = currentConfigs !== originalConfigs.value
}

// 加载配置
async function loadConfigs() {
  loading.value = true
  try {
    const response = await get('/api/admin/config')
    if (response.success) {
      configs.value = response.data
      originalConfigs.value = JSON.stringify(configs.value)
    }
  } catch (error) {
    console.error('Load configs error:', error)
    message.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

// 保存配置
async function handleSave() {
  saving.value = true
  try {
    const allConfigs = Object.values(configs.value).flat()
    const response = await put('/api/admin/config', {
      configs: allConfigs.map((c) => ({ key: c.key, value: c.value })),
    })

    if (response.success) {
      message.success('配置保存成功')
      originalConfigs.value = JSON.stringify(configs.value)
      hasChanges.value = false
    } else {
      message.error(response.message || '保存配置失败')
    }
  } catch (error) {
    console.error('Save configs error:', error)
    message.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

// 初始化
onMounted(() => {
  loadConfigs()
})
</script>
