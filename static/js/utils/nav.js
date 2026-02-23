/* Shared Navigation - 4-zone app nav + mobile tab bar */
import { getState } from '../state.js';
import { escapeHtml } from './dom.js';
import { icon } from './icons.js';
import { getLevelInfo } from '../state.js';

export function renderNav(activeView) {
    const state = getState();
    const levelInfo = getLevelInfo();

    return `
    <header class="app-header">
        <div class="container">
            <div class="header-top">
                <div class="brand" onclick="window.app.navigate('home')" style="cursor:pointer">
                    <div class="brand-logo">${icon('graduationCap', 'icon-lg')}</div>
                    <span class="brand-name">Quiz Master Pro</span>
                </div>

                <nav class="header-nav">
                    <button class="nav-link ${activeView === 'home' ? 'active' : ''}" onclick="window.app.navigate('home')">
                        <span class="nav-icon">${icon('home')}</span>
                        <span class="nav-text">Home</span>
                    </button>
                    <button class="nav-link ${activeView === 'study' ? 'active' : ''}" onclick="window.app.navigate('study')">
                        <span class="nav-icon">${icon('library')}</span>
                        <span class="nav-text">Study</span>
                    </button>
                    <button class="nav-link ${activeView === 'readiness' ? 'active' : ''}" onclick="window.app.navigate('readiness')">
                        <span class="nav-icon">${icon('barChart')}</span>
                        <span class="nav-text">Readiness</span>
                    </button>
                    <button class="nav-link ${activeView === 'community' ? 'active' : ''}" onclick="window.app.navigate('community')">
                        <span class="nav-icon">${icon('globe')}</span>
                        <span class="nav-text">Community</span>
                    </button>
                </nav>

                <div class="header-actions">
                    <button class="btn btn-primary" onclick="window.app.showCreateOptions()">
                        ${icon('plus')}
                        <span class="btn-text-desktop">Create</span>
                    </button>
                    <div class="user-menu">
                        <button class="user-avatar" onclick="window.app.toggleMenu()">
                            <span class="avatar-initial">${state.user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                            <span class="avatar-chevron">▾</span>
                        </button>
                        <div id="user-menu" class="dropdown-menu hidden">
                            <div class="dropdown-header">
                                <div class="dropdown-user-name">${escapeHtml(state.user?.username || 'User')}</div>
                                <div class="dropdown-user-level">Level ${levelInfo.level || 1}</div>
                            </div>
                            <div class="dropdown-divider"></div>
                            <button class="dropdown-item" onclick="window.app.showImportModal()">
                                ${icon('download')} Import Quiz
                            </button>
                            <div class="dropdown-divider"></div>
                            <button class="dropdown-item text-danger" onclick="window.app.logout()">
                                ${icon('logOut')} Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- Mobile Bottom Tab Bar -->
    <nav class="mobile-tab-bar">
        <button class="tab-item ${activeView === 'home' ? 'active' : ''}" onclick="window.app.navigate('home')">
            <span class="tab-icon">${icon('home')}</span>
            <span class="tab-label">Home</span>
        </button>
        <button class="tab-item ${activeView === 'study' ? 'active' : ''}" onclick="window.app.navigate('study')">
            <span class="tab-icon">${icon('library')}</span>
            <span class="tab-label">Study</span>
        </button>
        <button class="tab-item tab-create-btn" onclick="window.app.showCreateOptions()">
            <span class="tab-create-icon">${icon('plus')}</span>
        </button>
        <button class="tab-item ${activeView === 'readiness' ? 'active' : ''}" onclick="window.app.navigate('readiness')">
            <span class="tab-icon">${icon('barChart')}</span>
            <span class="tab-label">Readiness</span>
        </button>
        <button class="tab-item ${activeView === 'community' ? 'active' : ''}" onclick="window.app.navigate('community')">
            <span class="tab-icon">${icon('globe')}</span>
            <span class="tab-label">Community</span>
        </button>
    </nav>
    `;
}
