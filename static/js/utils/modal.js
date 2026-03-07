/* Modal Utility - Shared modal creation and management */

import { icon } from './icons.js';

/**
 * Create and show a modal dialog.
 * @param {Object} opts
 * @param {string} opts.title - Modal title
 * @param {string} opts.body - Modal body HTML
 * @param {string} [opts.footer] - Modal footer HTML
 * @param {string} [opts.id] - Optional modal ID (removes previous instance)
 * @param {string} [opts.maxWidth] - Optional max-width CSS value
 * @param {string} [opts.className] - Additional CSS class for the modal-overlay
 * @param {Function} [opts.onMount] - Called with the overlay element after insertion
 * @returns {HTMLElement} The modal overlay element
 */
export function showModal({ title, body, footer, id, maxWidth, className, onMount }) {
    if (id) {
        const existing = document.getElementById(id);
        if (existing) existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay' + (className ? ' ' + className : '');
    if (id) overlay.id = id;

    overlay.innerHTML = `
        <div class="modal"${maxWidth ? ` style="max-width:${maxWidth}"` : ''} onclick="event.stopPropagation()">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="btn btn-ghost btn-icon" data-modal-close>${icon('x')}</button>
            </div>
            <div class="modal-body">${body}</div>
            ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
        </div>
    `;

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.closest('[data-modal-close]')) {
            overlay.remove();
        }
    });

    document.body.appendChild(overlay);
    if (onMount) onMount(overlay);
    return overlay;
}

/**
 * Show a confirmation dialog.
 * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled/dismissed.
 */
export function confirmModal({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
    return new Promise(resolve => {
        let resolved = false;
        const overlay = showModal({
            title,
            body: `<p>${message}</p>`,
            footer: `
                <button class="btn btn-secondary" data-modal-close>${cancelText}</button>
                <button class="btn btn-primary${danger ? ' danger' : ''}" data-action="confirm">${confirmText}</button>
            `,
        });

        // Dismiss = cancel
        const origClick = overlay.onclick;
        overlay.addEventListener('click', (e) => {
            if ((e.target === overlay || e.target.closest('[data-modal-close]')) && !resolved) {
                resolved = true;
                resolve(false);
            }
        });

        overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => {
            if (!resolved) {
                resolved = true;
                overlay.remove();
                resolve(true);
            }
        });
    });
}

/** Close all open modals */
export function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
}
