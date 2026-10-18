/**
 * HYDEV Project Manager - Main Application
 * Version: 1.5.0
 */

import {
    STORAGE_KEY, THEME_KEY, APP_VERSION, ICONS, TOAST_DURATION,
    DEBOUNCE_MS, MAX_PATH_LENGTH, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH,
    MAX_README_SIZE, INVALID_PATH_CHARS, WINDOWS_DRIVE_REGEX, UNIX_PATH_REGEX,
    MODAL_IDS, ELEMENT_IDS, PROJECTS_ROOT_KEY, ANDROID_STUDIO_PATH_KEY, VS_CODE_PATH_KEY
} from './constants.js';

class ProjectManager {
    constructor() {
        this.projects = [];
        this.theme = 'dark';
        this.currentIndex = -1;
        this.searchQuery = '';
        this.statusFilter = 'all';
        this.projectSort = 'recent';
        this.currentView = 'dashboard';
        this.debounceTimer = null;
        this.modalKeydownHandlers = new Map();
        this.projectIndexMap = new Map();
        this._deferredPrompt = null;
        this._pendingReadme = '';
        this._openFolderIndex = -1;
        this._isSaving = false;
        this.projectsRoot = localStorage.getItem(PROJECTS_ROOT_KEY) || '';
        this.androidStudioPath = localStorage.getItem(ANDROID_STUDIO_PATH_KEY) || '';
        this.vscodePath = localStorage.getItem(VS_CODE_PATH_KEY) || '';

        this._handleSearch = this._handleSearch.bind(this);
        this._handleGridClick = this._handleGridClick.bind(this);
        this._handleStorageChange = this._handleStorageChange.bind(this);

        this._init();
    }

    _updateProgress() {
        const counts = { finished: 0, new: 0, working: 0 };
        this.projects.forEach(project => counts[this._getProjectStatus(project)]++);
        const total = this.projects.length;
        this._elements.summaryTotal.textContent = total;
        this._elements.summaryWorking.textContent = counts.working;
        this._elements.summaryNew.textContent = counts.new;
        this._elements.summaryFinished.textContent = counts.finished;
        const finished = total ? (counts.finished / total) * 100 : 0;
        const started = total ? (counts.new / total) * 100 : 0;
        const finishedEnd = finished;
        const startedEnd = finished + started;
        this._elements.progressRing.style.setProperty('--finished-end', `${finishedEnd}%`);
        this._elements.progressRing.style.setProperty('--started-end', `${startedEnd}%`);
        this._elements.progressRing.style.background = total
            ? ''
            : 'conic-gradient(var(--border-color) 0 100%)';
        this._elements.progressRing.style.setProperty('--progress-total', `${total}`);
        this._elements.progressTotal.textContent = total;
        const labels = { finished: 'Completed', new: 'New', working: 'In progress' };
        const orderedStatuses = Object.entries(counts).sort(([, a], [, b]) => b - a);
        const insight = total === 0
            ? 'Add a project to start building your progress picture.'
            : orderedStatuses[0][1] === 0
                ? 'Your workspace is ready for its first move.'
                : `${labels[orderedStatuses[0][0]]} is your biggest focus right now.`;
        this._elements.progressInsights.innerHTML = `
            <div class="insight-heading"><span class="eyebrow">SMART OVERVIEW</span><strong>${insight}</strong></div>
            <div class="insight-list">${orderedStatuses.map(([status, count]) => `
                <div class="insight-row status-${status}">
                    <span><i class="status-ring status-ring-${status}"></i>${labels[status]}</span>
                    <strong>${count} project${count === 1 ? '' : 's'}</strong>
                </div>
            `).join('')}</div>
        `;
        this._elements.progressRing.setAttribute('aria-label', `${counts.finished} done, ${counts.working} working, ${counts.new} new, ${total} total projects`);
    }

    async _init() {
        this._cacheElements();
        this._bindEvents();
        this._loadTheme();
        this.loadProjects();
        this.updateUI();
        this._refreshMissingProjectTypes();
        await this._initPWA();
        this._setupKeyboardShortcuts();
        this._checkLocalServer();
        window.addEventListener('storage', this._handleStorageChange);
    }

    _cacheElements() {
        const get = id => document.getElementById(id);
        this._elements = {
            homeAddProjectBtn: get(ELEMENT_IDS.homeAddProjectBtn),
            emptyAddProjectBtn: get(ELEMENT_IDS.emptyAddProjectBtn),
            allProjectsBtn: get(ELEMENT_IDS.allProjectsBtn),
            dashboardNavBtn: get(ELEMENT_IDS.dashboardNavBtn),
            projectsNavBtn: get(ELEMENT_IDS.projectsNavBtn),
            progressNavBtn: get(ELEMENT_IDS.progressNavBtn),
            dashboardView: get(ELEMENT_IDS.dashboardView),
            projectsView: get(ELEMENT_IDS.projectsView),
            progressView: get(ELEMENT_IDS.progressView),
            allProjectsGrid: get(ELEMENT_IDS.allProjectsGrid),
            allProjectsEmptyState: get(ELEMENT_IDS.allProjectsEmptyState),
            pinnedSection: get(ELEMENT_IDS.pinnedSection),
            latestSection: get(ELEMENT_IDS.latestSection),
            recentSection: get(ELEMENT_IDS.recentSection),
            pinnedProjectsGrid: get('pinnedProjectsGrid'),
            recentProjectsGrid: get('recentProjectsGrid'),
            progressRing: get(ELEMENT_IDS.progressRing),
            progressTotal: get(ELEMENT_IDS.progressTotal),
            progressInsights: get(ELEMENT_IDS.progressInsights),
            startProjectBtn: get('startProjectBtn'),
            projectSort: get('projectSort'),
            summaryTotal: get('summaryTotal'),
            summaryWorking: get('summaryWorking'),
            summaryNew: get('summaryNew'),
            summaryFinished: get('summaryFinished'),
            projectStatus: get(ELEMENT_IDS.projectStatus),
            exportBtn: get(ELEMENT_IDS.exportBtn),
            importBtn: get(ELEMENT_IDS.importBtn),
            importFile: get(ELEMENT_IDS.importFile),
            themeToggle: get(ELEMENT_IDS.themeToggle),
            themeIcon: get(ELEMENT_IDS.themeIcon),
            searchInput: get(ELEMENT_IDS.searchInput),
            clearSearchBtn: get(ELEMENT_IDS.clearSearchBtn),
            projectsGrid: get(ELEMENT_IDS.projectsGrid),
            emptyState: get(ELEMENT_IDS.emptyState),
            projectCount: get(ELEMENT_IDS.projectCount),
            toastContainer: get(ELEMENT_IDS.toastContainer),
            projectName: get(ELEMENT_IDS.projectName),
            projectPath: get(ELEMENT_IDS.projectPath),
            projectDescription: get(ELEMENT_IDS.projectDescription),
            projectUrl: get(ELEMENT_IDS.projectUrl),
            saveProjectBtn: get(ELEMENT_IDS.saveProjectBtn),
            cancelBtn: get(ELEMENT_IDS.cancelBtn),
            deleteConfirmBtn: get(ELEMENT_IDS.deleteConfirmBtn),
            cancelDeleteBtn: get(ELEMENT_IDS.cancelDeleteBtn),
            openFolderPath: get(ELEMENT_IDS.openFolderPath),
            openFolderPathWarning: document.getElementById('openFolderPathWarning'),
            copyPathBtn: get(ELEMENT_IDS.copyPathBtn),
            openExplorerBtn: get(ELEMENT_IDS.openExplorerBtn),
            openInVscodeBtn: get(ELEMENT_IDS.openInVscodeBtn),
            openInAndroidBtn: get(ELEMENT_IDS.openInAndroidBtn),
            previewBtn: get(ELEMENT_IDS.previewBtn),
            closeOpenFolderBtn: get(ELEMENT_IDS.closeOpenFolderBtn),
            pasteReadmeContent: get(ELEMENT_IDS.pasteReadmeContent),
            pastePreviewName: get(ELEMENT_IDS.pastePreviewName),
            pastePreviewDesc: get(ELEMENT_IDS.pastePreviewDesc),
            savePasteBtn: get(ELEMENT_IDS.savePasteBtn),
            cancelPasteBtn: get(ELEMENT_IDS.cancelPasteBtn),
            browseReadmeBtn: get(ELEMENT_IDS.browseReadmeBtn),
            readmeFileInput: get(ELEMENT_IDS.readmeFileInput),
            pasteReadmeToggle: get(ELEMENT_IDS.pasteReadmeToggle),
            browsePathBtn: get(ELEMENT_IDS.browsePathBtn),
            pathFileInput: get(ELEMENT_IDS.pathFileInput),
            verifyPathBtn: get(ELEMENT_IDS.verifyPathBtn),
            pathVerifyStatus: get(ELEMENT_IDS.pathVerifyStatus),
            settingsBtn: get(ELEMENT_IDS.settingsBtn),
            projectsRootInput: get(ELEMENT_IDS.projectsRootInput),
            androidStudioInput: get(ELEMENT_IDS.androidStudioInput),
            vscodeInput: get(ELEMENT_IDS.vscodeInput),
            saveSettingsBtn: get(ELEMENT_IDS.saveSettingsBtn),
            closeSettingsBtn: get(ELEMENT_IDS.closeSettingsBtn),
            overviewTitle: get(ELEMENT_IDS.overviewTitle),
            overviewBody: get(ELEMENT_IDS.overviewBody),
            closeOverviewBtn: get(ELEMENT_IDS.closeOverviewBtn),
            previewModalTitle: get(ELEMENT_IDS.previewModalTitle),
            previewFrame: get(ELEMENT_IDS.previewFrame),
            previewRefreshBtn: get(ELEMENT_IDS.previewRefreshBtn),
            previewOpenExternalBtn: get(ELEMENT_IDS.previewOpenExternalBtn),
            closePreviewBtn: get(ELEMENT_IDS.closePreviewBtn)
        };
    }

    _bindEvents() {
        this._elements.homeAddProjectBtn.addEventListener('click', () => this._openAddProjectModal());
        this._elements.emptyAddProjectBtn.addEventListener('click', () => this._openAddProjectModal());
        this._elements.allProjectsBtn.addEventListener('click', () => this._switchView('projects'));
        this._elements.dashboardNavBtn.addEventListener('click', () => this._switchView('dashboard'));
        this._elements.projectsNavBtn.addEventListener('click', () => this._switchView('projects'));
        this._elements.progressNavBtn.addEventListener('click', () => this._switchView('progress'));
        document.querySelectorAll('[data-view-target]').forEach(button => {
            button.addEventListener('click', () => this._switchView(button.dataset.viewTarget));
        });
        this._elements.projectSort.addEventListener('change', e => {
            this.projectSort = e.target.value;
            this.updateUI();
        });
        this._elements.startProjectBtn.addEventListener('click', () => this._openAddProjectModal('new'));
        this._elements.exportBtn.addEventListener('click', () => this.exportProjects());
        this._elements.importBtn.addEventListener('click', () => this._elements.importFile.click());
        this._elements.importFile.addEventListener('change', e => this._handleImport(e));
        this._elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        this._elements.searchInput.addEventListener('input', this._handleSearch);
        this._elements.clearSearchBtn.addEventListener('click', () => this._clearSearch());
        this._elements.projectsGrid.addEventListener('click', this._handleGridClick);
        this._elements.allProjectsGrid.addEventListener('click', this._handleGridClick);
        [this._elements.allProjectsGrid]
            .forEach(grid => grid.addEventListener('change', e => this._handleStatusChange(e)));
        document.querySelectorAll('[data-status-filter]').forEach(button => {
            button.addEventListener('click', () => {
                this.statusFilter = button.dataset.statusFilter;
                document.querySelectorAll('[data-status-filter]').forEach(item => {
                    const active = item.dataset.statusFilter === this.statusFilter;
                    item.classList.toggle('active', active);
                    item.setAttribute('aria-pressed', String(active));
                });
                this.updateUI();
            });
        });
        this._elements.saveProjectBtn.addEventListener('click', () => this.saveProject());
        this._elements.cancelBtn.addEventListener('click', () => this.closeModal('addProject'));
        this._elements.cancelDeleteBtn.addEventListener('click', () => this.closeModal('deleteConfirm'));
        this._elements.deleteConfirmBtn.addEventListener('click', () => this._confirmDelete());
        this._elements.copyPathBtn.addEventListener('click', () => this._copyPath());
        this._elements.openExplorerBtn.addEventListener('click', () => this._openInExplorer());
        this._elements.openInVscodeBtn.addEventListener('click', () => this._openInVSCode());
        this._elements.openInAndroidBtn.addEventListener('click', () => this._openInAndroidStudio());
        this._elements.previewBtn.addEventListener('click', () => this._previewProject());
        this._elements.closeOpenFolderBtn.addEventListener('click', () => this.closeModal('openFolder'));
        this._elements.pasteReadmeContent.addEventListener('input', () => this._updatePastePreview());
        this._elements.savePasteBtn.addEventListener('click', () => this._usePasteReadme());
        this._elements.cancelPasteBtn.addEventListener('click', () => this.closeModal('pasteReadme'));
        this._elements.browseReadmeBtn.addEventListener('click', () => this._elements.readmeFileInput.click());
        this._elements.readmeFileInput.addEventListener('change', e => this._handleReadmeFile(e));
        this._elements.pasteReadmeToggle.addEventListener('click', () => this._openPasteReadmeModal());
        this._elements.browsePathBtn.addEventListener('click', () => this._browseFolder());
        this._elements.pathFileInput.addEventListener('change', e => this._handleFolderFilesSelected(e));
        this._elements.verifyPathBtn.addEventListener('click', () => this._verifyPath());
        this._elements.projectPath.addEventListener('input', () => this._clearPathVerifyStatus());
        this._elements.settingsBtn.addEventListener('click', () => this._openSettings());
        this._elements.saveSettingsBtn.addEventListener('click', () => this._saveSettings());
        this._elements.closeSettingsBtn.addEventListener('click', () => this.closeModal('settings'));
        this._elements.closeOverviewBtn.addEventListener('click', () => this.closeModal('overview'));
        this._elements.closePreviewBtn.addEventListener('click', () => this.closeModal('preview'));
        this._elements.previewRefreshBtn.addEventListener('click', () => this._refreshPreviewFrame());

        // Event delegation for modals
        document.addEventListener('click', e => {
            if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
                const modal = e.target.closest('.modal');
                if (modal) this.closeModal(modal.id.replace('Modal', ''));
            }
        });
    }

    _setupKeyboardShortcuts() {
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this._elements.searchInput.focus();
            } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                e.preventDefault();
                this._elements.searchInput.focus();
            } else if (e.key === 'Escape') {
                const active = document.querySelector('.modal.active');
                if (active) this.closeModal(active.id.replace('Modal', ''));
            }
        });
    }

    // ==================== STORAGE ====================
    loadProjects() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                this.projects = this._dedupeProjects(data.projects || []);
            }
            this._rebuildIndexMap();
        } catch (error) {
            console.error('Failed to load projects:', error);
            this.projects = [];
        }
    }

    saveProjects() {
        try {
            this.projects = this._dedupeProjects(this.projects);
            const data = { version: 5, exportedAt: new Date().toISOString(), projects: this.projects };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            this._rebuildIndexMap();
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                this.showToast('Storage full! Export projects and delete some.', 'error', TOAST_DURATION.error);
            } else {
                this.showToast('Failed to save projects.', 'error', TOAST_DURATION.error);
            }
            console.error('Failed to save projects:', error);
        }
    }

    _rebuildIndexMap() {
        this.projectIndexMap.clear();
        this.projects.forEach((project, index) => {
            this.projectIndexMap.set(project.id, index);
        });
    }

    _handleStorageChange(e) {
        if (e.key === STORAGE_KEY) {
            this.loadProjects();
            this.updateUI();
            this._refreshMissingProjectTypes();
            this.showToast('Projects updated from another tab.', 'info');
        }
    }

    // ==================== UI ====================
    updateUI() {
        const filtered = this._getFilteredProjects();
        const pinned = filtered.filter(project => project.pinned)
            .sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
        const recent = filtered.filter(project => !project.pinned && project.lastOpened)
            .sort((a, b) => new Date(b.lastOpened) - new Date(a.lastOpened))
            .slice(0, 6);
        const latest = recent.length ? [] : filtered.filter(project => !project.pinned)
            .sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0))
            .slice(0, 6);
        this._renderProjects(pinned, this._elements.pinnedProjectsGrid);
        this._renderProjects(latest, this._elements.projectsGrid);
        this._renderProjects(recent, this._elements.recentProjectsGrid);
        this._elements.pinnedSection.hidden = pinned.length === 0;
        this._elements.latestSection.hidden = latest.length === 0;
        this._elements.recentSection.hidden = recent.length === 0;
        const statusProjects = this._getStatusFilteredProjects();
        this._renderProjects(statusProjects, this._elements.allProjectsGrid);
        this._updateProjectCount(this.currentView === 'projects' ? statusProjects.length : filtered.length);
        this._updateEmptyState(filtered.length);
        this._updateProjectsPageEmptyState(statusProjects.length);
        this._updateProgress();
    }

    _getFilteredProjects() {
        const list = !this.searchQuery.trim() ? [...this.projects] : this.projects.filter(p =>
            [p.name, p.description, p.path, p.projectType]
                .some(value => String(value || '').toLowerCase().includes(this.searchQuery.toLowerCase()))
        );
        return list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    }

    _getStatusFilteredProjects() {
        const query = this.searchQuery.trim().toLowerCase();
        const list = this.projects.filter(project =>
            (this.statusFilter === 'all' || this._getProjectStatus(project) === this.statusFilter) &&
            (!query || [project.name, project.description, project.path, project.projectType]
                .some(value => String(value || '').toLowerCase().includes(query)))
        );
        return list.sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            if (this.projectSort === 'name') return a.name.localeCompare(b.name);
            if (this.projectSort === 'opened') return new Date(b.lastOpened || 0) - new Date(a.lastOpened || 0);
            return new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0);
        });
    }

    _getProjectStatus(project) {
        return ['new', 'working', 'finished'].includes(project.status) ? project.status : 'working';
    }

    _renderProjects(projects, target = this._elements.projectsGrid) {
        const grid = target;
        if (projects.length === 0) { grid.innerHTML = ''; return; }

        grid.innerHTML = projects.map(project => {
            const actualIndex = this.projectIndexMap.get(project.id);
            const dateText = this._formatDate(project.dateAdded);
            const pinned = !!project.pinned;
            const path = project.path || '';
            const status = this._getProjectStatus(project);
            const statusLabel = { new: 'New', working: 'In progress', finished: 'Completed' }[status];
            const projectType = project.projectType || 'Unknown';

            return `
                <div class="project-card status-${status}${pinned ? ' pinned' : ''}" data-id="${this._escapeHtml(project.id)}" data-index="${actualIndex}">
                    <div class="card-header">
                        <div class="card-title-row"><i class="status-ring status-ring-${status}" title="${statusLabel}"></i><h3 class="card-title">${this._escapeHtml(project.name)}</h3></div>
                        <div class="card-actions">
                            <button class="btn-icon btn-icon-pin${pinned ? ' active' : ''}" data-action="pin" data-index="${actualIndex}" aria-label="${pinned ? 'Unpin project' : 'Pin project'}" title="${pinned ? 'Unpin' : 'Pin'}">${ICONS.pin}</button>
                            <button class="btn-icon" data-action="edit" data-index="${actualIndex}" aria-label="Edit project" title="Edit">${ICONS.edit}</button>
                            <details class="card-more-actions">
                                <summary class="btn-icon" aria-label="More project actions" title="More actions">···</summary>
                                <div class="card-actions-menu">
                                    <button type="button" data-action="moveUp" data-index="${actualIndex}">${ICONS.moveUp} Move up</button>
                                    <button type="button" data-action="moveDown" data-index="${actualIndex}">${ICONS.moveDown} Move down</button>
                                    <button type="button" class="danger-action" data-action="delete" data-index="${actualIndex}">${ICONS.delete} Delete</button>
                                </div>
                            </details>
                        </div>
                    </div>
                    <span class="project-type-badge">${this._escapeHtml(projectType)}</span>
                    <p class="card-description">${this._escapeHtml(project.description || 'No description')}</p>
                    ${path ? `<div class="card-path" title="${this._escapeHtml(path)}">${ICONS.folder} <span>${this._escapeHtml(path)}</span></div>` : ''}
                    <div class="card-footer">
                        <span class="card-date">${dateText} · ${statusLabel}</span>
                        <div class="card-footer-actions">
                            <button class="btn btn-sm btn-secondary" data-action="overview" data-index="${actualIndex}" aria-label="View overview" title="View README overview">
                                ${ICONS.overview} Overview
                            </button>
                            <select class="status-select status-select-${status}" data-index="${actualIndex}" aria-label="Change project status">
                                <option value="new" ${status === 'new' ? 'selected' : ''}>New</option>
                                <option value="working" ${status === 'working' ? 'selected' : ''}>In progress</option>
                                <option value="finished" ${status === 'finished' ? 'selected' : ''}>Completed</option>
                            </select>
                            <button class="btn btn-sm btn-primary" data-action="openFolder" data-index="${actualIndex}" aria-label="Open folder" title="Open folder">
                                ${ICONS.folder} Open
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    _updateProjectsPageEmptyState(count) {
        const empty = this._elements.allProjectsEmptyState;
        const grid = this._elements.allProjectsGrid;
        if (count === 0) {
            empty.style.display = 'flex';
            grid.innerHTML = '';
            const title = empty.querySelector('h2');
            const description = empty.querySelector('p:not(.eyebrow)');
            if (this.projects.length === 0) {
                title.textContent = 'Your library is empty';
                description.textContent = 'Add a local project folder to start your workspace.';
            } else {
                title.textContent = 'No matching projects';
                description.textContent = 'Try a different search or status filter.';
            }
        } else {
            empty.style.display = 'none';
        }
    }

    _switchView(view) {
        this.currentView = view;
        const isProjects = view === 'projects';
        const isProgress = view === 'progress';
        this._elements.dashboardView.hidden = isProjects;
        this._elements.projectsView.hidden = !isProjects;
        this._elements.progressView.hidden = !isProgress;
        this._elements.dashboardView.hidden = isProjects || isProgress;
        this._elements.dashboardNavBtn.classList.toggle('active', !isProjects && !isProgress);
        this._elements.projectsNavBtn.classList.toggle('active', isProjects);
        this._elements.progressNavBtn.classList.toggle('active', isProgress);
        this._elements.dashboardNavBtn.setAttribute('aria-current', !isProjects && !isProgress ? 'page' : 'false');
        this._elements.projectsNavBtn.setAttribute('aria-current', isProjects ? 'page' : 'false');
        this._elements.progressNavBtn.setAttribute('aria-current', isProgress ? 'page' : 'false');
        this._updateProjectCount(isProjects ? this._getStatusFilteredProjects().length : this._getFilteredProjects().length);
    }

    _updateProjectCount(count) {
        if (!this._elements.projectCount) return;
        const total = this.projects.length;
        const text = total === 0 ? '0 projects' :
            count === total ? `${total} ${total === 1 ? 'project' : 'projects'}` :
            `${count} of ${total}`;
        this._elements.projectCount.textContent = text;
    }

    _updateEmptyState(count) {
        const empty = this._elements.emptyState;
        const grid = this._elements.projectsGrid;

        if (this.projects.length === 0) {
            empty.style.display = 'flex';
            empty.querySelector('h2').textContent = 'No projects yet';
            empty.querySelector('p:not(.eyebrow)').textContent = 'Add a local project folder to make this workspace yours.';
            this._elements.emptyAddProjectBtn.hidden = false;
            grid.innerHTML = '';
        } else if (count === 0) {
            empty.style.display = 'flex';
            empty.querySelector('h2').textContent = 'No matching projects';
            empty.querySelector('p:not(.eyebrow)').textContent = 'Try another search, or browse your full project library.';
            this._elements.emptyAddProjectBtn.hidden = true;
            grid.innerHTML = '';
        } else {
            empty.style.display = 'none';
        }
    }

    // ==================== SEARCH ====================
    _handleSearch(e) {
        this.searchQuery = e.target.value;
        this._elements.clearSearchBtn.style.display = this.searchQuery ? 'block' : 'none';
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.updateUI();
            if (this.searchQuery.trim()) this._switchView('projects');
        }, DEBOUNCE_MS);
    }

    _clearSearch() {
        this.searchQuery = '';
        this._elements.searchInput.value = '';
        this._elements.clearSearchBtn.style.display = 'none';
        clearTimeout(this.debounceTimer);
        this.updateUI();
        this._elements.searchInput.focus();
    }

    // ==================== GRID CLICK ====================
    _handleGridClick(e) {
        if (e.target.closest('.status-select') || e.target.closest('select')) return;
        const card = e.target.closest('.project-card');
        if (!card) return;

        const action = e.target.dataset.action;
        const index = parseInt(e.target.dataset.index, 10);

        if (action) {
            e.stopPropagation();
            switch (action) {
                case 'moveUp': this.moveProject(index, -1); break;
                case 'moveDown': this.moveProject(index, 1); break;
                case 'pin': this.togglePin(index); break;
                case 'edit': this.editProject(index); break;
                case 'delete': this.deleteProject(index); break;
                case 'openFolder': this._openFolder(index); break;
                case 'overview': this._showOverview(index); break;
            }

        } else {
            this.selectProject(index);
        }
    }

    _handleStatusChange(e) {
        const select = e.target.closest('.status-select');
        if (!select) return;
        const index = Number(select.dataset.index);
        if (!Number.isInteger(index) || !this.projects[index]) return;
        const status = select.value;
        if (!['new', 'working', 'finished'].includes(status)) return;
        this.projects[index].status = status;
        this.saveProjects();
        this.updateUI();
        const statusLabel = { new: 'new', working: 'in progress', finished: 'completed' }[status];
        this.showToast(`"${this.projects[index].name}" marked ${statusLabel}.`, 'success');
    }

    // ==================== PROJECT CRUD ====================
    _openAddProjectModal(status = 'new') {
        this.currentIndex = -1;
        this._elements.projectName.value = '';
        this._elements.projectPath.value = '';
        this._elements.projectDescription.value = '';
        this._elements.projectUrl.value = '';
        this._elements.projectStatus.value = ['new', 'working', 'finished'].includes(status) ? status : 'new';
        this._pendingReadme = '';
        this._clearPathVerifyStatus();
        this._setModalTitle('addProject', 'Add New Project');
        this._openModal('addProject');
        this._elements.projectName.focus();
    }

    editProject(index) {
        if (index < 0 || index >= this.projects.length) return;
        const project = this.projects[index];
        this.currentIndex = index;
        this._elements.projectName.value = project.name;
        this._elements.projectPath.value = project.path;
        this._elements.projectDescription.value = project.description || '';
        this._elements.projectUrl.value = project.url || '';
        this._elements.projectStatus.value = this._getProjectStatus(project);
        this._pendingReadme = project.readme || '';
        this._clearPathVerifyStatus();
        this._setModalTitle('addProject', 'Edit Project');
        this._openModal('addProject');
        this._elements.projectName.focus();
    }

    async saveProject() {
        if (this._isSaving) return;
        this._isSaving = true;
        this._elements.saveProjectBtn.disabled = true;
        const name = this._elements.projectName.value.trim();
        const path = this._elements.projectPath.value.trim();
        const description = this._elements.projectDescription.value.trim();
        const url = this._elements.projectUrl.value.trim();
        const status = this._elements.projectStatus.value;

        const finishSaveAttempt = () => {
            this._isSaving = false;
            this._elements.saveProjectBtn.disabled = false;
        };
        if (!name) { finishSaveAttempt(); this.showToast('Project name is required.', 'error'); this._elements.projectName.focus(); return; }
        if (!path) { finishSaveAttempt(); this.showToast('Folder path is required.', 'error'); this._elements.projectPath.focus(); return; }
        if (INVALID_PATH_CHARS.test(path)) { finishSaveAttempt(); this.showToast('Path contains invalid characters: < > | " ? *', 'error'); this._elements.projectPath.focus(); return; }
        const normalizedPath = this._normalizeProjectPath(this._resolveProjectPath(path));
        const duplicate = this.projects.find((project, index) =>
            index !== this.currentIndex && this._normalizeProjectPath(this._resolveProjectPath(project.path)) === normalizedPath
        );
        if (duplicate) {
            finishSaveAttempt();
            this.showToast(`That folder is already saved as "${duplicate.name}".`, 'error');
            this._elements.projectPath.focus();
            return;
        }

        const truncatedName = name.slice(0, MAX_NAME_LENGTH);
        const truncatedDesc = description.slice(0, MAX_DESCRIPTION_LENGTH);
        const readme = (this._pendingReadme || '').slice(0, MAX_README_SIZE);
        const resolvedPath = this._resolveProjectPath(path);
        const detectedType = await this._detectProjectType(resolvedPath);

        if (this.currentIndex >= 0) {
            // EDIT MODE - Update existing
            this.projects[this.currentIndex] = {
                ...this.projects[this.currentIndex],
                name: truncatedName,
                path: resolvedPath,
                description: truncatedDesc,
                url,
                readme,
                projectType: detectedType || this.projects[this.currentIndex].projectType || 'Unknown',
                status
            };
            this.showToast('Project updated successfully!', 'success');
        } else {
            // ADD MODE - Create new
            const newProject = {
                id: this._generateId(),
                name: truncatedName,
                path: resolvedPath,
                description: truncatedDesc,
                dateAdded: new Date().toISOString(),
                pinned: false,
                url,
                readme,
                projectType: detectedType || 'Unknown',
                status
            };
            this.projects.unshift(newProject);
            this.showToast('Project added successfully!', 'success');
        }

        this._pendingReadme = '';
        this.saveProjects();
        this.updateUI();
        this.closeModal('addProject');
        if (!detectedType) {
            this.showToast('Project saved, but its type could not be detected. Run via start.bat to enable local detection.', 'info');
        }
        finishSaveAttempt();
    }

    deleteProject(index) {
        if (index < 0 || index >= this.projects.length) return;
        const project = this.projects[index];
        this.currentIndex = index;
        const nameSpan = document.querySelector('.project-name-delete');
        if (nameSpan) nameSpan.textContent = project.name;
        this._openModal('deleteConfirm');
    }

    _confirmDelete() {
        if (this.currentIndex < 0 || this.currentIndex >= this.projects.length) return;
        const deleted = this.projects[this.currentIndex];
        this.projects.splice(this.currentIndex, 1);
        this.saveProjects();
        this.updateUI();
        this.closeModal('deleteConfirm');
        this.showToast(`"${deleted.name}" deleted.`, 'success');
        this.currentIndex = -1;
    }

    selectProject(index) {
        if (index < 0 || index >= this.projects.length) return;
        this.currentIndex = index;
        this._openFolder(index);
    }

    togglePin(index) {
        if (index < 0 || index >= this.projects.length) return;
        const project = this.projects[index];
        project.pinned = !project.pinned;
        this.saveProjects();
        this.updateUI();
        this.showToast(project.pinned ? `Pinned "${project.name}".` : `Unpinned "${project.name}".`, 'success');
    }

    // ==================== MOVE PROJECTS ====================
    moveProject(index, direction) {
        const newIndex = index + direction;
        if (index < 0 || index >= this.projects.length) return;
        if (newIndex < 0 || newIndex >= this.projects.length) return;

        // Proper array move (splice-based, not swap)
        const [moved] = this.projects.splice(index, 1);
        this.projects.splice(newIndex, 0, moved);

        this.saveProjects();
        this.updateUI();

        // Visual feedback
        setTimeout(() => {
            const card = this._elements.projectsGrid.querySelector(`[data-id="${moved.id}"]`);
            if (card) {
                card.classList.add('selected');
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                setTimeout(() => card.classList.remove('selected'), 1500);
            }
        }, 50);
    }

    // ==================== OPEN FOLDER ====================
    _openFolder(index) {
        if (!Number.isInteger(index) || index < 0 || index >= this.projects.length) return;
        this._openFolderIndex = index;
        const project = this.projects[index];
        project.lastOpened = new Date().toISOString();
        this.saveProjects();
        this.updateUI();
        const path = project.path || 'No path set';
        this._elements.openFolderPath.textContent = path;
        const looksFull = WINDOWS_DRIVE_REGEX.test(path) || UNIX_PATH_REGEX.test(path);
        this._elements.openFolderPathWarning.style.display = looksFull ? 'none' : 'block';
        this._openModal('openFolder');
    }

    _copyPath() {
        const path = this._elements.openFolderPath.textContent;
        navigator.clipboard.writeText(path).then(() => {
            this.showToast('Path copied to clipboard!', 'success');
        }).catch(() => {
            this.showToast('Failed to copy path.', 'error');
        });
    }

    // Asks the local server (server.js, started by start.bat) to actually
    // launch the app. Returns { available: false } if that server isn't the
    // one serving this page (e.g. it was opened via a different static
    // host) — the caller then falls back to a browser URI scheme instead.
    _getToolExecutable(tool) {
        if (tool === 'android-studio') return this.androidStudioPath.trim() || null;
        if (tool === 'vscode') return this.vscodePath.trim() || null;
        return null;
    }

    async _detectProjectType(path) {
        try {
            const response = await fetch('/api/project-type', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
            if (!response.ok) {
                const data = await response.json();
                console.error('Project type detection failed:', data.error || response.statusText);
                return null;
            }
            const data = await response.json();
            return typeof data.type === 'string' ? data.type : null;
        } catch (error) {
            console.warn('Project type detection is unavailable:', error);
            return null;
        }
    }

    async _refreshMissingProjectTypes() {
        const missing = this.projects.filter(project => !project.projectType || project.projectType === 'Unknown');
        if (missing.length === 0) return;

        const detected = await Promise.all(missing.map(async project => ({
            project,
            type: await this._detectProjectType(project.path)
        })));
        let changed = false;
        detected.forEach(({ project, type }) => {
            if (type && this.projects.includes(project)) {
                project.projectType = type;
                changed = true;
            }
        });
        if (changed) {
            this.saveProjects();
            this.updateUI();
        }
    }

    async _callLocalOpenApi(tool, targetPath) {
        try {
            const res = await fetch('/api/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tool, path: targetPath, executable: this._getToolExecutable(tool) })
            });
            const data = await res.json().catch(() => ({}));
            return { available: true, ok: !!data.ok, error: data.error };
        } catch {
            return { available: false, ok: false };
        }
    }

    _getOpenFolderPath() {
        const path = this._elements.openFolderPath.textContent;
        if (!path || path === 'No path set') {
            this.showToast('No path set for this project.', 'error');
            return null;
        }
        return path;
    }

    async _openInExplorer() {
        const path = this._getOpenFolderPath();
        if (!path) return;
        const result = await this._callLocalOpenApi('explorer', path);
        if (result.available) {
            if (result.ok) this.showToast('Opened in File Explorer!', 'success');
            else this.showToast(result.error, 'error', TOAST_DURATION.error);
            return;
        }
        // No local server (app not launched via start.bat) — copy the path
        // as the best fallback we've got.
        this._copyPath();
        this.showToast('Path copied! (Run via start.bat for one-click opening.) Press Win+R and paste to open.', 'info', TOAST_DURATION.info);
    }

    _buildVscodeUri(path) {
        const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '');
        const folderPath = normalized.endsWith(':') ? `${normalized}/` : `${normalized}/`;
        return /^[A-Za-z]:/.test(folderPath)
            ? `vscode://file/${folderPath}`
            : `vscode://file${folderPath.startsWith('/') ? folderPath : '/' + folderPath}`;
    }

    async _openInVSCode() {
        const path = this._getOpenFolderPath();
        if (!path) return;
        const result = await this._callLocalOpenApi('vscode', path);
        if (result.available) {
            if (result.ok) this.showToast('Opened in VS Code!', 'success');
            else this.showToast(result.error, 'error', TOAST_DURATION.error);
            return;
        }
        window.location.href = this._buildVscodeUri(path);
        this.showToast('Opening in VS Code via link… (run via start.bat for a more reliable open)', 'info', TOAST_DURATION.info);
    }

    async _openInAndroidStudio() {
        const path = this._getOpenFolderPath();
        if (!path) return;
        const result = await this._callLocalOpenApi('android-studio', path);
        if (result.available) {
            if (result.ok) this.showToast('Opened in Android Studio!', 'success');
            else this.showToast(result.error, 'error', TOAST_DURATION.error);
            return;
        }
        const normalized = path.replace(/\\/g, '/');
        window.location.href = `jetbrains://studio/navigate/reference?project=${encodeURIComponent(normalized)}`;
        this.showToast('Opening in Android Studio via link… (run via start.bat for a more reliable open)', 'info', TOAST_DURATION.info);
    }

    async _previewProject() {
        if (this._openFolderIndex < 0 || this._openFolderIndex >= this.projects.length) return;
        const project = this.projects[this._openFolderIndex];

        if (project.url && project.url.trim()) {
            this._openIntegratedPreview(project);
            return;
        }

        // No URL set — fall back to finding a static index.html and opening
        // it externally (can't reliably embed a local file:// in an iframe
        // from an http(s) page, so this stays an external open).
        const path = this._getOpenFolderPath();
        if (!path) return;
        const result = await this._callLocalOpenApi('preview-web', path);
        if (result.available) {
            if (result.ok) this.showToast('Opened preview in your browser!', 'success');
            else this.showToast(`${result.error} Tip: add a Preview URL on the project to see it inline instead.`, 'error', TOAST_DURATION.error);
            return;
        }
        this.showToast('Preview needs the local server — run this app via start.bat.', 'info', TOAST_DURATION.info);
    }

    _openIntegratedPreview(project) {
        const url = this._normalizeUrl(project.url);
        this._elements.previewModalTitle.textContent = `Preview — ${project.name}`;
        this._elements.previewFrame.src = url;
        this._elements.previewOpenExternalBtn.onclick = () => window.open(url, '_blank', 'noopener');
        this._openModal('preview');
    }

    _refreshPreviewFrame() {
        const frame = this._elements.previewFrame;
        if (frame.src) frame.src = frame.src;
    }

    _normalizeUrl(url) {
        const trimmed = url.trim();
        return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    }

    // ==================== SETTINGS ====================
    _openSettings() {
        this._elements.projectsRootInput.value = this.projectsRoot;
        this._elements.androidStudioInput.value = this.androidStudioPath;
        this._elements.vscodeInput.value = this.vscodePath;
        this._openModal('settings');
        this._elements.projectsRootInput.focus();
    }

    _saveSettings() {
        const root = this._elements.projectsRootInput.value.trim();
        const androidStudio = this._elements.androidStudioInput.value.trim();
        const vscode = this._elements.vscodeInput.value.trim();

        this.projectsRoot = root;
        this.androidStudioPath = androidStudio;
        this.vscodePath = vscode;

        if (root) localStorage.setItem(PROJECTS_ROOT_KEY, root);
        else localStorage.removeItem(PROJECTS_ROOT_KEY);
        if (androidStudio) localStorage.setItem(ANDROID_STUDIO_PATH_KEY, androidStudio);
        else localStorage.removeItem(ANDROID_STUDIO_PATH_KEY);
        if (vscode) localStorage.setItem(VS_CODE_PATH_KEY, vscode);
        else localStorage.removeItem(VS_CODE_PATH_KEY);

        this.closeModal('settings');
        this.showToast('Settings saved.', 'success');
    }

    // ==================== PROJECT OVERVIEW ====================
    _showOverview(index) {
        if (index < 0 || index >= this.projects.length) return;
        const project = this.projects[index];
        this._elements.overviewTitle.textContent = project.name;
        this._elements.overviewBody.innerHTML = this._renderMarkdown(project.readme);
        this._openModal('overview');
    }

    // Minimal, dependency-free Markdown → HTML for displaying a project's
    // full README. Escapes first, then applies a small set of transforms —
    // not a complete CommonMark implementation, but covers what real
    // READMEs actually use (headings, bold/italic, inline code, fenced code
    // blocks, links, simple lists).
    _renderMarkdown(md) {
        if (!md || !md.trim()) return '<p class="readme-empty">No README content stored for this project.</p>';

        const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const inlineFmt = t => t
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        const lines = escape(md).split(/\r?\n/);
        let html = '';
        let inCode = false;
        let codeBuf = [];
        let inList = false;
        const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };

        for (const line of lines) {
            if (line.trim().startsWith('```')) {
                if (inCode) { html += `<pre><code>${codeBuf.join('\n')}</code></pre>`; codeBuf = []; inCode = false; }
                else { closeList(); inCode = true; }
                continue;
            }
            if (inCode) { codeBuf.push(line); continue; }

            const heading = line.match(/^(#{1,6})\s+(.+)$/);
            if (heading) {
                closeList();
                const level = Math.min(heading[1].length + 1, 6);
                html += `<h${level}>${inlineFmt(heading[2])}</h${level}>`;
                continue;
            }

            const listItem = line.match(/^\s*[-*]\s+(.+)$/);
            if (listItem) {
                if (!inList) { html += '<ul>'; inList = true; }
                html += `<li>${inlineFmt(listItem[1])}</li>`;
                continue;
            }

            closeList();
            if (!line.trim()) continue;
            html += `<p>${inlineFmt(line)}</p>`;
        }
        closeList();
        if (inCode && codeBuf.length) html += `<pre><code>${codeBuf.join('\n')}</code></pre>`;
        return html;
    }

    // ==================== LOCAL SERVER REACHABILITY ====================
    async _checkLocalServer() {
        try {
            const res = await fetch('/api/health');
            if (res.ok) return;
            throw new Error('unhealthy');
        } catch {
            this.showToast(
                'One-click open (VS Code / Explorer / Android Studio) needs the local server — run start.bat to enable it.',
                'info',
                TOAST_DURATION.info
            );
        }
    }

    // ==================== BROWSE FOLDER ====================
    // Uses a plain <input type="file" webkitdirectory> instead of the File
    // System Access API: it works in every modern browser (Chrome, Edge,
    // Firefox, Safari) without secure-context/iframe restrictions, unlike
    // showDirectoryPicker which is Chromium-only and can silently fail in
    // embedded/iframe contexts.
    async _browseFolder() {
    this._elements.pathFileInput.click();
}

    async _handleFolderFilesSelected(e) {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (files.length === 0) return;

        const folderName = (files[0].webkitRelativePath || files[0].name).split('/')[0];
        this._elements.projectPath.value = this._buildProjectPath(folderName);
        if (this.projectsRoot.trim()) this._verifyPath();
        else this._clearPathVerifyStatus();

        const readmeFile = this._findReadmeFile(files);

        if (readmeFile) {
            try {
                const content = await readmeFile.text();
                this._pendingReadme = content;
                const extracted = this._extractFromReadme(content);
                if (extracted.name) this._elements.projectName.value = extracted.name;
                if (extracted.description) this._elements.projectDescription.value = extracted.description;
                const relPath = readmeFile.webkitRelativePath || readmeFile.name;
                this.showToast(`README auto-filled from "${relPath}". Confirm the full path below.`, 'info', TOAST_DURATION.info);
            } catch {
                this.showToast(`Selected "${folderName}", but couldn't read its README.`, 'error');
            }
        } else {
            this.showToast(`No README found anywhere in "${folderName}" (searched all subfolders). Use "Browse README" below to pick one manually.`, 'info', TOAST_DURATION.info);
            const readmeBtn = this._elements.browseReadmeBtn;
            readmeBtn.classList.add('attention');
            readmeBtn.focus();
            setTimeout(() => readmeBtn.classList.remove('attention'), 1800);
        }

        this._elements.projectPath.focus();
        this._elements.projectPath.select();
    }

    // If a Projects Root is configured, join it with the bare folder name a
    // browser can give us to produce a real, usable absolute path. Otherwise
    // fall back to just the bare name (the user will need to complete it).
    // Note: this only ever guesses Root\FolderName — if the real project is
    // nested deeper (Root\Category\FolderName), the guess will be wrong and
    // needs manual correction. That's what Verify Path is for.
    _looksLikeAbsolutePath(value) {
        return WINDOWS_DRIVE_REGEX.test(value) || UNIX_PATH_REGEX.test(value) || /^\\\\/.test(value);
    }

    _buildProjectPath(folderName) {
        const rawName = String(folderName || '').trim();
        if (!rawName) return '';
        if (this._looksLikeAbsolutePath(rawName)) return rawName;

        const root = this.projectsRoot.trim();
        if (!root) return rawName;

        const cleanedName = rawName.replace(/^[\\/]+/, '').replace(/[\\/]+$/, '');
        const trimmedRoot = root.replace(/[\\/]+$/, '');
        const separator = trimmedRoot.includes('\\') ? '\\' : '/';
        return `${trimmedRoot}${separator}${cleanedName}`;
    }

    _resolveProjectPath(pathValue) {
        const raw = String(pathValue || '').trim();
        if (!raw) return '';
        if (this._looksLikeAbsolutePath(raw)) return raw.replace(/[\\/]+$/, '');

        const root = this.projectsRoot.trim();
        if (!root) return raw.replace(/[\\/]+$/, '');

        const trimmedRoot = root.replace(/[\\/]+$/, '');
        const cleanedRaw = raw.replace(/^[\\/]+/, '').replace(/[\\/]+$/, '');
        const separator = trimmedRoot.includes('\\') ? '\\' : '/';
        return `${trimmedRoot}${separator}${cleanedRaw}`;
    }

    _clearPathVerifyStatus() {
        const el = this._elements.pathVerifyStatus;
        el.textContent = '';
        el.className = 'form-hint path-verify-status';
    }

    async _verifyPath() {
        const path = this._elements.projectPath.value.trim();
        const el = this._elements.pathVerifyStatus;
        if (!path) { this._clearPathVerifyStatus(); return; }

        el.textContent = 'Checking…';
        el.className = 'form-hint path-verify-status checking';

        try {
            const res = await fetch('/api/verify-path', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
            const data = await res.json();
            el.textContent = data.exists ? `✅ ${data.message}` : `❌ ${data.message}`;
            el.className = `form-hint path-verify-status ${data.exists ? 'found' : 'not-found'}`;
        } catch {
            el.textContent = 'Can\'t verify — the local server isn\'t running (run via start.bat to enable this).';
            el.className = 'form-hint path-verify-status checking';
        }
    }

    // Searches the whole selected folder tree (not just the top level) for
    // a README, matching README / README.md / README.markdown / README.txt
    // case-insensitively. When there are several, prefers the shallowest one
    // (closest to the project root), and among equally-shallow matches
    // prefers Markdown over plain text.
    _findReadmeFile(files) {
        const README_RE = /^readme(\.(md|markdown|txt))?$/i;
        const candidates = files
            .map(f => {
                const parts = (f.webkitRelativePath || f.name).split('/');
                const filename = parts[parts.length - 1];
                if (!README_RE.test(filename)) return null;
                return {
                    file: f,
                    depth: parts.length,
                    isMarkdown: /\.(md|markdown)$/i.test(filename) ? 0 : 1
                };
            })
            .filter(Boolean)
            .sort((a, b) => (a.depth - b.depth) || (a.isMarkdown - b.isMarkdown));
        return candidates.length ? candidates[0].file : null;
    }

    // ==================== README EXTRACTION ====================
    async _handleReadmeFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const content = await file.text();
            this._elements.pasteReadmeContent.value = content;
            this._updatePastePreview();
            this.closeModal('pasteReadme');
            this._openModal('pasteReadme');
        } catch (error) {
            this.showToast('Failed to read README file.', 'error');
        }
        e.target.value = '';
    }

    _openPasteReadmeModal() {
        this._elements.pasteReadmeContent.value = '';
        this._elements.pastePreviewName.textContent = '—';
        this._elements.pastePreviewDesc.textContent = '—';
        this._openModal('pasteReadme');
        this._elements.pasteReadmeContent.focus();
    }

    _updatePastePreview() {
        const content = this._elements.pasteReadmeContent.value;
        if (!content.trim()) {
            this._elements.pastePreviewName.textContent = '—';
            this._elements.pastePreviewDesc.textContent = '—';
            return;
        }
        const extracted = this._extractFromReadme(content);
        this._elements.pastePreviewName.textContent = extracted.name || '—';
        this._elements.pastePreviewDesc.textContent = extracted.description || '—';
    }

    _usePasteReadme() {
        const content = this._elements.pasteReadmeContent.value;
        if (!content.trim()) { this.showToast('Please paste some README content first.', 'error'); return; }
        const extracted = this._extractFromReadme(content);
        if (!extracted.name) { this.showToast('Could not extract project name from README.', 'error'); return; }
        this._elements.projectName.value = extracted.name;
        this._elements.projectDescription.value = extracted.description || '';
        this._pendingReadme = content;
        this.closeModal('pasteReadme');
        this.showToast(`Extracted: "${extracted.name}"`, 'success');
        this._elements.projectName.focus();
    }

    _extractFromReadme(content) {
        if (!content || content.length > MAX_README_SIZE) return { name: null, description: null };
        const lines = content.split(/\r?\n/);
        let name = null, description = null, firstLine = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (!firstLine) firstLine = trimmed;

            const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
            if (headingMatch && !name) { name = headingMatch[1].trim(); continue; }

            if (trimmed.startsWith('```') || trimmed.startsWith('![') || trimmed.startsWith('>') || trimmed.startsWith('---') || trimmed.startsWith('***')) continue;

            if (!description && name && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
                let clean = trimmed.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1').replace(/\[(.+?)\]\(.+?\)/g, '$1');
                if (clean.length > 20) { description = clean; break; }
            }
        }

        // Plain-text README (e.g. README.txt) with no markdown heading:
        // fall back to the first line as the name and the next substantial
        // line as the description.
        if (!name && firstLine) {
            name = firstLine.replace(/^#+\s*/, '').slice(0, MAX_NAME_LENGTH);
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === firstLine) continue;
                if (trimmed.length > 20) { description = trimmed; break; }
            }
        }

        return { name, description };
    }

    // ==================== IMPORT / EXPORT ====================
    async _handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.name.endsWith('.json')) { this.showToast('Please select a valid JSON file (.json).', 'error'); e.target.value = ''; return; }

        try {
            const content = await file.text();
            const data = JSON.parse(content);
            let imported = Array.isArray(data) ? data : (data.projects && Array.isArray(data.projects) ? data.projects : []);
            if (imported.length === 0) { this.showToast('No projects found in file.', 'error'); e.target.value = ''; return; }

            // Sanitize: new IDs, truncate fields; skip anything without a usable path
            const existingPaths = new Set(this.projects.map(p => this._normalizeProjectPath(p.path)));
            const sanitized = [];
            let skipped = 0;
            for (const p of imported) {
                const path = String(p.path || '').slice(0, MAX_PATH_LENGTH);
                const normalizedPath = this._normalizeProjectPath(path);
                if (!normalizedPath || existingPaths.has(normalizedPath)) { skipped++; continue; }
                existingPaths.add(normalizedPath);
                sanitized.push({
                    id: this._generateId(),
                    name: String(p.name || 'Unnamed').slice(0, MAX_NAME_LENGTH),
                    path,
                    description: String(p.description || '').slice(0, MAX_DESCRIPTION_LENGTH),
                    dateAdded: p.dateAdded || new Date().toISOString(),
                    pinned: p.pinned === true,
                    url: String(p.url || '').slice(0, MAX_PATH_LENGTH),
                    readme: String(p.readme || '').slice(0, MAX_README_SIZE),
                    projectType: String(p.projectType || '').slice(0, 50) || undefined,
                    status: ['new', 'working', 'finished'].includes(p.status) ? p.status : 'working'
                });
            }

            if (sanitized.length === 0) { this.showToast('Nothing new to import (all duplicates or invalid).', 'error'); e.target.value = ''; return; }

            this.projects = [...sanitized, ...this.projects];
            this.saveProjects();
            this.updateUI();
            this._refreshMissingProjectTypes();
            const skippedText = skipped > 0 ? ` (${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped)` : '';
            this.showToast(`Imported ${sanitized.length} project${sanitized.length !== 1 ? 's' : ''}!${skippedText}`, 'success');
        } catch (error) {
            console.error('Import error:', error);
            this.showToast('Failed to import. Invalid file format.', 'error');
        }
        e.target.value = '';
    }

    exportProjects() {
        if (this.projects.length === 0) { this.showToast('No projects to export.', 'error'); return; }
        const data = { version: 5, exportedAt: new Date().toISOString(), appVersion: APP_VERSION, projects: this.projects };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hydev-projects-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast(`Exported ${this.projects.length} projects!`, 'success');
    }

    // ==================== THEME ====================
    _loadTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark') this.theme = saved;
        else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) this.theme = 'light';
        this._applyTheme();
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem(THEME_KEY, this.theme);
        this._applyTheme();
    }

    _applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const icon = this._elements.themeIcon;
        if (icon) icon.textContent = this.theme === 'dark' ? '🌙' : '☀️';
    }

    // ==================== MODALS ====================
    _openModal(modalKey) {
        const modal = document.getElementById(MODAL_IDS[modalKey]);
        if (!modal) return;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        this._trapFocus(modal);
        document.body.style.overflow = 'hidden';
    }

    closeModal(modalKey) {
        const modal = document.getElementById(MODAL_IDS[modalKey]);
        if (!modal) return;
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        this._releaseFocusTrap(modal.id);
        document.body.style.overflow = '';
        if (modalKey === 'preview' && this._elements.previewFrame) {
            this._elements.previewFrame.src = 'about:blank';
        }
    }

    _setModalTitle(modalKey, title) {
        const modal = document.getElementById(MODAL_IDS[modalKey]);
        if (!modal) return;
        const titleEl = modal.querySelector('.modal-title');
        if (titleEl) titleEl.textContent = title;
    }

    _trapFocus(modal) {
        const modalId = modal.id;
        this._releaseFocusTrap(modalId);

        const focusableSelectors = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const handler = e => {
            if (e.key !== 'Tab') return;
            const focusable = [...modal.querySelectorAll(focusableSelectors)];
            if (!focusable.length) return;
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };

        modal.addEventListener('keydown', handler);
        this.modalKeydownHandlers.set(modalId, handler);
    }

    _releaseFocusTrap(modalId) {
        const handler = this.modalKeydownHandlers.get(modalId);
        if (handler) {
            const modal = document.getElementById(modalId);
            if (modal) modal.removeEventListener('keydown', handler);
            this.modalKeydownHandlers.delete(modalId);
        }
    }

    // ==================== PWA ====================
    async _initPWA() {
        // Register the service worker (classic script — broadest browser support;
        // module workers aren't reliably supported everywhere yet).
        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registered:', reg.scope);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }

        const btn = this._elements.installBtn;
        if (!btn) return;

        // If we're already running as an installed app, there's nothing to do.
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (isStandalone) return;

        // Show the button unconditionally. Chrome only fires
        // 'beforeinstallprompt' when it decides the moment is right (and won't
        // fire it at all if it already decided the site isn't installable, or
        // if the user dismissed it before) — so we can't rely on that event
        // alone to reveal the button. If the native prompt never arrives,
        // clicking still gives the person manual install instructions.
        btn.classList.add('visible');
        btn.addEventListener('click', () => this._handleInstallClick());

        window.addEventListener('beforeinstallprompt', e => {
            e.preventDefault();
            this._deferredPrompt = e;
        });

        window.addEventListener('appinstalled', () => {
            this._deferredPrompt = null;
            btn.classList.remove('visible');
            this.showToast('HYDEV Project Manager installed!', 'success');
        });
    }

    async _handleInstallClick() {
        if (this._deferredPrompt) {
            this._deferredPrompt.prompt();
            const { outcome } = await this._deferredPrompt.userChoice;
            if (outcome === 'accepted') this._elements.installBtn.classList.remove('visible');
            this._deferredPrompt = null;
            return;
        }
        this.showToast(`Manual install: ${this._manualInstallInstructions()}`, 'info', 9000);
    }

    _manualInstallInstructions() {
        const ua = navigator.userAgent;
        if (/Edg\//.test(ua)) return 'Open the ⋯ menu → Apps → "Install this site as an app".';
        if (/Chrome\//.test(ua)) return 'Click the ⊕ install icon in the address bar, or the ⋮ menu → "Install HYDEV Project Manager…".';
        if (/Firefox\//.test(ua)) return 'Firefox desktop doesn\'t support installing PWAs — try Chrome or Edge instead.';
        if (/Safari\//.test(ua) && /Mobile|iPhone|iPad/.test(ua)) return 'Tap the Share icon, then "Add to Home Screen".';
        return 'Look for an install icon in your address bar, or an "Install app" / "Add to Home Screen" option in your browser menu.';
    }

    // ==================== TOAST ====================
    showToast(message, type = 'info', duration = TOAST_DURATION[type] || 3000) {
        const container = this._elements.toastContainer;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('toast-show'));
        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // ==================== UTILITIES ====================
    _generateId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    _normalizeProjectPath(path) {
        return String(path || '')
            .trim()
            .replace(/[\\/]+$/, '')
            .replace(/\\/g, '/')
            .toLowerCase();
    }

    _dedupeProjects(projects) {
        const paths = new Set();
        return projects.filter(project => {
            const path = this._normalizeProjectPath(project.path);
            if (!path || paths.has(path)) return false;
            paths.add(path);
            return true;
        });
    }

    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    _formatDate(isoString) {
        if (!isoString) return 'Unknown';
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);

        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHr < 24) return `${diffHr}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

// Initialize app
const app = new ProjectManager();
window.app = app;