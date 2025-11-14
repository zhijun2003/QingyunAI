<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">充值套餐管理</h2>
      <NButton type="primary" @click="showAddModal = true">
        + 添加套餐
      </NButton>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <NCard>
        <div class="text-center">
          <div class="text-sm text-gray-500 mb-2">总套餐数</div>
          <div class="text-2xl font-bold">{{ stats.total }}</div>
        </div>
      </NCard>
      <NCard>
        <div class="text-center">
          <div class="text-sm text-gray-500 mb-2">已启用</div>
          <div class="text-2xl font-bold text-green-600">{{ stats.active }}</div>
        </div>
      </NCard>
      <NCard>
        <div class="text-center">
          <div class="text-sm text-gray-500 mb-2">热门标签</div>
          <div class="text-2xl font-bold text-red-600">{{ stats.hot }}</div>
        </div>
      </NCard>
      <NCard>
        <div class="text-center">
          <div class="text-sm text-gray-500 mb-2">推荐标签</div>
          <div class="text-2xl font-bold text-blue-600">{{ stats.recommend }}</div>
        </div>
      </NCard>
    </div>

    <!-- 套餐列表 -->
    <NCard>
      <NDataTable :columns="columns" :data="packages" :loading="loading" :pagination="false" />
    </NCard>

    <!-- 添加/编辑套餐弹窗 -->
    <NModal
      v-model:show="showAddModal"
      preset="card"
      :title="editingPackage ? '编辑套餐' : '添加套餐'"
      style="width: 600px"
    >
      <NForm
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-placement="left"
        label-width="120"
      >
        <NFormItem label="套餐名称" path="name">
          <NInput v-model:value="formData.name" placeholder="例如：100元套餐" />
        </NFormItem>

        <NFormItem label="套餐描述" path="description">
          <NInput
            v-model:value="formData.description"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="套餐描述（可选）"
          />
        </NFormItem>

        <NFormItem label="充值金额" path="amount">
          <NInputNumber
            v-model:value="formData.amount"
            :min="0.01"
            :step="1"
            :precision="2"
            style="width: 100%"
            placeholder="充值金额（元）"
          >
            <template #prefix>¥</template>
          </NInputNumber>
        </NFormItem>

        <NFormItem label="赠送金额" path="giveAmount">
          <NInputNumber
            v-model:value="formData.giveAmount"
            :min="0"
            :step="1"
            :precision="2"
            style="width: 100%"
            placeholder="赠送金额（元）"
          >
            <template #prefix>¥</template>
          </NInputNumber>
        </NFormItem>

        <NFormItem label="排序" path="sort">
          <NInputNumber
            v-model:value="formData.sort"
            :min="0"
            style="width: 100%"
            placeholder="排序值（越小越靠前）"
          />
        </NFormItem>

        <NFormItem label="状态">
          <NSpace>
            <NCheckbox v-model:checked="formData.isActive">启用</NCheckbox>
            <NCheckbox v-model:checked="formData.isHot">热门</NCheckbox>
            <NCheckbox v-model:checked="formData.isRecommend">推荐</NCheckbox>
          </NSpace>
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <NButton @click="handleCancelEdit">取消</NButton>
          <NButton type="primary" :loading="saving" @click="handleSave">
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
  NCheckbox,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSpace,
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
const packages = ref<any[]>([])
const stats = ref({
  total: 0,
  active: 0,
  hot: 0,
  recommend: 0,
})
const loading = ref(false)
const showAddModal = ref(false)
const saving = ref(false)
const editingPackage = ref<any>(null)

// 表单引用和数据
const formRef = ref<FormInst | null>(null)
const formData = reactive({
  name: '',
  description: '',
  amount: 0,
  giveAmount: 0,
  sort: 0,
  isActive: true,
  isHot: false,
  isRecommend: false,
})

// 表单验证规则
const formRules: FormRules = {
  name: [
    {
      required: true,
      message: '请输入套餐名称',
      trigger: ['blur', 'input'],
    },
  ],
  amount: [
    {
      required: true,
      type: 'number',
      message: '请输入充值金额',
      trigger: ['blur', 'change'],
    },
    {
      type: 'number',
      min: 0.01,
      message: '充值金额必须大于0',
      trigger: ['blur', 'change'],
    },
  ],
}

// 表格列
const columns: DataTableColumns<any> = [
  {
    title: '套餐名称',
    key: 'name',
  },
  {
    title: '充值金额',
    key: 'amount',
    width: 120,
    render(row) {
      return `¥${Number(row.amount).toFixed(2)}`
    },
  },
  {
    title: '赠送金额',
    key: 'giveAmount',
    width: 120,
    render(row) {
      const give = Number(row.giveAmount)
      return give > 0
        ? h('span', { class: 'text-green-600 font-bold' }, `¥${give.toFixed(2)}`)
        : '-'
    },
  },
  {
    title: '实际到账',
    key: 'total',
    width: 120,
    render(row) {
      const total = Number(row.amount) + Number(row.giveAmount)
      return h('span', { class: 'font-bold' }, `¥${total.toFixed(2)}`)
    },
  },
  {
    title: '排序',
    key: 'sort',
    width: 80,
  },
  {
    title: '标签',
    key: 'tags',
    width: 150,
    render(row) {
      const tags = []
      if (row.isHot) tags.push(h(NTag, { type: 'error', size: 'small' }, { default: () => '热门' }))
      if (row.isRecommend)
        tags.push(h(NTag, { type: 'info', size: 'small' }, { default: () => '推荐' }))
      return h(NSpace, {}, { default: () => tags })
    },
  },
  {
    title: '状态',
    key: 'isActive',
    width: 80,
    render(row) {
      return h(
        NTag,
        { type: row.isActive ? 'success' : 'default' },
        { default: () => (row.isActive ? '启用' : '禁用') }
      )
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

// 加载充值套餐
async function loadPackages() {
  loading.value = true
  try {
    const response = await get('/api/admin/recharge-packages')
    if (response.success) {
      packages.value = response.data.packages
      stats.value = response.data.stats
    } else {
      message.error(response.message || '加载失败')
    }
  } catch (error) {
    console.error('Load packages failed:', error)
    message.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 编辑套餐
function handleEdit(pkg: any) {
  editingPackage.value = pkg
  formData.name = pkg.name
  formData.description = pkg.description || ''
  formData.amount = Number(pkg.amount)
  formData.giveAmount = Number(pkg.giveAmount)
  formData.sort = pkg.sort
  formData.isActive = pkg.isActive
  formData.isHot = pkg.isHot
  formData.isRecommend = pkg.isRecommend
  showAddModal.value = true
}

// 取消编辑
function handleCancelEdit() {
  showAddModal.value = false
  editingPackage.value = null
  resetForm()
}

// 重置表单
function resetForm() {
  formData.name = ''
  formData.description = ''
  formData.amount = 0
  formData.giveAmount = 0
  formData.sort = 0
  formData.isActive = true
  formData.isHot = false
  formData.isRecommend = false
}

// 保存
async function handleSave() {
  if (saving.value) return

  try {
    await formRef.value?.validate()
    saving.value = true

    const data = {
      name: formData.name,
      description: formData.description || null,
      amount: formData.amount,
      giveAmount: formData.giveAmount,
      sort: formData.sort,
      isActive: formData.isActive,
      isHot: formData.isHot,
      isRecommend: formData.isRecommend,
    }

    let response
    if (editingPackage.value) {
      response = await put(`/api/admin/recharge-packages/${editingPackage.value.id}`, data)
    } else {
      response = await post('/api/admin/recharge-packages', data)
    }

    if (response.success) {
      message.success(editingPackage.value ? '套餐更新成功' : '套餐创建成功')
      showAddModal.value = false
      editingPackage.value = null
      resetForm()
      await loadPackages()
    } else {
      message.error(response.message || '保存失败')
    }
  } catch (error) {
    console.error('Save package failed:', error)
  } finally {
    saving.value = false
  }
}

// 删除套餐
function handleDelete(pkg: any) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除套餐"${pkg.name}"吗？此操作不可撤销。`,
    positiveText: '确定删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      const response = await del(`/api/admin/recharge-packages/${pkg.id}`)
      if (response.success) {
        message.success('套餐删除成功')
        await loadPackages()
      } else {
        message.error(response.message || '删除失败')
      }
    },
  })
}

// 初始化
onMounted(() => {
  loadPackages()
})
</script>
