const LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];

const LABELS = [
    'top left',
    'top middle',
    'top right',
    'middle left',
    'center',
    'middle right',
    'bottom left',
    'bottom middle',
    'bottom right',
];

/**
 * @param {string[]} current
 * @returns {{ player: string, line: number[] } | null}
 */
function findWinner(current) {
    for (const line of LINES) {
        const [a, b, c] = line;

        if (current[a] && current[a] === current[b] && current[a] === current[c]) {
            return { player: current[a], line };
        }
    }

    if (current.every(Boolean)) {
        return { player: 'draw', line: [] };
    }

    return null;
}

/**
 * @param {string[]} current
 * @param {boolean} isMaximizing
 * @param {number} depth
 * @returns {number}
 */
function minimax(current, isMaximizing, depth) {
    const result = findWinner(current);

    if (result?.player === 'O') {
        return 10 - depth;
    }

    if (result?.player === 'X') {
        return depth - 10;
    }

    if (result?.player === 'draw') {
        return 0;
    }

    let best = isMaximizing ? -Infinity : Infinity;

    for (let index = 0; index < current.length; index += 1) {
        if (current[index]) {
            continue;
        }

        current[index] = isMaximizing ? 'O' : 'X';
        const score = minimax(current, !isMaximizing, depth + 1);
        current[index] = '';
        best = isMaximizing ? Math.max(best, score) : Math.min(best, score);
    }

    return best;
}

/**
 * @param {string[]} current
 * @returns {number}
 */
function bestMove(current) {
    let bestScore = -Infinity;
    /** @type {number[]} */
    const choices = [];

    for (let index = 0; index < current.length; index += 1) {
        if (current[index]) {
            continue;
        }

        current[index] = 'O';
        const score = minimax(current, false, 1);
        current[index] = '';

        if (score > bestScore) {
            bestScore = score;
            choices.length = 0;
            choices.push(index);
        } else if (score === bestScore) {
            choices.push(index);
        }
    }

    return choices[Math.floor(Math.random() * choices.length)];
}

/**
 * Mounts Tic-Tac-Toe into the page and returns a cleanup function.
 * @param {HTMLElement} root
 * @returns {() => void}
 */
export function mount(root) {
    root.innerHTML = `
        <section class="play tictactoe" aria-label="Tic tac toe">
            <div class="segmented" role="group" aria-label="Play mode">
                <button type="button" data-mode="solo" aria-pressed="true">Solo</button>
                <button type="button" data-mode="pass" aria-pressed="false">Pass and play</button>
            </div>
            <div class="stat-row">
                <p><span data-label="x">You</span><strong data-score="x">0</strong></p>
                <p><span>Draws</span><strong data-score="draw">0</strong></p>
                <p><span data-label="o">Computer</span><strong data-score="o">0</strong></p>
            </div>
            <p class="message" data-message role="status"></p>
            <div class="ttt-grid" data-grid role="group" aria-label="Board"></div>
            <div class="actions">
                <button type="button" class="btn btn--ghost" data-restart>Restart round</button>
            </div>
        </section>
    `;

    const grid = root.querySelector('[data-grid]');
    const messageEl = root.querySelector('[data-message]');
    const controller = new AbortController();
    /** @type {string[]} */
    let board = Array(9).fill('');
    /** @type {'solo' | 'pass'} */
    let mode = 'solo';
    /** @type {'X' | 'O'} */
    let turn = 'X';
    /** @type {'play' | 'over'} */
    let phase = 'play';
    /** @type {number[]} */
    let winLine = [];
    let xScore = 0;
    let oScore = 0;
    let draws = 0;
    let thinkId = 0;

    LABELS.forEach((label, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ttt-cell';
        button.dataset.index = String(index);
        button.setAttribute('aria-label', `${label}, empty`);
        grid.append(button);
    });

    const cells = [...grid.querySelectorAll('.ttt-cell')];

    /**
     * @param {string} text
     * @param {'neutral' | 'good' | 'bad'} [tone]
     */
    function setMessage(text, tone = 'neutral') {
        messageEl.textContent = text;
        messageEl.dataset.tone = tone;
    }

    function paintScores() {
        root.querySelector('[data-score="x"]').textContent = String(xScore);
        root.querySelector('[data-score="o"]').textContent = String(oScore);
        root.querySelector('[data-score="draw"]').textContent = String(draws);
        root.querySelector('[data-label="x"]').textContent = mode === 'solo' ? 'You' : 'X';
        root.querySelector('[data-label="o"]').textContent = mode === 'solo' ? 'Computer' : 'O';
    }

    function paintBoard() {
        cells.forEach((cell, index) => {
            const mark = board[index];
            cell.textContent = mark;
            cell.classList.toggle('is-x', mark === 'X');
            cell.classList.toggle('is-o', mark === 'O');
            cell.classList.toggle('is-win', winLine.includes(index));
            cell.disabled = Boolean(mark) || phase !== 'play' || (mode === 'solo' && turn === 'O');
            cell.setAttribute('aria-label', mark ? `${LABELS[index]}, ${mark}` : `${LABELS[index]}, empty`);
        });
        paintScores();
    }

    function turnMessage() {
        if (mode === 'solo') {
            setMessage(turn === 'X' ? 'Your turn.' : 'Computer is thinking.');
            return;
        }

        setMessage(turn === 'X' ? 'X to play.' : 'O to play.');
    }

    function freshRound() {
        window.clearTimeout(thinkId);
        board = Array(9).fill('');
        turn = 'X';
        phase = 'play';
        winLine = [];
        paintBoard();
        turnMessage();
    }

    /**
     * @param {{ player: string, line: number[] }} result
     */
    function finish(result) {
        phase = 'over';
        winLine = result.line;

        if (result.player === 'draw') {
            draws += 1;
            setMessage('Draw.', 'neutral');
        } else if (result.player === 'X') {
            xScore += 1;
            setMessage(mode === 'solo' ? 'You win.' : 'X wins.', 'good');
        } else {
            oScore += 1;
            setMessage(mode === 'solo' ? 'Computer wins.' : 'O wins.', 'bad');
        }

        paintBoard();
    }

    /**
     * @param {number} index
     */
    function place(index) {
        if (phase !== 'play' || board[index]) {
            return;
        }

        board[index] = turn;
        const result = findWinner(board);

        if (result) {
            finish(result);
            return;
        }

        turn = turn === 'X' ? 'O' : 'X';
        paintBoard();

        if (mode === 'solo' && turn === 'O') {
            scheduleComputer();
            return;
        }

        turnMessage();
    }

    function scheduleComputer() {
        window.clearTimeout(thinkId);
        setMessage('Computer is thinking.');
        thinkId = window.setTimeout(() => {
            if (mode !== 'solo' || phase !== 'play' || turn !== 'O') {
                return;
            }

            const index = bestMove(board);

            if (Number.isInteger(index)) {
                place(index);
            }
        }, 320);
    }

    /**
     * @param {number} index
     */
    function onCell(index) {
        if (phase !== 'play' || (mode === 'solo' && turn !== 'X')) {
            return;
        }

        place(index);
    }

    grid.addEventListener('click', (event) => {
        const button = event.target.closest('[data-index]');

        if (!button) {
            return;
        }

        onCell(Number(button.dataset.index));
    }, { signal: controller.signal });

    root.querySelectorAll('[data-mode]').forEach((button) => {
        button.addEventListener('click', () => {
            const nextMode = button.dataset.mode === 'pass' ? 'pass' : 'solo';

            if (nextMode === mode) {
                return;
            }

            mode = nextMode;
            xScore = 0;
            oScore = 0;
            draws = 0;
            root.querySelectorAll('[data-mode]').forEach((modeButton) => {
                modeButton.setAttribute('aria-pressed', String(modeButton === button));
            });
            freshRound();
        }, { signal: controller.signal });
    });

    root.querySelector('[data-restart]').addEventListener('click', freshRound, {
        signal: controller.signal,
    });

    freshRound();

    return () => {
        window.clearTimeout(thinkId);
        controller.abort();
    };
}
