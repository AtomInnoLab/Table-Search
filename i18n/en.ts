import type { Messages } from './types'

const en: Messages = {
  // App
  appTitle: 'Literature Matrix',
  appSubtitle: 'AI-powered academic paper search & structured extraction',

  // Search
  searchPlaceholder: 'Enter your research question...',
  searchButton: 'Search',
  searchingButton: 'Searching',
  remainingCredits: 'Remaining Credits: {credits}',

  // Empty state
  emptyTitle: 'Explore Research Literature',
  emptyDescription:
    'Enter your research question above. AI will search relevant papers, extract key dimensions, and present them in a structured comparison matrix. Supports custom extraction dimensions.',

  // Matrix table
  loadingPapers: 'Loading papers...',
  extractingInfo: 'Extracting information from papers...',
  newPapersScreened: '{count} new {count, plural, one {paper} other {papers}} screened',
  colTitle: 'Title',
  colYear: 'Year',
  colAuthors: 'Authors',
  dimensionCount: '{count} dimensions',
  statsSearched: '{count} papers searched',
  statsAdded: '{count} papers added',
  cellExtracting: 'extracting',
  cellNA: 'N/A',
  cellFailed: 'Failed',

  // Load more
  loadMoreButton: 'Load more papers',
  loadingMore: 'Loading...',

  // Add column
  addColumnTooltip: 'Add custom column',
  addColumnPlaceholder: 'e.g., training dataset',
  addColumnButton: 'Add',

  // Column header
  badgeAuto: 'AUTO',
  badgeCustom: 'CUSTOM',
  menuEdit: 'Edit definition',
  menuDelete: 'Delete column',

  // Project panel
  recentProjects: 'Recent Projects',
  projectPapers: '{count} papers',
  projectCols: '{count} cols',
  deleteProject: 'Delete project',
  timeJustNow: 'just now',
  timeMinutesAgo: '{count}m ago',
  timeHoursAgo: '{count}h ago',
  timeDaysAgo: '{count}d ago',

  // Auth
  loginRequired: 'Login Required',
  loginRequiredDesc: 'Please log in to access this feature.',
  loginButton: 'Go to Login',

  // Language toggle
  langEN: 'EN',
  langZH: '中文',
}

export default en
