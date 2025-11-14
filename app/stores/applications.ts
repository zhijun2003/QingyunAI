import { defineStore } from 'pinia'

export interface Application {
  id: string
  key: string
  name: string
  displayName: string
  description?: string
  icon?: string
  category: string
  routePath: string
  menuLabel: string
  menuIcon?: string
  sortOrder: number
  isCore: boolean
  tags?: string[]
}

export const useApplicationStore = defineStore('applications', () => {
  // 状态
  const applications = ref<Application[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const allApps = computed(() => applications.value)
  const coreApps = computed(() => applications.value.filter(app => app.isCore))
  const pluginApps = computed(() => applications.value.filter(app => !app.isCore))

  // 按类别分组
  const appsByCategory = computed(() => {
    const grouped: Record<string, Application[]> = {}
    applications.value.forEach((app) => {
      if (!grouped[app.category]) {
        grouped[app.category] = []
      }
      grouped[app.category].push(app)
    })
    return grouped
  })

  // Actions
  async function fetchApplications() {
    loading.value = true
    error.value = null

    try {
      const { get } = useApi()
      const response = await get('/api/apps/list')

      if (response.success) {
        applications.value = response.data.all
      } else {
        error.value = response.message || '获取应用列表失败'
        console.error('Fetch applications failed:', response.message)
      }
    } catch (err) {
      error.value = '获取应用列表失败'
      console.error('Fetch applications error:', err)
    } finally {
      loading.value = false
    }
  }

  // 根据key查找应用
  function getAppByKey(key: string): Application | undefined {
    return applications.value.find(app => app.key === key)
  }

  // 根据路径查找应用
  function getAppByPath(path: string): Application | undefined {
    return applications.value.find(app => app.routePath === path || path.startsWith(app.routePath + '/'))
  }

  // 检查应用是否可用
  function isAppAvailable(key: string): boolean {
    const app = getAppByKey(key)
    return !!app
  }

  return {
    // 状态
    applications,
    loading,
    error,

    // 计算属性
    allApps,
    coreApps,
    pluginApps,
    appsByCategory,

    // Actions
    fetchApplications,
    getAppByKey,
    getAppByPath,
    isAppAvailable,
  }
})
