<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">系统配置</h2>
      <NButton type="primary" @click="showAddModal = true">
        + 添加配置
      </NButton>
    </div>

    <!-- 配置分组 -->
    <NTabs v-model:value="currentGroup" type="line" animated>
      <NTabPane
        v-for="group in groups"
        :key="group.key"
        :name="group.key"
        :tab="group.label"
      >
        <NCard>
          <NDataTable
            :columns="columns"
            :data="groupedConfigs[group.key] || []"
            :pagination="false"
          />
        </NCard>
      </NTabPane>
    </NTabs>

    <!-- 编辑配置弹窗 -->
    <NModal
      v-model:show="showEditModal"
      preset="card"
      title="编辑配置"
      style="width: 600px"
    >
      <NForm
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-placement="left"
        label-width="120"
      >
        <NFormItem label="配置 Key" path="key">
          <NInput v-model:value="editForm.key" disabled />
        </NFormItem>

        <NFormItem label="配置值" path="value">
          <NInput
            v-if="editForm.valueType === 'string'"
            v-model:value="editForm.value"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 6 }"
            placeholder="请输入配置值"
          />
          <NInputNumber
            v-else-if="editForm.valueType === 'number'"
            v-model:value="editForm.value"
            style="width: 100%"
            placeholder="请输入数字"
          />
          <NSwitch
            v-else-if="editForm.valueType === 'boolean'"
            v-model:value="editForm.value"
          />
          <NInput
            v-else
            v-model:value="editForm.value"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 10 }"
            placeholder="请输入 JSON 格式的配置值"
          />
        </NFormItem>

        <NFormItem label="描述" path="description">
          <NInput
            v-model:value="editForm.description"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="请输入配置描述"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <NButton @click="showEditModal = false">取消</NButton>
          <NButton type="primary" :loading="saving" @click="handleSaveEdit">
            保存
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- 添加配置弹窗 -->
    <NModal
      v-model:show="showAddModal"
      preset="card"
      title="添加配置"
      style="width: 600px"
    >
      <NForm
        ref="addFormRef"
        :model="addForm"
        :rules="addRules"
        label-placement="left"
        label-width="120"
      >
        <NFormItem label="配置 Key" path="key">
          <NInput
            v-model:value="addForm.key"
            placeholder="例如: register_gift_amount"
          />
        </NFormItem>

        <NFormItem label="分组" path="group">
          <NSelect
            v-model:value="addForm.group"
            :options="groupOptions"
            placeholder="请选择分组"
          />
        </NFormItem>

        <NFormItem label="值类型" path="valueType">
          <NSelect
            v-model:value="addForm.valueType"
            :options="valueTypeOptions"
            placeholder="请选择值类型"
          />
        </NFormItem>

        <NFormItem label="配置值" path="value">
          <NInput
            v-if="addForm.valueType === 'string'"
            v-model:value="addForm.value"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 6 }"
            placeholder="请输入配置值"
          />
          <NInputNumber
            v-else-if="addForm.valueType === 'number'"
            v-model:value="addForm.value"
            style="width: 100%"
            placeholder="请输入数字"
          />
          <NSwitch
            v-else-if="addForm.valueType === 'boolean'"
            v-model:value="addForm.value"
          />
          <NInput
            v-else
            v-model:value="addForm.value"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 10 }"
            placeholder="请输入 JSON 格式的配置值"
          />
        </NFormItem>

        <NFormItem label="描述" path="description">
          <NInput
            v-model:value="addForm.description"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="请输入配置描述"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <NButton @click="showAddModal = false">取消</NButton>
          <NButton type="primary" :loading="saving" @click="handleSaveAdd">
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
  NSelect,
  NSwitch,
  NTabs,
  NTabPane,
  NTag,
  type DataTableColumns,
  type FormInst,
  type FormRules,
  useDialog,
  useMessage,
} from 'naive-ui'
import { h } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const message = useMessage()
const dialog = useDialog()
const { get, post, put, del } = useApi()

// 状态
const configs = ref<any[]>([])
const groupedConfigs = ref<Record<string, any[]>>({})
const currentGroup = ref('general')
const showEditModal = ref(false)
const showAddModal = ref(false)
const saving = ref(false)

// 表单引用
const editFormRef = ref<FormInst | null>(null)
const addFormRef = ref<FormInst | null>(null)

// 编辑表单
const editForm = reactive({
  key: '',
  value: '' as any,
  description: '',
  valueType: 'string',
})

// 添加表单
const addForm = reactive({
  key: '',
  value: '' as any,
  description: '',
  group: 'general',
  valueType: 'string',
})

// 分组列表
const groups = ref([
  { key: 'general', label: '常规设置' },
  { key: 'user', label: '用户设置' },
  { key: 'billing', label: '计费设置' },
  { key: 'feature', label: '功能开关' },
  { key: 'ai', label: 'AI 设置' },
])

// 分组选项
const groupOptions = groups.value.map((g) => ({
  label: g.label,
  value: g.key,
}))

// 值类型选项
const valueTypeOptions = [
  { label: '字符串', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '布尔值', value: 'boolean' },
  { label: 'JSON', value: 'json' },
]

// 表单验证规则
const editRules: FormRules = {
  value: [
    {
      required: true,
      message: '请输入配置值',
      trigger: ['blur', 'input'],
    },
  ],
}

const addRules: FormRules = {
  key: [
    {
      required: true,
      message: '请输入配置 Key',
      trigger: ['blur', 'input'],
    },
  ],
  group: [
    {
      required: true,
      message: '请选择分组',
      trigger: ['blur', 'change'],
    },
  ],
  valueType: [
    {
      required: true,
      message: '请选择值类型',
      trigger: ['blur', 'change'],
    },
  ],
  value: [
    {
      required: true,
      message: '请输入配置值',
      trigger: ['blur', 'input'],
    },
  ],
}

// 表格列
const columns: DataTableColumns<any> = [
  {
    title: '配置 Key',
    key: 'key',
    width: 250,
  },
  {
    title: '配置值',
    key: 'value',
    ellipsis: {
      tooltip: true,
    },
    render(row) {
      if (row.valueType === 'boolean') {
        return h(
          NTag,
          { type: row.value === 'true' ? 'success' : 'default' },
          { default: () => (row.value === 'true' ? '开启' : '关闭') }
        )
      }
      return row.value
    },
  },
  {
    title: '描述',
    key: 'description',
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: '更新时间',
    key: 'updatedAt',
    width: 180,
    render(row) {
      return new Date(row.updatedAt).toLocaleString('zh-CN')
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
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
            type: 'error',
            onClick: () => handleDelete(row),
          },
          { default: () => '删除' }
        ),
      ])
    },
  },
]

// 加载配置
async function loadConfigs() {
  const response = await get('/api/admin/settings')
  if (response.success) {
    configs.value = response.data.configs || []
    groupedConfigs.value = response.data.grouped || {}

    // 更新分组列表（只显示有数据的分组）
    const existingGroups = Object.keys(groupedConfigs.value)
    if (existingGroups.length > 0 && !existingGroups.includes(currentGroup.value)) {
      currentGroup.value = existingGroups[0]
    }
  }
}

// 编辑配置
function handleEdit(row: any) {
  editForm.key = row.key
  editForm.valueType = row.valueType
  editForm.description = row.description || ''

  // 根据类型转换值
  if (row.valueType === 'number') {
    editForm.value = Number(row.value)
  } else if (row.valueType === 'boolean') {
    editForm.value = row.value === 'true'
  } else {
    editForm.value = row.value
  }

  showEditModal.value = true
}

// 保存编辑
async function handleSaveEdit() {
  if (saving.value) return

  try {
    await editFormRef.value?.validate()
    saving.value = true

    // 转换值
    let value = editForm.value
    if (editForm.valueType === 'boolean') {
      value = value ? 'true' : 'false'
    } else if (editForm.valueType === 'number') {
      value = String(value)
    }

    const response = await put(`/api/admin/settings/${editForm.key}`, {
      value,
      description: editForm.description,
    })

    if (response.success) {
      message.success('配置更新成功')
      showEditModal.value = false
      await loadConfigs()
    } else {
      message.error(response.message || '配置更新失败')
    }
  } catch (error) {
    console.error('Save edit failed:', error)
  } finally {
    saving.value = false
  }
}

// 保存新增
async function handleSaveAdd() {
  if (saving.value) return

  try {
    await addFormRef.value?.validate()
    saving.value = true

    // 转换值
    let value = addForm.value
    if (addForm.valueType === 'boolean') {
      value = value ? 'true' : 'false'
    } else if (addForm.valueType === 'number') {
      value = String(value)
    }

    const response = await post('/api/admin/settings', {
      key: addForm.key,
      value,
      description: addForm.description,
      group: addForm.group,
      valueType: addForm.valueType,
    })

    if (response.success) {
      message.success('配置添加成功')
      showAddModal.value = false

      // 重置表单
      addForm.key = ''
      addForm.value = ''
      addForm.description = ''
      addForm.group = 'general'
      addForm.valueType = 'string'

      await loadConfigs()
    } else {
      message.error(response.message || '配置添加失败')
    }
  } catch (error) {
    console.error('Save add failed:', error)
  } finally {
    saving.value = false
  }
}

// 删除配置
function handleDelete(row: any) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除配置"${row.key}"吗？此操作不可撤销。`,
    positiveText: '确定删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      const response = await del(`/api/admin/settings/${row.key}`)
      if (response.success) {
        message.success('配置删除成功')
        await loadConfigs()
      } else {
        message.error(response.message || '配置删除失败')
      }
    },
  })
}

// 初始化
onMounted(async () => {
  await loadConfigs()
})
</script>
