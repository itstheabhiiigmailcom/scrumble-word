import { shuffle } from '../../random.js';
import { readScore, writeScore } from '../../storage.js';

const FACES = [
    { name: 'apple', glyph: '🍎' },
    { name: 'lemon', glyph: '🍋' },
    { name: 'grapes', glyph: '🍇' },
    { name: 'cherry', glyph: '🍒' },
    { name: 'melon', glyph: '🍉' },
    { name: 'kiwi', glyph: '🥝' },
    { name: 'peach', glyph: '🍑' },
    { name: 'pineapple', glyph: '🍍' },
];

const STORAGE_KEY = 'memory-moves';

/**
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
        return `${seconds}s`;
    }

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Mounts Memory Match into the page and returns a cleanup function.
 * @param {HTMLElement} root
 * @returns {() => void}
 */
export function mount(root) {
    root.innerHTML = `
        <section class="play memory" aria-label="Memory match">
            <div class="stat-row">
                <p><span>Moves</span><strong data-moves>0</strong></p>
                <p><span>Time</span><strong data-time>0s</strong></p>
                <p><span>Best</span><strong data-best></strong></p>
            </div>
            <p class="message" data-message role="status"></p>
            <div class="memory-grid" data-grid></div>
            <div class="actions">
                <button type="button" class="btn btn--ghost" data-restart>New board</button>
            </div>
        </section>
    `;

    const grid = root.querySelector('[data-grid]');
    const movesEl = root.querySelector('[data-moves]');
    const timeEl = root.querySelector('[data-time]');
    const bestEl = root.querySelector('[data-best]');
    const messageEl = root.querySelector('[data-message]');
    const controller = new AbortController();

    let cards = [];
    let picked = [];
    let moves = 0;
    let elapsed = 0;
    let locked = false;
    let clockId = 0;
    let mismatchId = 0;
    let startedAt = 0;

    function showBest() {
        const best = readScore(STORAGE_KEY);
        bestEl.textContent = best > 0 ? String(best) : '—';
    }

    /**
     * @param {string} text
     * @param {'neutral' | 'good' | 'bad'} [tone]
     */
    function setMessage(text, tone = 'neutral') {
        messageEl.textContent = text;
        messageEl.dataset.tone = tone;
    }

    function buildDeck() {
        return shuffle([...FACES, ...FACES]).map((face, index) => ({
            id: index,
            name: face.name,
            glyph: face.glyph,
            flipped: false,
            matched: false,
        }));
    }

    function paint() {
        cards.forEach((card) => {
            const button = grid.querySelector(`[data-id="${card.id}"]`);

            if (!button) {
                return;
            }

            const faceUp = card.flipped || card.matched;
            button.classList.toggle('is-up', faceUp);
            button.classList.toggle('is-matched', card.matched);
            button.disabled = card.matched;
            button.setAttribute('aria-label', faceUp ? card.name : 'Hidden card');
        });
    }

    function renderBoard() {
        grid.classList.remove('is-locked');
        grid.replaceChildren();

        cards.forEach((card) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'memory-card';
            button.dataset.id = String(card.id);

            const inner = document.createElement('span');
            inner.className = 'memory-card__inner';

            const back = document.createElement('span');
            back.className = 'memory-card__face memory-card__face--back';
            back.setAttribute('aria-hidden', 'true');

            const front = document.createElement('span');
            front.className = 'memory-card__face memory-card__face--front';
            front.setAttribute('aria-hidden', 'true');
            front.textContent = card.glyph;

            inner.append(back, front);
            button.append(inner);
            grid.append(button);
        });

        paint();
    }

    function startClock() {
        if (clockId) {
            return;
        }

        startedAt = Date.now();
        clockId = window.setInterval(() => {
            elapsed = Math.floor((Date.now() - startedAt) / 1000);
            timeEl.textContent = formatTime(elapsed);
        }, 250);
    }

    function stopClock() {
        window.clearInterval(clockId);
        clockId = 0;
    }

    function finish() {
        stopClock();
        const best = readScore(STORAGE_KEY);

        if (best === 0 || moves < best) {
            writeScore(STORAGE_KEY, moves);
            showBest();
        }

        setMessage(`Cleared in ${moves} moves and ${formatTime(elapsed)}.`, 'good');
    }

    /**
     * @param {number} id
     */
    function flip(id) {
        const card = cards.find((item) => item.id === id);

        if (!card || card.flipped || card.matched || locked) {
            return;
        }

        startClock();
        card.flipped = true;
        picked.push(card);

        if (picked.length < 2) {
            paint();
            return;
        }

        moves += 1;
        movesEl.textContent = String(moves);
        const [first, second] = picked;

        if (first.name === second.name) {
            first.matched = true;
            second.matched = true;
            picked = [];
            paint();

            if (cards.every((item) => item.matched)) {
                finish();
            }

            return;
        }

        locked = true;
        grid.classList.add('is-locked');
        paint();
        mismatchId = window.setTimeout(() => {
            first.flipped = false;
            second.flipped = false;
            picked = [];
            locked = false;
            grid.classList.remove('is-locked');
            paint();
        }, 750);
    }

    function restart() {
        stopClock();
        window.clearTimeout(mismatchId);
        locked = false;
        picked = [];
        moves = 0;
        elapsed = 0;
        cards = buildDeck();
        movesEl.textContent = '0';
        timeEl.textContent = '0s';
        setMessage('Flip two cards.');
        renderBoard();
    }

    grid.addEventListener('click', (event) => {
        const button = event.target.closest('[data-id]');

        if (!button) {
            return;
        }

        flip(Number(button.dataset.id));
    }, { signal: controller.signal });

    root.querySelector('[data-restart]').addEventListener('click', restart, {
        signal: controller.signal,
    });

    showBest();
    restart();

    return () => {
        stopClock();
        window.clearTimeout(mismatchId);
        controller.abort();
    };
}
