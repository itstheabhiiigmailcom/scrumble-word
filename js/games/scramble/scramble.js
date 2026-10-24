import { shuffle } from '../../random.js';
import { words } from './words.js';

const ROUND_SECONDS = 30;

/**
 * Mounts Word Scramble into the page and returns a cleanup function.
 * @param {HTMLElement} root
 * @returns {() => void}
 */
export function mount(root) {
    root.innerHTML = `
        <section class="play scramble" aria-label="Word scramble board">
            <div class="stat-row">
                <p><span>Time</span><strong data-time>${ROUND_SECONDS}s</strong></p>
                <p><span>Score</span><strong data-score>0</strong></p>
            </div>
            <div class="letters" data-letters></div>
            <p class="hint"><span>Hint</span><strong data-hint></strong></p>
            <p class="message" data-message role="status"></p>
            <form data-form>
                <label class="field-label" for="scramble-guess">Your guess</label>
                <input class="field" id="scramble-guess" data-guess type="text" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="done">
                <div class="actions">
                    <button class="btn btn--ghost" type="button" data-refresh>Refresh word</button>
                    <button class="btn btn--primary" type="submit">Check word</button>
                </div>
            </form>
        </section>
    `;

    const lettersEl = root.querySelector('[data-letters]');
    const hintEl = root.querySelector('[data-hint]');
    const timeEl = root.querySelector('[data-time]');
    const scoreEl = root.querySelector('[data-score]');
    const messageEl = root.querySelector('[data-message]');
    const form = root.querySelector('[data-form]');
    const guessEl = root.querySelector('[data-guess]');
    const refreshButton = root.querySelector('[data-refresh]');
    const controller = new AbortController();

    let timerId = 0;
    let delayId = 0;
    let correctWord = '';
    let timeLeft = ROUND_SECONDS;
    let score = 0;
    let accepting = true;

    /**
     * @param {string} text
     * @param {'neutral' | 'good' | 'bad'} [tone]
     */
    function setMessage(text, tone = 'neutral') {
        messageEl.textContent = text;
        messageEl.dataset.tone = tone;
    }

    /**
     * @param {string} word
     * @returns {string}
     */
    function scrambleWord(word) {
        const source = word.toLowerCase();

        if (source.length < 2) {
            return source.toUpperCase();
        }

        let mixed = source;

        for (let attempt = 0; attempt < 8 && mixed === source; attempt += 1) {
            mixed = shuffle([...source]).join('');
        }

        return mixed.toUpperCase();
    }

    /**
     * @param {string} value
     */
    function renderLetters(value) {
        lettersEl.replaceChildren();

        [...value].forEach((letter) => {
            const tile = document.createElement('span');
            tile.textContent = letter;
            lettersEl.append(tile);
        });

        lettersEl.setAttribute('aria-label', `Scrambled letters ${[...value].join(' ')}`);
    }

    function startRound() {
        window.clearInterval(timerId);
        window.clearTimeout(delayId);
        accepting = true;

        const puzzle = words[Math.floor(Math.random() * words.length)];
        correctWord = puzzle.word.toLowerCase();
        timeLeft = ROUND_SECONDS;
        timeEl.textContent = `${timeLeft}s`;
        hintEl.textContent = puzzle.hint;
        guessEl.value = '';
        guessEl.maxLength = Math.max(correctWord.length, 1);
        renderLetters(scrambleWord(puzzle.word));
        setMessage('Unscramble the letters.');
        guessEl.focus({ preventScroll: true });

        timerId = window.setInterval(() => {
            timeLeft -= 1;
            timeEl.textContent = `${Math.max(timeLeft, 0)}s`;

            if (timeLeft > 0) {
                return;
            }

            window.clearInterval(timerId);
            accepting = false;
            setMessage(`Time is up. The word was ${correctWord.toUpperCase()}.`, 'bad');
            delayId = window.setTimeout(startRound, 1500);
        }, 1000);
    }

    /**
     * @param {SubmitEvent} event
     */
    function checkGuess(event) {
        event.preventDefault();

        if (!accepting) {
            return;
        }

        const attempt = guessEl.value.trim().toLowerCase();

        if (!attempt) {
            setMessage('Type a word first.', 'bad');
            guessEl.classList.add('is-shaking');
            return;
        }

        if (attempt !== correctWord) {
            setMessage(`${attempt.toUpperCase()} is not the word.`, 'bad');
            guessEl.classList.add('is-shaking');
            return;
        }

        score += 1;
        scoreEl.textContent = String(score);
        accepting = false;
        window.clearInterval(timerId);
        setMessage(`${correctWord.toUpperCase()} is correct.`, 'good');
        delayId = window.setTimeout(startRound, 700);
    }

    form.addEventListener('submit', checkGuess, { signal: controller.signal });
    refreshButton.addEventListener('click', startRound, { signal: controller.signal });
    guessEl.addEventListener('animationend', () => {
        guessEl.classList.remove('is-shaking');
    }, { signal: controller.signal });

    startRound();

    return () => {
        window.clearInterval(timerId);
        window.clearTimeout(delayId);
        controller.abort();
    };
}
