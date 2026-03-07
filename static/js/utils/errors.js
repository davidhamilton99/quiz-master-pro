/* Error Handling Utility */

import { showToast } from './toast.js';

/**
 * Standard error handler.
 * @param {Error} err - The caught error
 * @param {string} userMessage - Friendly message for the user
 * @param {Object} [opts]
 * @param {boolean} [opts.silent=false] - If true, log only, no toast
 */
export function handleError(err, userMessage, { silent = false } = {}) {
    console.error(userMessage, err);
    if (!silent) {
        showToast(userMessage, 'error');
    }
}
