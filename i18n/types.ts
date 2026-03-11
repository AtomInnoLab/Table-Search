export type Locale = 'en' | 'zh'

export interface Messages {
  // App
  appTitle: string
  appSubtitle: string

  // Search
  searchPlaceholder: string
  searchButton: string
  searchingButton: string
  searchQuota: string
  searchQuotaUnmetered: string

  // Empty state
  emptyTitle: string
  emptyDescription: string

  // Matrix table
  loadingPapers: string
  extractingInfo: string
  newPapersScreened: string   // "{count} new paper(s) screened"
  colTitle: string
  colYear: string
  colAuthors: string
  dimensionCount: string      // "{count} dimensions"
  statsSearched: string       // "{count} papers searched"
  statsAdded: string          // "{count} papers added"
  cellExtracting: string
  cellNA: string
  cellFailed: string

  // Load more
  loadMoreButton: string
  loadingMore: string

  // Add column
  addColumnTooltip: string
  addColumnPlaceholder: string
  addColumnButton: string

  // Column header
  badgeAuto: string
  badgeCustom: string
  menuEdit: string
  menuDelete: string

  // Project panel
  recentProjects: string
  projectPapers: string       // "{count} papers"
  projectCols: string         // "{count} cols"
  deleteProject: string
  timeJustNow: string
  timeMinutesAgo: string      // "{count}m ago"
  timeHoursAgo: string        // "{count}h ago"
  timeDaysAgo: string         // "{count}d ago"

  // Auth
  loginRequired: string
  loginRequiredDesc: string
  loginButton: string

  // Language toggle
  langEN: string
  langZH: string
}
