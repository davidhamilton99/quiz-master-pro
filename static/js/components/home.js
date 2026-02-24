/* Home Screen - Personalised dashboard (Phase 2.1) */
import { getState, setState, getInProgressQuizzesCached, getProfile, getLevelInfo } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { renderNav } from '../utils/nav.js';
import { getWeakQuestions, getCertReadiness, getSrsStats } from '../services/api.js';

// Per-session cache
let _homeReadiness = null;   // { overall_score, ... } for primary cert
let _homeWeakQs = [];        // array of weak question records
let _homeSrsStats = null;    // SRS stats cache
let _homeDataLoaded = false;

/** Fetch home data asynchronously (runs once per session, re-fetches if cert changes) */
export async function loadHomeData(certId) {
    try {
        const [readiness, weakQs, srsStats] = await Promise.all([
            getCertReadiness(certId),
            getWeakQuestions(certId, 3),
            getSrsStats().catch(() => null),
        ]);
        _homeReadiness = readiness;
        _homeWeakQs = weakQs || [];
        _homeSrsStats = srsStats;
    } catch (e) {
        console.warn('Home data load failed:', e);
    }
    _homeDataLoaded = true;
}

/** Reset home cache (e.g. when user enrolls/unenrolls cert) */
export function resetHomeCache() {
    _homeReadiness = null;
    _homeWeakQs = [];
    _homeSrsStats = null;
    _homeDataLoaded = false;
}

export function renderHome() {
    const state = getState();
    const profile = getProfile();
    const levelInfo = getLevelInfo();
    const progressList = getInProgressQuizzesCached();
    const certs = state.userCertifications || [];
    const primaryCert = certs[0] || null;

    // Trigger async load if needed
    if (!_homeDataLoaded) {
        if (primaryCert) {
            loadHomeData(primaryCert.certification_id).then(() => {
                if (getState().view === 'home') setState({}, true);
            });
        } else {
            // Load SRS stats even without a cert
            getSrsStats().catch(() => null).then(stats => {
                _homeSrsStats = stats;
                _homeDataLoaded = true;
                if (getState().view === 'home') setState({}, true);
            });
        }
    }

    // Resume card - most recent in-progress quiz
    const resumeProgress = progressList[0] || null;
    const resumeQuiz = resumeProgress
        ? (state.quizzes || []).find(q => q.id === resumeProgress.quizId)
        : null;

    const readinessScore = _homeReadiness?.overall_score ?? null;

    return `
    ${renderNav('home')}

    <main class="home-main">
        <div class="container home-container">

            <!-- Greeting + Streak bar -->
            <div class="home-hero">
                <div class="home-greeting">
                    <h1>Welcome back, <span class="home-username">${escapeHtml(state.user?.username?.split(' ')[0] || 'there')}</span>!</h1>
                    <p class="text-muted">Let's keep the momentum going.</p>
                </div>
                <div class="home-streak-bar">
                    <div class="streak-pill">
                        <span>🔥</span>
                        <strong>${profile.dailyStreak || 0}</strong>
                        <span class="text-muted">streak</span>
                    </div>
                    <div class="streak-pill">
                        <strong>${(state.quizzes || []).length}</strong>
                        <span class="text-muted">sets</span>
                    </div>
                    <div class="streak-pill">
                        <strong>Lv ${levelInfo.level || 1}</strong>
                    </div>
                </div>
            </div>

            <!-- Resume card -->
            ${resumeQuiz ? `
            <section class="home-section">
                <h2 class="home-section-title">${icon('clock')} Continue Studying</h2>
                <div class="home-resume-card" onclick="window.app.startQuiz(${resumeQuiz.id})">
                    <div class="resume-ring">
                        <svg viewBox="0 0 36 36" class="ring-svg">
                            <path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                            <path class="ring-fill" stroke-dasharray="${Math.round((resumeProgress.questionIndex / Math.max(resumeQuiz.questions?.length || 1, 1)) * 100)}, 100"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                        </svg>
                        <div class="ring-pct">${Math.round((resumeProgress.questionIndex / Math.max(resumeQuiz.questions?.length || 1, 1)) * 100)}%</div>
                    </div>
                    <div class="resume-info">
                        <div class="resume-title">${escapeHtml(resumeQuiz.title)}</div>
                        <div class="resume-meta text-muted">Question ${resumeProgress.questionIndex + 1} of ${resumeQuiz.questions?.length || 0}</div>
                    </div>
                    <button class="btn btn-primary btn-sm">Continue →</button>
                </div>
            </section>
            ` : ''}

            <!-- SRS Review Card -->
            ${_homeSrsStats && _homeSrsStats.due_today > 0 ? `
            <section class="home-section">
                <h2 class="home-section-title">${icon('brain')} Spaced Repetition</h2>
                <div class="home-resume-card" onclick="window.app.startSrsReview()" style="cursor:pointer">
                    <div class="resume-ring">
                        <svg viewBox="0 0 36 36" class="ring-svg">
                            <path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                            <path class="ring-fill" stroke-dasharray="${_homeSrsStats.total_cards > 0 ? Math.round((_homeSrsStats.graduated / _homeSrsStats.total_cards) * 100) : 0}, 100"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                        </svg>
                        <div class="ring-pct">${_homeSrsStats.due_today}</div>
                    </div>
                    <div class="resume-info">
                        <div class="resume-title">${_homeSrsStats.due_today} card${_homeSrsStats.due_today !== 1 ? 's' : ''} due for review</div>
                        <div class="resume-meta text-muted">${_homeSrsStats.total_cards} total &middot; ${_homeSrsStats.graduated || 0} mastered</div>
                    </div>
                    <button class="btn btn-primary btn-sm">Review</button>
                </div>
            </section>
            ` : ''}

            <!-- Certification Readiness gauge -->
            ${certs.length > 0 ? `
            <section class="home-section">
                <div class="home-section-header">
                    <h2 class="home-section-title">${icon('barChart')} Readiness</h2>
                    <button class="btn btn-ghost btn-sm" onclick="window.app.navigate('readiness')">View all →</button>
                </div>
                <div class="home-certs-grid">
                    ${certs.slice(0, 3).map((cert, i) => {
                        const pct = (i === 0 && readinessScore !== null) ? readinessScore : 0;
                        const gaugeClass = pct >= 70 ? 'gauge-good' : pct >= 40 ? 'gauge-ok' : 'gauge-low';
                        const isLoading = (i === 0 && primaryCert && !_homeDataLoaded);
                        return `
                        <div class="home-cert-card" onclick="window.app.navigate('readiness')">
                            <div class="home-cert-gauge">
                                <svg viewBox="0 0 36 36" class="gauge-svg">
                                    <path class="gauge-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                                    <path class="gauge-arc ${gaugeClass}"
                                          stroke-dasharray="${isLoading ? 0 : pct}, 100"
                                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                                </svg>
                                <div class="gauge-label">${isLoading ? '…' : pct + '%'}</div>
                            </div>
                            <div class="home-cert-meta">
                                <div class="home-cert-name">${escapeHtml(cert.certification_name || cert.name || 'Cert')}</div>
                                <div class="home-cert-code text-muted">${escapeHtml(cert.certification_code || '')}</div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                    <div class="home-cert-card home-cert-add" onclick="window.app.showCertPicker()">
                        <div class="cert-add-icon">${icon('plus', 'icon-lg')}</div>
                        <div class="home-cert-meta text-muted">Add cert</div>
                    </div>
                </div>
            </section>
            ` : `
            <section class="home-section">
                <div class="home-enroll-prompt">
                    <div class="enroll-icon">${icon('barChart', 'icon-2xl')}</div>
                    <h3>Track your readiness</h3>
                    <p class="text-muted">Add a certification to see your readiness score and target weak areas</p>
                    <button class="btn btn-primary" onclick="window.app.showCertPicker()">
                        ${icon('plus')} Add Certification
                    </button>
                </div>
            </section>
            `}

            <!-- Today's Focus (weak questions) -->
            ${_homeWeakQs.length > 0 ? `
            <section class="home-section">
                <div class="home-section-header">
                    <h2 class="home-section-title">${icon('sparkles')} Today's Focus</h2>
                    <button class="btn btn-ghost btn-sm" onclick="window.app.navigate('readiness')">All weak areas →</button>
                </div>
                <div class="home-focus-list">
                    ${_homeWeakQs.slice(0, 3).map(q => {
                        const acc = Math.round(q.accuracy ?? 0);
                        return `
                        <div class="home-focus-item">
                            <div class="focus-left">
                                <div class="focus-domain">${escapeHtml(q.domain_name || q.topic || 'Topic')}</div>
                                <div class="focus-q text-muted">${escapeHtml((q.question_text || '').slice(0, 80))}${(q.question_text || '').length > 80 ? '…' : ''}</div>
                            </div>
                            <div class="focus-right">
                                <div class="focus-pct ${acc < 40 ? 'focus-danger' : acc < 65 ? 'focus-warn' : 'focus-ok'}">${acc}%</div>
                                <div class="text-muted" style="font-size:0.7rem">accuracy</div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </section>
            ` : `
            <section class="home-section">
                <div class="home-section-header">
                    <h2 class="home-section-title">${icon('sparkles')} Quick Start</h2>
                </div>
                <div class="home-quick-grid">
                    <button class="home-quick-btn" onclick="window.app.navigate('study')">
                        <span class="quick-icon">${icon('library', 'icon-lg')}</span>
                        <span class="quick-label">My Quizzes</span>
                    </button>
                    <button class="home-quick-btn" onclick="window.app.navigate('community')">
                        <span class="quick-icon">${icon('globe', 'icon-lg')}</span>
                        <span class="quick-label">Community</span>
                    </button>
                    <button class="home-quick-btn" onclick="window.app.showCreateOptions()">
                        <span class="quick-icon">${icon('plus', 'icon-lg')}</span>
                        <span class="quick-label">Create Quiz</span>
                    </button>
                    <button class="home-quick-btn" onclick="window.app.navigate('readiness')">
                        <span class="quick-icon">${icon('barChart', 'icon-lg')}</span>
                        <span class="quick-label">Readiness</span>
                    </button>
                </div>
            </section>
            `}

        </div>
    </main>

    <!-- Spacer for mobile tab bar -->
    <div class="mobile-tab-spacer"></div>
    `;
}
