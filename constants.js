/**
 * HYDEV Project Manager - Constants
 * Single source of truth for all magic strings, keys, and configuration
 */

export const STORAGE_KEY = 'hydev-projects-v5';
export const CACHE_NAME = 'hydev-pm-v6';
export const THEME_KEY = 'hydev-theme';
export const PROJECTS_ROOT_KEY = 'hydev-projects-root';

export const APP_VERSION = '1.4.0';

export const COLORS = {
    primary: '#00D68F',
    primaryHover: '#00E699',
    primaryLight: 'rgba(0, 214, 143, 0.15)',
    darkBg: '#0C0C0C',
    darkCard: '#161616',
    darkBorder: '#2A2A2A',
    lightBg: '#F5F5F5',
    lightCard: '#FFFFFF',
    lightBorder: '#E0E0E0',
    textPrimary: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textMuted: '#888888',
    danger: '#FF4757',
    dangerHover: '#FF6B7A',
    warning: '#FFA502',
    success: '#00D68F'
};

export const ICONS = {
    add: '+',
    delete: '🗑',
    edit: '✏️',
    folder: '📁',
    search: '🔍',
    themeDark: '🌙',
    themeLight: '☀️',
    close: '✕',
    moveUp: '↑',
    moveDown: '↓',
    export: '📤',
    import: '📥',
    install: '⬇️',
    copy: '📋',
    run: '▶️',
    browse: '📂',
    paste: '📋',
    check: '✓',
    loading: '⏳',
    vscode: '💻',
    android: '🤖',
    pin: '📌',
    settings: '⚙️',
    overview: '📖',
    preview: '🌐',
    drag: '⋮⋮'
};

export const TOAST_DURATION = {
    success: 3000,
    error: 7000,
    info: 4000
};

export const DEBOUNCE_MS = 200;
export const MAX_PATH_LENGTH = 260;
export const MAX_NAME_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_README_SIZE = 1_000_000;
export const INVALID_PATH_CHARS = /[<>"|?*]/;
export const WINDOWS_DRIVE_REGEX = /^[A-Za-z]:\\/;
export const UNIX_PATH_REGEX = /^\//;

export const README_HEADING_REGEX = /^#{1,3}\s+(.+)$/m;
export const README_PARAGRAPH_REGEX = /^(?!#{1,3}\s)(?!```)(?!\[!\[)(?!---)(?!>\s)(.+)$/m;

export const MODAL_IDS = {
    addProject: 'addProjectModal',
    deleteConfirm: 'deleteConfirmModal',
    openFolder: 'openFolderModal',
    pasteReadme: 'pasteReadmeModal',
    settings: 'settingsModal',
    overview: 'overviewModal',
    preview: 'previewModal'
};

export const ELEMENT_IDS = {
    addProjectBtn: 'addProjectBtn',
    homeAddProjectBtn: 'homeAddProjectBtn',
    emptyAddProjectBtn: 'emptyAddProjectBtn',
    allProjectsBtn: 'allProjectsBtn',
    dashboardNavBtn: 'dashboardNavBtn',
    projectsNavBtn: 'projectsNavBtn',
    progressNavBtn: 'progressNavBtn',
    dashboardView: 'dashboardView',
    projectsView: 'projectsView',
    progressView: 'progressView',
    allProjectsGrid: 'allProjectsGrid',
    allProjectsEmptyState: 'allProjectsEmptyState',
    pinnedSection: 'pinnedSection',
    latestSection: 'latestSection',
    recentSection: 'recentSection',
    progressRing: 'progressRing',
    progressTotal: 'progressTotal',
    progressInsights: 'progressInsights',
    projectFab: 'projectFab',
    projectFabTrigger: 'projectFabTrigger',
    projectFabMenu: 'projectFabMenu',
    projectStatus: 'projectStatus',
    statusFilter: 'statusFilter',
    exportBtn: 'exportBtn',
    importBtn: 'importBtn',
    importFile: 'importFile',
    themeToggle: 'themeToggle',
    themeIcon: 'themeIcon',
    searchInput: 'searchInput',
    clearSearchBtn: 'clearSearchBtn',
    projectsGrid: 'projectsGrid',
    emptyState: 'emptyState',
    projectCount: 'projectCount',
    toastContainer: 'toastContainer',
    projectName: 'projectName',
    projectPath: 'projectPath',
    projectDescription: 'projectDescription',
    projectUrl: 'projectUrl',
    saveProjectBtn: 'saveProjectBtn',
    cancelBtn: 'cancelBtn',
    deleteConfirmBtn: 'deleteConfirmBtn',
    cancelDeleteBtn: 'cancelDeleteBtn',
    copyPathBtn: 'copyPathBtn',
    openExplorerBtn: 'openExplorerBtn',
    openInVscodeBtn: 'openInVscodeBtn',
    openInAndroidBtn: 'openInAndroidBtn',
    closeOpenFolderBtn: 'closeOpenFolderBtn',
    openFolderPath: 'openFolderPath',
    pasteReadmeContent: 'pasteReadmeContent',
    pastePreviewName: 'pastePreviewName',
    pastePreviewDesc: 'pastePreviewDesc',
    savePasteBtn: 'savePasteBtn',
    cancelPasteBtn: 'cancelPasteBtn',
    browseReadmeBtn: 'browseReadmeBtn',
    readmeFileInput: 'readmeFileInput',
    pasteReadmeToggle: 'pasteReadmeToggle',
    browsePathBtn: 'browsePathBtn',
    pathFileInput: 'pathFileInput',
    verifyPathBtn: 'verifyPathBtn',
    pathVerifyStatus: 'pathVerifyStatus',
    previewBtn: 'previewBtn',
    settingsBtn: 'settingsBtn',
    projectsRootInput: 'projectsRootInput',
    saveSettingsBtn: 'saveSettingsBtn',
    closeSettingsBtn: 'closeSettingsBtn',
    overviewTitle: 'overviewTitle',
    overviewBody: 'overviewBody',
    closeOverviewBtn: 'closeOverviewBtn',
    previewModalTitle: 'previewModalTitle',
    previewFrame: 'previewFrame',
    previewRefreshBtn: 'previewRefreshBtn',
    previewOpenExternalBtn: 'previewOpenExternalBtn',
    closePreviewBtn: 'closePreviewBtn'
};