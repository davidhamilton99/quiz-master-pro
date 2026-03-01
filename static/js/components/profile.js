/* Profile Component — Phase 4 */
import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { loadProfile } from '../services/api.js';

let _cache = null;
let _loading = false;

function memberSince(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

async function _load() {
    if (_loading) return;
    _loading = true;
    try {
        _cache = await loadProfile();
    } catch (e) {
        console.error('Failed to load profile:', e);
    }
    _loading = false;
    if (getState().view === 'profile') setState({});
}

export function renderProfile() {
    if (!_cache && !_loading) _load();

    const data = _cache;

    if (!data) {
        return `
        <div class="profile-page">
            <div class="profile-container">
                <div class="profile-loading">
                    <div class="spinner"></div>
                    <p class="text-muted">Loading profile…</p>
                </div>
            </div>
        </div>`;
    }

    const user    = data.user    || {};
    const profile = data.profile || {};
    const accuracy = profile.total_answered > 0
        ? Math.round((profile.total_correct / profile.total_answered) * 100)
        : 0;
    const initial = (user.username || 'U').charAt(0).toUpperCase();

    return `
    <div class="profile-page">
        <div class="profile-container">

            <!-- Profile Header -->
            <div class="profile-header">
                <div class="profile-avatar-lg">${escapeHtml(initial)}</div>
                <div class="profile-identity">
                    <h1 class="profile-username">${escapeHtml(user.username || 'User')}</h1>
                    ${user.created_at ? `<p class="profile-member-since">Member since ${memberSince(user.created_at)}</p>` : ''}
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="profile-stats-grid">
                <div class="profile-stat-card">
                    <div class="profile-stat-val">${(user.quiz_count || 0).toLocaleString()}</div>
                    <div class="profile-stat-lbl">Quizzes</div>
                </div>
                <div class="profile-stat-card">
                    <div class="profile-stat-val">${(profile.total_answered || 0).toLocaleString()}</div>
                    <div class="profile-stat-lbl">Questions Answered</div>
                </div>
                <div class="profile-stat-card">
                    <div class="profile-stat-val">${accuracy}%</div>
                    <div class="profile-stat-lbl">Accuracy</div>
                </div>
                <div class="profile-stat-card">
                    <div class="profile-stat-val">${profile.daily_streak || 0}</div>
                    <div class="profile-stat-lbl">Day Streak</div>
                </div>
                <div class="profile-stat-card">
                    <div class="profile-stat-val">${(profile.quizzes_completed || 0).toLocaleString()}</div>
                    <div class="profile-stat-lbl">Completed</div>
                </div>
                <div class="profile-stat-card">
                    <div class="profile-stat-val">${(profile.perfect_scores || 0).toLocaleString()}</div>
                    <div class="profile-stat-lbl">Perfect Scores</div>
                </div>
            </div>

            <!-- Account Section -->
            <div class="profile-section">
                <h2 class="profile-section-title">Account</h2>
                <div class="profile-menu-list">
                    <button class="profile-menu-item" onclick="window.app.showChangePassword()">
                        <span class="profile-menu-label">${icon('shield')} Change Password</span>
                        <span class="profile-menu-arrow">${icon('chevronRight')}</span>
                    </button>
                    <button class="profile-menu-item" onclick="window.app.navigate('mission-control')">
                        <span class="profile-menu-label">${icon('settings')} Account Settings</span>
                        <span class="profile-menu-arrow">${icon('chevronRight')}</span>
                    </button>
                    <button class="profile-menu-item profile-menu-danger" onclick="window.app.logout()">
                        <span class="profile-menu-label">${icon('logOut')} Sign Out</span>
                        <span class="profile-menu-arrow">${icon('chevronRight')}</span>
                    </button>
                </div>
            </div>

        </div>
    </div>
    `;
}

export function invalidateProfileCache() {
    _cache = null;
}
