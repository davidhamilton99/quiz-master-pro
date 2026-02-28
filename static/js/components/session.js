/* Session Engine — computes and manages personalized study sessions */
import { apiCall } from '../services/api.js';

let _sessionCache = null;
let _sessionLoadedAt = null;
const SESSION_TTL_MS = 5 * 60 * 1000; // refresh every 5 minutes

/**
 * Fetch session plan from the server.
 * Returns { blocks: [], context: {} }
 */
export async function fetchSessionPlan() {
    try {
        const data = await apiCall('/session/plan');
        _sessionCache = data.session;
        _sessionLoadedAt = Date.now();
        return _sessionCache;
    } catch (e) {
        console.warn('Session plan fetch failed:', e);
        return _sessionCache || { blocks: [], context: {} };
    }
}

/**
 * Get cached session or fetch fresh one.
 */
export async function getSessionPlan(forceRefresh = false) {
    if (!forceRefresh && _sessionCache && _sessionLoadedAt &&
        (Date.now() - _sessionLoadedAt) < SESSION_TTL_MS) {
        return _sessionCache;
    }
    return fetchSessionPlan();
}

/**
 * Invalidate session cache (call after completing a quiz/SRS review).
 */
export function invalidateSession() {
    _sessionCache = null;
    _sessionLoadedAt = null;
}

/**
 * Start a domain-targeted quiz via the session engine.
 */
export async function startDomainQuiz(domainId, count = 15) {
    const data = await apiCall('/session/domain-quiz', {
        method: 'POST',
        body: JSON.stringify({ domain_id: domainId, count }),
    });
    return data.quiz;
}
