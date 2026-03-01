/* Session Engine — computes and manages personalized study sessions */
import { apiCall } from '../services/api.js';

let _sessionCache = null;
let _sessionLoadedAt = null;
let _sessionCertId = null;
const SESSION_TTL_MS = 5 * 60 * 1000; // refresh every 5 minutes

/**
 * Fetch session plan from the server.
 * Returns { blocks: [], context: {} }
 */
export async function fetchSessionPlan(certId = null) {
    try {
        const qs = certId ? `?cert_id=${certId}` : '';
        const data = await apiCall(`/session/plan${qs}`);
        _sessionCache = data.session;
        _sessionLoadedAt = Date.now();
        _sessionCertId = certId;
        return _sessionCache;
    } catch (e) {
        console.warn('Session plan fetch failed:', e);
        return _sessionCache || { blocks: [], context: {} };
    }
}

/**
 * Get cached session or fetch fresh one.
 */
export async function getSessionPlan(forceRefresh = false, certId = null) {
    if (!forceRefresh && _sessionCache && _sessionLoadedAt &&
        _sessionCertId === certId &&
        (Date.now() - _sessionLoadedAt) < SESSION_TTL_MS) {
        return _sessionCache;
    }
    return fetchSessionPlan(certId);
}

/**
 * Invalidate session cache (call after completing a quiz/SRS review).
 */
export function invalidateSession() {
    _sessionCache = null;
    _sessionLoadedAt = null;
    _sessionCertId = null;
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
