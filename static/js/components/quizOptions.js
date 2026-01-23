/* ============================================
   QUIZ MASTER PRO - Quiz Options Modal
   Pre-quiz configuration
   ============================================ */

import { getState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { startQuiz } from './quiz.js';

export function showQuizOptions(quizId) {
    const state = getState();
    const quiz = state.quizzes.find(q => q.id === quizId);
    
    if (!quiz) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'quiz-options-modal';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Start Quiz</h2>
                <button class="btn btn-icon btn-ghost" onclick="document.getElementById('quiz-options-modal').remove()">✕</button>
            </div>
            
            <div class="modal-body">
                <h3 style="margin-bottom: var(--space-2)">${escapeHtml(quiz.title)}</h3>
                <p class="text-muted mb-6">${quiz.questions?.length || 0} questions</p>
                
                <div class="form-group">
                    <label class="flex items-center gap-3" style="cursor: pointer">
                        <input type="checkbox" id="opt-study" style="width: 18px; height: 18px">
                        <div>
                            <span class="font-medium">📖 Study Mode</span>
                            <p class="text-sm text-muted">See answers immediately after each question</p>
                        </div>
                    </label>
                </div>
                
                <div class="form-group">
                    <label class="flex items-center gap-3" style="cursor: pointer">
                        <input type="checkbox" id="opt-shuffle" style="width: 18px; height: 18px">
                        <div>
                            <span class="font-medium">🔀 Shuffle Questions</span>
                            <p class="text-sm text-muted">Randomize question order</p>
                        </div>
                    </label>
                </div>
                
                <div class="form-group">
                    <label class="flex items-center gap-3" style="cursor: pointer">
                        <input type="checkbox" id="opt-timer" onchange="document.getElementById('timer-options').style.display = this.checked ? 'block' : 'none'" style="width: 18px; height: 18px">
                        <div>
                            <span class="font-medium">⏱️ Enable Timer</span>
                            <p class="text-sm text-muted">Set a time limit for the quiz</p>
                        </div>
                    </label>
                </div>
                
                <div id="timer-options" style="display: none; margin-left: 2rem; margin-top: var(--space-3)">
                    <label class="label">Time limit (minutes)</label>
                    <select id="opt-timer-minutes" class="input" style="width: auto">
                        <option value="5">5 minutes</option>
                        <option value="10">10 minutes</option>
                        <option value="15" selected>15 minutes</option>
                        <option value="20">20 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">60 minutes</option>
                    </select>
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn btn-secondary flex-1" onclick="document.getElementById('quiz-options-modal').remove()">
                    Cancel
                </button>
                <button class="btn btn-primary flex-1" onclick="window.app.launchQuiz(${quizId})">
                    Start Quiz
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

export function launchQuiz(quizId) {
    const studyMode = document.getElementById('opt-study')?.checked || false;
    const shuffleQuestions = document.getElementById('opt-shuffle')?.checked || false;
    const timerEnabled = document.getElementById('opt-timer')?.checked || false;
    const timerMinutes = parseInt(document.getElementById('opt-timer-minutes')?.value || '15');
    
    // Close modal
    document.getElementById('quiz-options-modal')?.remove();
    
    // Start quiz with options
    startQuiz(quizId, {
        studyMode,
        shuffleQuestions,
        timerEnabled,
        timerMinutes
    });
}

export default { showQuizOptions, launchQuiz };
