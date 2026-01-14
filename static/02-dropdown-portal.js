/* ============================================
   QUIZ MASTER PRO - MODULE 02: DROPDOWN PORTAL
   Portal-based dropdown to escape stacking contexts
   ============================================ */

/* ============================================
   PORTAL DROPDOWN SYSTEM
   Renders dropdown outside quiz card DOM to escape stacking context
   ============================================ */

const DropdownPortal = {
    container: null,
    menu: null,
    trigger: null,
    isOpen: false,
    
    init() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.id = 'dropdown-portal';
        document.body.appendChild(this.container);
        
        document.addEventListener('click', (e) => {
            if (!this.isOpen) return;
            if (this.menu && !this.menu.contains(e.target) && 
                this.trigger && !this.trigger.contains(e.target)) {
                this.close();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });
        
        let timeout;
        const reposition = () => { clearTimeout(timeout); timeout = setTimeout(() => this.position(), 10); };
        window.addEventListener('scroll', reposition, { passive: true, capture: true });
        window.addEventListener('resize', reposition);
    },
    
    open(triggerEl, quizId) {
        this.init();
        if (this.trigger === triggerEl && this.isOpen) { this.close(); return; }
        this.close(false);
        this.trigger = triggerEl;
        this.isOpen = true;
        
        const quiz = state.quizzes.find(q => q.id === quizId);
        if (!quiz) return;
        
        this.menu = document.createElement('div');
        this.menu.className = 'dropdown-portal-menu';
        this.menu.innerHTML = this.buildMenu(quiz);
        this.container.appendChild(this.menu);
        this.position();
        requestAnimationFrame(() => this.menu.classList.add('open'));
    },
    
    buildMenu(quiz) {
        let html = `
            <button class="dropdown-item" onclick="DropdownPortal.close(); showQuizPreview(${quiz.id})">👁️ Preview</button>
            <button class="dropdown-item" onclick="DropdownPortal.close(); editQuiz(${quiz.id})">✏️ Edit</button>
            <button class="dropdown-item" onclick="DropdownPortal.close(); ExportManager.showExportModal(state.quizzes.find(x=>x.id===${quiz.id}))">📤 Export</button>
        `;
        if (state.folders && state.folders.length > 0) {
            html += `<div class="dropdown-divider"></div>`;
            state.folders.forEach(f => {
                html += `<button class="dropdown-item" onclick="DropdownPortal.close(); addToFolder(${quiz.id},${f.id})">📁 ${escapeHtml(f.name)}</button>`;
            });
        }
        html += `<div class="dropdown-divider"></div>
            <button class="dropdown-item danger" onclick="DropdownPortal.close(); deleteQuiz(${quiz.id})">🗑️ Delete</button>`;
        return html;
    },
    
    position() {
        if (!this.menu || !this.trigger) return;
        const tr = this.trigger.getBoundingClientRect();
        const mr = this.menu.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        
        if (vw <= 768) {
            this.menu.style.cssText = 'position:fixed;top:auto;bottom:0;left:0;right:0;';
            this.menu.classList.add('mobile-sheet');
        } else {
            let top = tr.bottom + 8, left = tr.right - mr.width;
            if (left < 8) left = tr.left;
            if (left + mr.width > vw - 8) left = vw - mr.width - 8;
            if (top + mr.height > vh - 8) top = tr.top - mr.height - 8;
            this.menu.style.cssText = `position:fixed;top:${top}px;left:${left}px;`;
            this.menu.classList.remove('mobile-sheet');
        }
    },
    
    close(animate = true) {
        if (!this.menu) return;
        if (animate) {
            this.menu.classList.remove('open');
            this.menu.classList.add('closing');
            const ref = this.menu;
            setTimeout(() => ref.remove(), 150);
        } else {
            this.menu.remove();
        }
        this.menu = null;
        this.isOpen = false;
        this.trigger = null;
    }
};

function toggleQuizDropdown(event, quizId) {
    event.stopPropagation();
    event.preventDefault();
    DropdownPortal.open(event.currentTarget, quizId);
}

console.log('✅ Module 02: Dropdown Portal loaded');
