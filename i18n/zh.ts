import type { Messages } from './types'

const zh: Messages = {
  // App
  appTitle: '文献矩阵',
  appSubtitle: '基于AI的学术论文搜索与结构化提取工具',

  // Search
  searchPlaceholder: '输入你的研究问题...',
  searchButton: '搜索',
  searchingButton: '搜索中',
  resultsFor: '搜索结果：',

  // Empty state
  emptyTitle: '探索研究文献',
  emptyDescription:
    '在上方输入研究问题，AI 将搜索相关论文、提取关键维度，并以结构化对比矩阵呈现，支持自定义提取维度。',

  // Matrix table
  loadingPapers: '正在加载论文...',
  extractingInfo: '正在从论文中提取信息...',
  newPapersScreened: '新增 {count} 篇已筛选论文',
  colTitle: '标题',
  colYear: '年份',
  colAuthors: '作者',
  dimensionCount: '{count} 个维度',
  statsSearched: '{count} 篇论文已搜索',
  statsAdded: '{count} 篇论文已添加',
  cellExtracting: '提取中',
  cellNA: '不适用',
  cellFailed: '提取失败',

  // Load more
  loadMoreButton: '加载更多论文',
  loadingMore: '加载中...',

  // Add column
  addColumnTooltip: '添加自定义列',
  addColumnPlaceholder: '例如：训练数据集',
  addColumnButton: '添加',

  // Column header
  badgeAuto: '自动',
  badgeCustom: '自定义',
  menuEdit: '编辑定义',
  menuDelete: '删除列',

  // Project panel
  recentProjects: '最近项目',
  projectPapers: '{count} 篇论文',
  projectCols: '{count} 列',
  deleteProject: '删除项目',
  timeJustNow: '刚刚',
  timeMinutesAgo: '{count} 分钟前',
  timeHoursAgo: '{count} 小时前',
  timeDaysAgo: '{count} 天前',

  // Language toggle
  langEN: 'EN',
  langZH: '中文',
}

export default zh
