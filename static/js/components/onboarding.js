/* Onboarding - Welcome tour for new users */
import { getState, setState } from '../state.js';
import { icon } from '../utils/icons.js';
import { escapeHtml } from '../utils/dom.js';

const ONBOARDING_KEY = 'qmp_onboarding_done';

const STEPS = [
    {
        title: 'Welcome to Quiz Master Pro!',
        body: `This app helps you <strong>study for exams</strong> by turning your notes into interactive practice quizzes.<br><br>
               Let's take a quick tour so you know how everything works.`,
        icon: 'graduationCap',
        cta: "Let's go!",
    },
    {
        title: 'Create Your Own Quizzes',
        body: `Tap the <strong>+ Create</strong> button to build a quiz. You can:<br><br>
               <span class="ob-bullet">${icon('notepadText')} Type questions yourself</span>
               <span class="ob-bullet">${icon('clipboard')} Paste questions in bulk</span>
               <span class="ob-bullet">${icon('bot')} Use AI (ChatGPT/Claude) to generate them from your notes</span><br>
               Don't worry — we'll guide you through each option.`,
        icon: 'plus',
        cta: 'Got it',
    },
    {
        title: 'Study With Different Modes',
        body: `When you start a quiz, you can choose how to study:<br><br>
               <span class="ob-bullet">${icon('bookOpen')} <strong>Study Mode</strong> — See the answer right after each question</span>
               <span class="ob-bullet">${icon('clock')} <strong>Timed Mode</strong> — Simulate real exam pressure</span>
               <span class="ob-bullet">${icon('layers')} <strong>Flashcards</strong> — Quick card-flip review</span><br>
               Wrong answers are automatically saved for later review.`,
        icon: 'sparkles',
        cta: 'Next',
    },
    {
        title: 'Track Your Progress',
        body: `The app tracks everything for you:<br><br>
               <span class="ob-bullet">${icon('barChart')} <strong>Readiness Score</strong> — See how prepared you are per topic</span>
               <span class="ob-bullet">${icon('brain')} <strong>Spaced Repetition</strong> — Missed questions come back at the right time</span>
               <span class="ob-bullet">${icon('trophy')} <strong>XP & Streaks</strong> — Stay motivated with daily goals</span><br>
               Check the <strong>Home</strong> and <strong>Readiness</strong> tabs to see your stats.`,
        icon: 'barChart',
        cta: 'Next',
    },
    {
        title: "You're All Set!",
        body: `Here's what to do first:<br><br>
               <span class="ob-bullet ob-action">${icon('plus')} <strong>Create a quiz</strong> from your study material</span>
               <span class="ob-bullet ob-action">${icon('globe')} <strong>Browse Community</strong> quizzes shared by others</span>
               <span class="ob-bullet ob-action">${icon('shield')} <strong>Add a certification</strong> to track your readiness score</span><br>
               You can always find these options from the home screen. Happy studying!`,
        icon: 'rocket',
        cta: "Start Studying",
    },
];

let currentStep = 0;

export function shouldShowOnboarding() {
    return !localStorage.getItem(ONBOARDING_KEY);
}

export function startOnboarding() {
    currentStep = 0;
    setState({ showOnboarding: true });
}

export function completeOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setState({ showOnboarding: false });
}

export function onboardingNext() {
    if (currentStep < STEPS.length - 1) {
        currentStep++;
        setState({ showOnboarding: true });
    } else {
        completeOnboarding();
    }
}

export function onboardingBack() {
    if (currentStep > 0) {
        currentStep--;
        setState({ showOnboarding: true });
    }
}

export function onboardingSkip() {
    completeOnboarding();
}

export function renderOnboarding() {
    const state = getState();
    if (!state.showOnboarding) return '';

    const step = STEPS[currentStep];
    const isFirst = currentStep === 0;
    const isLast = currentStep === STEPS.length - 1;
    const progress = ((currentStep + 1) / STEPS.length) * 100;

    return `
    <div class="ob-overlay" onclick="event.target === this && window.app.onboardingSkip()">
        <div class="ob-modal">
            <!-- Progress dots -->
            <div class="ob-dots">
                ${STEPS.map((_, i) => `
                    <div class="ob-dot ${i === currentStep ? 'active' : i < currentStep ? 'done' : ''}"></div>
                `).join('')}
            </div>

            <!-- Icon -->
            <div class="ob-icon-wrap">
                ${icon(step.icon, 'icon-3xl')}
            </div>

            <!-- Content -->
            <h2 class="ob-title">${step.title}</h2>
            <div class="ob-body">${step.body}</div>

            <!-- Actions -->
            <div class="ob-actions">
                ${!isFirst ? `
                    <button class="btn btn-ghost" onclick="window.app.onboardingBack()">
                        ${icon('arrowLeft')} Back
                    </button>
                ` : `
                    <button class="btn btn-ghost" onclick="window.app.onboardingSkip()">
                        Skip tour
                    </button>
                `}
                <button class="btn btn-primary btn-lg" onclick="window.app.onboardingNext()">
                    ${step.cta}${!isLast ? ' ' + icon('arrowRight') : ''}
                </button>
            </div>

            <!-- Step counter -->
            <div class="ob-step-count">${currentStep + 1} of ${STEPS.length}</div>
        </div>
    </div>
    `;
}
