/* Immersive Onboarding — cert → exam date → first session */
import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { getCertifications, enrollCertification, getUserCertifications } from '../services/api.js';
import { showToast } from '../utils/toast.js';

let _certResults = [];
let _searchQuery = '';
let _selectedCert = null;
let _step = 1; // 1 = pick cert, 2 = pick date, 3 = ready

/**
 * Check if user needs immersive onboarding (no certs enrolled).
 */
export function needsImmersiveOnboarding() {
    const state = getState();
    const certs = state.userCertifications;
    // undefined = cert data not yet loaded; don't trigger onboarding until confirmed empty
    if (!Array.isArray(certs)) return false;
    return certs.length === 0;
}

/**
 * Reset onboarding state.
 */
export function resetOnboardingV2() {
    _certResults = [];
    _searchQuery = '';
    _selectedCert = null;
    _step = 1;
}

/**
 * Handle cert search input.
 */
export async function onboardingSearch(query) {
    _searchQuery = query;
    if (query.length < 1) {
        _certResults = [];
        rerenderOnboarding();
        return;
    }
    try {
        const certs = await getCertifications();
        const q = query.toLowerCase();
        _certResults = certs.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            (c.vendor || '').toLowerCase().includes(q)
        ).slice(0, 6);
    } catch (e) {
        _certResults = [];
    }
    rerenderOnboarding();
}

/**
 * Select a certification.
 */
export function onboardingSelectCert(certId) {
    const cert = _certResults.find(c => c.id === certId);
    if (cert) {
        _selectedCert = cert;
        _step = 2;
        rerenderOnboarding();
    }
}

/**
 * Set exam date and enroll.
 */
export async function onboardingSetDate() {
    const input = document.getElementById('ob2-exam-date');
    const targetDate = input?.value || null;

    if (!_selectedCert) return;

    try {
        await enrollCertification(_selectedCert.id, targetDate);
        const userCerts = await getUserCertifications();
        setState({ userCertifications: userCerts }, true);
        _step = 3;
        rerenderOnboarding();
    } catch (e) {
        showToast('Failed to enroll: ' + (e.message || ''), 'error');
    }
}

/**
 * Skip the date step.
 */
export async function onboardingSkipDate() {
    if (!_selectedCert) return;
    try {
        await enrollCertification(_selectedCert.id, null);
        const userCerts = await getUserCertifications();
        setState({ userCertifications: userCerts }, true);
        _step = 3;
        rerenderOnboarding();
    } catch (e) {
        showToast('Failed to enroll: ' + (e.message || ''), 'error');
    }
}

/**
 * Finish onboarding → go to mission control.
 */
export function onboardingFinish() {
    resetOnboardingV2();
    setState({ view: 'mission-control' });
}

/**
 * Skip the entire onboarding, go directly to mission control.
 */
export function onboardingSkipAll() {
    resetOnboardingV2();
    setState({ view: 'mission-control' });
}

function rerenderOnboarding() {
    const container = document.getElementById('onboarding-v2-root');
    if (container) {
        container.innerHTML = renderOnboardingContent();
    }
}

function renderOnboardingContent() {
    if (_step === 1) return renderStep1();
    if (_step === 2) return renderStep2();
    return renderStep3();
}

function renderStep1() {
    const resultsHtml = _certResults.map(c => `
        <button class="ob2-cert-result" onclick="window.app.onboardingSelectCert(${c.id})">
            <div class="ob2-cert-info">
                <span class="ob2-cert-code">${escapeHtml(c.code)}</span>
                <span class="ob2-cert-name">${escapeHtml(c.name)}</span>
            </div>
            <span class="ob2-cert-vendor">${escapeHtml(c.vendor || '')}</span>
        </button>
    `).join('');

    return `
        <div class="ob2-step ob2-step-1">
            <h1 class="ob2-question">What exam are you preparing for?</h1>
            <div class="ob2-search-wrap">
                <input type="text"
                    class="ob2-search"
                    placeholder="Search certifications... (e.g. CCNA, Security+, AZ-900)"
                    value="${escapeHtml(_searchQuery)}"
                    oninput="window.app.onboardingSearch(this.value)"
                    autofocus>
            </div>
            ${_certResults.length > 0 ? `
                <div class="ob2-results">${resultsHtml}</div>
            ` : _searchQuery.length >= 2 ? `
                <p class="ob2-no-results">No certifications found. You can add one later from settings.</p>
            ` : ''}
            <button class="ob2-skip-link" onclick="window.app.onboardingSkipAll()">
                Skip — I'll explore on my own
            </button>
        </div>
    `;
}

function renderStep2() {
    const today = new Date().toISOString().split('T')[0];
    const threeMonths = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return `
        <div class="ob2-step ob2-step-2">
            <div class="ob2-cert-selected">
                <span class="ob2-selected-code">${escapeHtml(_selectedCert.code)}</span>
                <span class="ob2-selected-name">${escapeHtml(_selectedCert.name)}</span>
            </div>
            <h1 class="ob2-question">When is your exam?</h1>
            <p class="ob2-hint">This helps us pace your study sessions.</p>
            <div class="ob2-date-wrap">
                <input type="date" id="ob2-exam-date" class="ob2-date-input" min="${today}" value="${threeMonths}">
            </div>
            <div class="ob2-actions">
                <button class="ob2-primary-btn" onclick="window.app.onboardingSetDate()">
                    Set date and begin
                </button>
                <button class="ob2-skip-link" onclick="window.app.onboardingSkipDate()">
                    I don't have a date yet
                </button>
            </div>
        </div>
    `;
}

function renderStep3() {
    const state = getState();
    const certs = state.userCertifications || [];
    const cert = certs[0];
    let daysText = '';
    if (cert && cert.target_date) {
        try {
            const target = new Date(cert.target_date);
            const now = new Date();
            const days = Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
            daysText = `${days} days.`;
        } catch (e) {
            daysText = '';
        }
    }

    return `
        <div class="ob2-step ob2-step-3">
            ${daysText ? `
                <div class="ob2-countdown">${daysText}</div>
                <h1 class="ob2-question">Here's how we get you there.</h1>
            ` : `
                <h1 class="ob2-question">You're set up. Let's start studying.</h1>
            `}
            <p class="ob2-hint">Your first session is ready. Every time you come back, we'll have your next actions waiting.</p>
            <button class="ob2-primary-btn" onclick="window.app.onboardingFinish()">
                Begin first session
            </button>
        </div>
    `;
}

/**
 * Render the full onboarding view.
 */
export function renderOnboardingV2() {
    return `
        <div class="ob2-page">
            <div class="ob2-container" id="onboarding-v2-root">
                ${renderOnboardingContent()}
            </div>
        </div>
    `;
}
