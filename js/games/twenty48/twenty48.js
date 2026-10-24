import { readScore, writeScore } from '../../storage.js';

const SIZE = 4;
const STORAGE_KEY = '2048';

const KEYS = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    a: 'left',
    d: 'right',
    w: 'up',
    s: 'down',
};

/**
 * @param {number[]} line
 * @returns {{ line: number[], gained: number }}
 */
function collapse(line) {
    const tiles = line.filter((value) => value !== 0);
    /** @type {number[]} */
    const result = [];
    let gained = 0;

    for (let index = 0; index < tiles.length; index += 1) {
        if (tiles[index] === tiles[index + 1]) {
            const merged = tiles[index] * 2;
            result.push(merged);
            gained += merged;
            index += 1;
        } else {
            result.push(tiles[index]);
        }
    }

    while (result.length < SIZE) {
        result.push(0);
    }

    return { line: result, gained };
}

/**
 * @param {number[]} board
 * @returns {{ board: number[], gained: number }}
 */
function moveLeft(board) {
    /** @type {number[]} */
    const next = [];
    let gained = 0;

    for (let row = 0; row < SIZE; row += 1) {
        const collapsed = collapse(board.slice(row * SIZE, row * SIZE + SIZE));
        next.push(...collapsed.line);
        gained += collapsed.gained;
    }

    return { board: next, gained };
}

/**
 * @param {number[]} board
 * @returns {{ board: number[], gained: number }}
 */
function moveRight(board) {
    /** @type {number[]} */
    const next = [];
    let gained = 0;

    for (let row = 0; row < SIZE; row += 1) {
        const slice = board.slice(row * SIZE, row * SIZE + SIZE).reverse();
        const collapsed = collapse(slice);
        next.push(...collapsed.line.reverse());
        gained += collapsed.gained;
    }

    return { board: next, gained };
}

/**
 * @param {number[]} board
 * @returns {{ board: number[], gained: number }}
 */
function moveUp(board) {
    const next = [...board];
    let gained = 0;

    for (let column = 0; column < SIZE; column += 1) {
        const slice = [0, 1, 2, 3].map((row) => board[row * SIZE + column]);
        const collapsed = collapse(slice);
        collapsed.line.forEach((value, row) => {
            next[row * SIZE + column] = value;
        });
        gained += collapsed.gained;
    }

    return { board: next, gained };
}

/**
 * @param {number[]} board
 * @returns {{ board: number[], gained: number }}
 */
function moveDown(board) {
    const next = [...board];
    let gained = 0;

    for (let column = 0; column < SIZE; column += 1) {
        const slice = [3, 2, 1, 0].map((row) => board[row * SIZE + column]);
        const collapsed = collapse(slice);
        collapsed.line.forEach((value, index) => {
            next[(SIZE - 1 - index) * SIZE + column] = value;
        });
        gained += collapsed.gained;
    }

    return { board: next, gained };
}

const MOVERS = {
    left: moveLeft,
    right: moveRight,
    up: moveUp,
    down: moveDown,
};

/**
 * @param {number[]} board
 * @returns {boolean}
 */
function canMove(board) {
    if (board.includes(0)) {
        return true;
    }

    for (let row = 0; row < SIZE; row += 1) {
        for (let column = 0; column < SIZE; column += 1) {
            const value = board[row * SIZE + column];
            const right = column < SIZE - 1 && value === board[row * SIZE + column + 1];
            const below = row < SIZE - 1 && value === board[(row + 1) * SIZE + column];

            if (right || below) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Mounts 2048 into the page and returns a cleanup function.
 * @param {HTMLElement} root
 * @returns {() => void}
 */
export function mount(root) {
    root.innerHTML = `
        <section class="play game-2048" aria-label="2048">
            <div class="stat-row">
                <p><span>Score</span><strong data-score>0</strong></p>
                <p><span>Best</span><strong data-best></strong></p>
            </div>
            <p class="message" data-message role="status"></p>
            <div class="board-2048" data-board></div>
            <div class="pad" role="group" aria-label="Slide direction">
                <button type="button" data-dir="up" aria-label="Slide up">↑</button>
                <button type="button" data-dir="left" aria-label="Slide left">←</button>
                <button type="button" data-dir="down" aria-label="Slide down">↓</button>
                <button type="button" data-dir="right" aria-label="Slide right">→</button>
            </div>
            <div class="actions">
                <button type="button" class="btn btn--primary" data-new>New game</button>
            </div>
        </section>
    `;

    const boardEl = root.querySelector('[data-board]');
    const scoreEl = root.querySelector('[data-score]');
    const bestEl = root.querySelector('[data-best]');
    const messageEl = root.querySelector('[data-message]');
    const controller = new AbortController();

    /** @type {number[]} */
    let board = Array(SIZE * SIZE).fill(0);
    let score = 0;
    let best = readScore(STORAGE_KEY);
    let playing = true;
    let won = false;
    let freshIndex = -1;
    /** @type {{ x: number, y: number } | null} */
    let touchStart = null;

    /**
     * @param {string} text
     * @param {'neutral' | 'good' | 'bad'} [tone]
     */
    function setMessage(text, tone = 'neutral') {
        messageEl.textContent = text;
        messageEl.dataset.tone = tone;
    }

    function paint() {
        scoreEl.textContent = String(score);
        bestEl.textContent = best > 0 ? String(best) : '—';
        boardEl.replaceChildren();

        board.forEach((value, index) => {
            const tile = document.createElement('div');
            tile.className = 'tile-2048';

            if (value) {
                tile.dataset.value = String(value);
                tile.textContent = String(value);
            }

            if (index === freshIndex) {
                tile.classList.add('is-fresh');
            }

            boardEl.append(tile);
        });
    }

    /**
     * @param {number[]} current
     * @returns {number[]}
     */
    function spawn(current) {
        const open = current.flatMap((value, index) => (value === 0 ? [index] : []));

        if (!open.length) {
            freshIndex = -1;
            return current;
        }

        freshIndex = open[Math.floor(Math.random() * open.length)];
        const next = [...current];
        next[freshIndex] = Math.random() < 0.9 ? 2 : 4;
        return next;
    }

    function newGame() {
        score = 0;
        won = false;
        playing = true;
        freshIndex = -1;
        board = spawn(spawn(Array(SIZE * SIZE).fill(0)));
        setMessage('Slide matching numbers together.');
        paint();
    }

    /**
     * @param {'left' | 'right' | 'up' | 'down'} direction
     */
    function applyMove(direction) {
        if (!playing) {
            return;
        }

        const result = MOVERS[direction](board);
        const changed = result.board.some((value, index) => value !== board[index]);

        if (!changed) {
            return;
        }

        score += result.gained;
        board = spawn(result.board);

        if (score > best) {
            best = score;
            writeScore(STORAGE_KEY, best);
        }

        if (!canMove(board)) {
            playing = false;
            setMessage(won ? 'No moves left. You already reached 2048.' : 'No moves left.', 'bad');
        } else if (!won && board.includes(2048)) {
            won = true;
            setMessage('You made 2048. Keep sliding for a higher score.', 'good');
        }

        paint();
    }

    root.querySelector('[data-new]').addEventListener('click', newGame, {
        signal: controller.signal,
    });

    root.querySelectorAll('[data-dir]').forEach((button) => {
        button.addEventListener('click', () => {
            const direction = button.dataset.dir;

            if (direction === 'up' || direction === 'down' || direction === 'left' || direction === 'right') {
                applyMove(direction);
            }
        }, { signal: controller.signal });
    });

    window.addEventListener('keydown', (event) => {
        const direction = KEYS[event.key] || KEYS[event.key.toLowerCase()];

        if (!direction) {
            return;
        }

        event.preventDefault();
        applyMove(direction);
    }, { signal: controller.signal });

    boardEl.addEventListener('touchstart', (event) => {
        const touch = event.changedTouches[0];
        touchStart = { x: touch.clientX, y: touch.clientY };
    }, { passive: true, signal: controller.signal });

    boardEl.addEventListener('touchend', (event) => {
        if (!touchStart) {
            return;
        }

        const touch = event.changedTouches[0];
        const dx = touch.clientX - touchStart.x;
        const dy = touch.clientY - touchStart.y;
        touchStart = null;

        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
            return;
        }

        if (Math.abs(dx) > Math.abs(dy)) {
            applyMove(dx > 0 ? 'right' : 'left');
            return;
        }

        applyMove(dy > 0 ? 'down' : 'up');
    }, { passive: true, signal: controller.signal });

    bestEl.textContent = best > 0 ? String(best) : '—';
    newGame();

    return () => {
        controller.abort();
    };
}
