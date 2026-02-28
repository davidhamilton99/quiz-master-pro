/* Profile Component — Phase 4 */
import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { loadProfile } from '../services/api.js';

let _cache = null;
let _loading = false;

function xpProgress(xp, level) {
    // xpForLevel(n) = 100 * n * (n - 1)
    const xpAtLevel = 100 * level * (level - 1);
    const xpForNext = 200 * level;               // xpForLevel(level+1) - xpForLevel(level)
    const inLevel = Math.max(0, xp - xpAtLevel);
    const pct = Math.min(100, Math.round((inLevel / xpForNext) * 100));
    return { inLevel, xpForNext, pct };
}

function memberSince(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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
            <button class="btn btn-ghost mb-4" onclick="window.app.navigate('mission-control')">
                ${icon('arrowLeft')} Back
            </button>
            <div class="empty-state">
                <div class="spinner"></div>
                <p class="text-muted">Loading profile…</p>
            </div>
        </div>`;
    }

    const user    = data.user    || {};
    const profile = data.profile || {};
    const level   = profile.level  || 1;
    const xp      = profile.xp     || 0;
    const { inLevel, xpForNext, pct } = xpProgress(xp, level);
    const accuracy = profile.total_answered > 0
        ? Math.round((profile.total_correct / profile.total_answered) * 100)
        : 0;
    const initial = (user.username || 'U').charAt(0).toUpperCase();

    return `
    <div class="profile-page">
        <button class="btn btn-ghost mb-4" onclick="window.app.navigate('mission-control')">
            ${icon('arrowLeft')} Back
        </button>

        <!-- Hero -->
        <div class="profile-hero">
            <div class="profile-avatar-lg">${escapeHtml(initial)}</div>
            <div>
                <div class="profile-username">${escapeHtml(user.username || 'User')}</div>
                <div class="profile-meta text-muted">
                    <span class="badge badge-primary">Level ${level}</span>
                    ${user.created_at ? `<span>Member since ${memberSince(user.created_at)}</span>` : ''}
                </div>
            </div>
        </div>

        <!-- XP / Level Progress -->
        <div class="profile-card">
            <div class="profile-card-title">Level Progress</div>
            <div class="profile-level-row">
                <span class="text-muted">Lv ${level}</span>
                <div class="xp-bar-track" style="flex:1; margin: 0 0.75rem;">
                    <div class="xp-bar-fill" style="width: ${pct}%"></div>
                </div>
                <span class="text-muted">Lv ${level + 1}</span>
            </div>
            <div class="text-muted text-sm text-center mt-1">${inLevel.toLocaleString()} / ${xpForNext.toLocaleString()} XP</div>
        </div>

        <!-- Stats -->
        <div class="profile-card">
            <div class="profile-card-title">Stats</div>
            <div class="profile-stats-grid">
                <div>
                    <div class="profile-stat-val">${(user.quiz_count || 0).toLocaleString()}</div>
                    <div class="profile-stat-lbl">Quizzes</div>
                </div>
                <div>
                    <div class="profile-stat-val">${(profile.total_answered || 0).toLocaleString()}</div>
                    <div class="profile-stat-lbl">Questions</div>
                </div>
                <div>
                    <div class="profile-stat-val">${accuracy}%</div>
                    <div class="profile-stat-lbl">Accuracy</div>
                </div>
                <div>
                    <div class="profile-stat-val">${profile.daily_streak || 0}</div>
                    <div class="profile-stat-lbl">Day Streak</div>
                </div>
            </div>
        </div>

        <!-- Extra -->
        <div class="profile-card">
            <div class="profile-stats-grid">
                <div>
                    <div class="profile-stat-val">${(profile.perfect_scores || 0).toLocaleString()}</div>
                    <div class="profile-stat-lbl">Perfect Scores</div>
                </div>
                <div>
                    <div class="profile-stat-val">${(profile.quizzes_completed || 0).toLocaleString()}</div>
                    <div class="profile-stat-lbl">Completed</div>
                </div>
                <div>
                    <div class="profile-stat-val">${(profile.gems || 0).toLocaleString()}</div>
                    <div class="profile-stat-lbl">Gems</div>
                </div>
                <div>
                    <div class="profile-stat-val">${xp.toLocaleString()}</div>
                    <div class="profile-stat-lbl">Total XP</div>
                </div>
            </div>
        </div>
    </div>
    `;
}

export function invalidateProfileCache() {
    _cache = null;
}
