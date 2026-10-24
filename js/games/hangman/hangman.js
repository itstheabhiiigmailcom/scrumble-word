import { shuffle } from '../../random.js';
import { puzzles } from './puzzles.js';

const PARTS = ['head', 'body', 'arm-left', 'arm-right', 'leg-left', 'leg-right'];
const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

/**
 * Mounts Hangman into the page and returns a cleanup function.
 * @param {HTMLElement} root
 * @returns {() => void}
 */
export function mount(root) {
    root.innerHTML = `
        <section class="play hangman" aria-label="Hangman">
            <div class="stat-row">
                <p><span>Solved</span><strong data-score>0</strong></p>
                <p><span>Wrong</span><strong data-misses>0/6</strong></p>
            </div>
            <div class="hangman-layout">
                <svg class="gallows" viewBox="0 0 160 200" aria-hidden="true">
                    <line x1="16" y1="188" x2="144" y2="188"></line>
                    <line x1="48" y1="188" x2="48" y2="16"></line>
                    <line x1="48" y1="16" x2="112" y2="16"></line>
                    <line x1="112" y1="16" x2="112" y2="40"></line>
                    <circle class="part" data-part="head" cx="112" cy="56" r="16"></circle>
                    <line class="part" data-part="body" x1="112" y1="72" x2="112" y2="120"></line>
                    <line class="part" data-part="arm-left" x1="112" y1="86" x2="84" y2="108"></line>
                    <line class="part" data-part="arm-right" x1="112" y1="86" x2="140" y2="108"></line>
                    <line class="part" data-part="leg-left" x1="112" y1="120" x2="88" y2="158"></line>
                    <line class="part" data-part="leg-right" x1="112" y1="120" x2="136" y2="158"></line>
                </svg>
                <div class="hangman-word">
                    <p class="hint"><span>Hint</span><strong data-hint></strong></p>
                    <div class="slots" data-slots aria-live="polite"></div>
                </div>
            </div>
            <p class="message" data-message role="status"></p>
            <div class="key-rows" data-keys aria-label="Letter keyboard"></div>
            <div class="actions">
                <button type="button" class="btn btn--ghost" data-next>New word</button>
            </div>
        </section>
    `;

    const slotsEl = root.querySelector('[data-slots]');
    const hintEl = root.querySelector('[data-hint]');
    const messageEl = root.querySelector('[data-message]');
    const scoreEl = root.querySelector('[data-score]');
    const missesEl = root.querySelector('[data-misses]');
    const keysEl = root.querySelector('[data-keys]');
    const controller = new AbortController();

    KEY_ROWS.forEach((row) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'key-row';

        [...row].forEach((letter) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'key';
            button.dataset.letter = letter.toLowerCase();
            button.textContent = letter;
            rowEl.append(button);
        });

        keysEl.append(rowEl);
    });

    let order = shuffle(puzzles);
    let cursor = 0;
    let puzzle = order[0];
    /** @type {Set<string>} */
    let guesses = new Set();
    let misses = 0;
    let solved = 0;
    /** @type {'play' | 'won' | 'lost'} */
    let outcome = 'play';

    /**
     * @param {string} text
     * @param {'neutral' | 'good' | 'bad'} [tone]
     */
    function setMessage(text, tone = 'neutral') {
        messageEl.textContent = text;
        messageEl.dataset.tone = tone;
    }

    function paint() {
        const word = puzzle.word.toLowerCase();
        hintEl.textContent = puzzle.hint;
        scoreEl.textContent = String(solved);
        missesEl.textContent = `${misses}/${PARTS.length}`;
        slotsEl.replaceChildren();

        [...word].forEach((letter) => {
            const slot = document.createElement('span');
            const show = guesses.has(letter) || outcome === 'lost';
            slot.textContent = show ? letter.toUpperCase() : '';
            slotsEl.append(slot);
        });

        PARTS.forEach((name, index) => {
            root.querySelector(`[data-part="${name}"]`)?.classList.toggle('is-on', index < misses);
        });

        root.querySelectorAll('[data-letter]').forEach((button) => {
            const letter = button.dataset.letter ?? '';
            const used = guesses.has(letter);
            button.disabled = used || outcome !== 'play';
            button.classList.toggle('is-right', used && word.includes(letter));
            button.classList.toggle('is-wrong', used && !word.includes(letter));
        });
    }

    /**
     * @param {boolean} advance
     */
    function loadPuzzle(advance) {
        if (advance) {
            cursor += 1;
        }

        if (cursor >= order.length) {
            order = shuffle(puzzles);
            cursor = 0;
        }

        puzzle = order[cursor];
        guesses = new Set();
        misses = 0;
        outcome = 'play';
        setMessage('Guess a letter.');
        paint();
    }

    /**
     * @param {string} letter
     */
    function guess(letter) {
        if (outcome !== 'play' || guesses.has(letter) || !/^[a-z]$/.test(letter)) {
            return;
        }

        guesses.add(letter);
        const word = puzzle.word.toLowerCase();

        if (!word.includes(letter)) {
            misses += 1;

            if (misses >= PARTS.length) {
                outcome = 'lost';
                setMessage(`The word was ${word.toUpperCase()}.`, 'bad');
            } else {
                setMessage(`${letter.toUpperCase()} is not in the word.`, 'bad');
            }
        } else if ([...word].every((character) => guesses.has(character))) {
            outcome = 'won';
            solved += 1;
            setMessage(`${word.toUpperCase()} is correct.`, 'good');
        } else {
            setMessage(`${letter.toUpperCase()} is in the word.`, 'good');
        }

        paint();
    }

    keysEl.addEventListener('click', (event) => {
        const button = event.target.closest('[data-letter]');

        if (!button) {
            return;
        }

        guess(button.dataset.letter ?? '');
    }, { signal: controller.signal });

    root.querySelector('[data-next]').addEventListener('click', () => loadPuzzle(true), {
        signal: controller.signal,
    });

    window.addEventListener('keydown', (event) => {
        if (event.metaKey || event.ctrlKey || event.altKey) {
            return;
        }

        const letter = event.key.toLowerCase();

        if (!/^[a-z]$/.test(letter)) {
            return;
        }

        event.preventDefault();
        guess(letter);
    }, { signal: controller.signal });

    loadPuzzle(false);

    return () => {
        controller.abort();
    };
}
