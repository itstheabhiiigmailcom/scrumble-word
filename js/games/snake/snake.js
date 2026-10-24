import { readScore, writeScore } from '../../storage.js';

const COLS = 16;
const ROWS = 16;
const POINTS_PER_LEVEL = 5;

const SPEEDS = {
    slow: { label: 'Slow', start: 320, floor: 220, step: 16 },
    medium: { label: 'Medium', start: 210, floor: 140, step: 12 },
    fast: { label: 'Fast', start: 130, floor: 72, step: 8 },
};

const DELTA = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
};

const OPPOSITE = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
};

const KEYS = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    a: 'left',
    s: 'down',
    d: 'right',
};

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 */
function roundRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
}

/**
 * Mounts Snake into the page and returns a cleanup function.
 * @param {HTMLElement} root
 * @returns {() => void}
 */
export function mount(root) {
    root.innerHTML = `
        <section class="play game-snake" aria-label="Snake">
            <div class="segmented" role="group" aria-label="Speed">
                <button type="button" data-speed="slow" aria-pressed="true">Slow</button>
                <button type="button" data-speed="medium" aria-pressed="false">Medium</button>
                <button type="button" data-speed="fast" aria-pressed="false">Fast</button>
            </div>
            <div class="stat-row">
                <p><span>Level</span><strong data-level>1</strong></p>
                <p><span>Score</span><strong data-score>0</strong></p>
                <p><span>Best</span><strong data-best></strong></p>
            </div>
            <div class="frame">
                <canvas class="snake-board" width="320" height="320" aria-label="Snake board"></canvas>
                <div class="overlay" data-overlay>
                    <p class="overlay__title" data-overlay-title>Ready?</p>
                    <p data-overlay-text>Eat the food. Going through a wall brings you out the other side.</p>
                    <button type="button" class="btn btn--primary" data-start>Start</button>
                </div>
            </div>
            <div class="pad" role="group" aria-label="Direction pad">
                <button type="button" data-dir="up" aria-label="Up">↑</button>
                <button type="button" data-dir="left" aria-label="Left">←</button>
                <button type="button" data-dir="down" aria-label="Down">↓</button>
                <button type="button" data-dir="right" aria-label="Right">→</button>
            </div>
            <div class="actions">
                <button type="button" class="btn btn--ghost" data-pause disabled aria-pressed="false">Pause</button>
            </div>
        </section>
    `;

    const play = root.querySelector('.play');
    const canvas = root.querySelector('canvas');
    const context = canvas.getContext('2d');
    const overlay = root.querySelector('[data-overlay]');
    const overlayTitle = root.querySelector('[data-overlay-title]');
    const overlayText = root.querySelector('[data-overlay-text]');
    const startButton = root.querySelector('[data-start]');
    const pauseButton = root.querySelector('[data-pause]');
    const scoreEl = root.querySelector('[data-score]');
    const bestEl = root.querySelector('[data-best]');
    const levelEl = root.querySelector('[data-level]');
    const controller = new AbortController();

    if (!context) {
        root.textContent = 'This browser cannot draw the snake board.';
        return () => {};
    }

    /** @type {{ x: number, y: number }[]} */
    let snake = [];
    /** @type {{ x: number, y: number } | null} */
    let food = null;
    /** @type {'up' | 'down' | 'left' | 'right'} */
    let direction = 'right';
    /** @type {'up' | 'down' | 'left' | 'right' | null} */
    let queued = null;
    let score = 0;
    /** @type {'slow' | 'medium' | 'fast'} */
    let speed = 'slow';
    let best = readScore(storageKey());
    let alive = true;
    let started = false;
    let paused = false;
    let cell = 16;
    let frameId = 0;
    let lastTime = 0;
    let accumulator = 0;

    /**
     * @param {'slow' | 'medium' | 'fast'} pace
     * @returns {string}
     */
    function storageKey(pace = speed) {
        return `snake-${pace}`;
    }

    function currentLevel() {
        return 1 + Math.floor(score / POINTS_PER_LEVEL);
    }

    function showBest() {
        bestEl.textContent = best > 0 ? String(best) : '—';
        scoreEl.textContent = String(score);
        levelEl.textContent = String(currentLevel());
    }

    /**
     * @param {'slow' | 'medium' | 'fast'} next
     */
    function setSpeed(next) {
        if (!SPEEDS[next] || next === speed) {
            return;
        }

        speed = next;
        best = readScore(storageKey());
        accumulator = 0;
        root.querySelectorAll('[data-speed]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.speed === speed));
        });
        showBest();

        if (!started) {
            overlayText.textContent = `${SPEEDS[speed].label} pace. Walls wrap around. Only your own body ends the run.`;
        }
    }

    function spawnFood() {
        /** @type {{ x: number, y: number }[]} */
        const open = [];

        for (let y = 0; y < ROWS; y += 1) {
            for (let x = 0; x < COLS; x += 1) {
                if (!snake.some((part) => part.x === x && part.y === y)) {
                    open.push({ x, y });
                }
            }
        }

        if (!open.length) {
            food = null;
            return false;
        }

        food = open[Math.floor(Math.random() * open.length)];
        return true;
    }

    function refit() {
        const styles = getComputedStyle(play);
        const padding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
        const available = Math.max(160, play.clientWidth - padding);
        const cssCell = Math.max(10, Math.floor(Math.min(available, 420) / COLS));
        const size = cssCell * COLS;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        canvas.width = Math.floor(size * pixelRatio);
        canvas.height = Math.floor(size * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        cell = cssCell;
        draw();
    }

    function draw() {
        const size = cell * COLS;
        context.clearRect(0, 0, size, size);
        context.fillStyle = '#221e19';
        context.fillRect(0, 0, size, size);

        context.strokeStyle = 'rgba(244, 239, 228, 0.06)';
        context.lineWidth = 1;

        for (let line = 1; line < COLS; line += 1) {
            context.beginPath();
            context.moveTo(line * cell, 0);
            context.lineTo(line * cell, size);
            context.stroke();
            context.beginPath();
            context.moveTo(0, line * cell);
            context.lineTo(size, line * cell);
            context.stroke();
        }

        if (food) {
            context.fillStyle = '#3dceb0';
            context.beginPath();
            context.arc(
                food.x * cell + cell / 2,
                food.y * cell + cell / 2,
                cell * 0.28,
                0,
                Math.PI * 2,
            );
            context.fill();
        }

        const gap = Math.max(1, Math.floor(cell * 0.14));

        snake.forEach((part, index) => {
            context.fillStyle = index === 0 ? '#ffb085' : '#ef6b2c';
            roundRect(
                context,
                part.x * cell + gap,
                part.y * cell + gap,
                cell - gap * 2,
                cell - gap * 2,
                Math.min(6, cell / 4),
            );
            context.fill();
        });
    }

    /**
     * @param {boolean} didWin
     */
    function endGame(didWin) {
        alive = false;
        paused = false;
        pauseButton.disabled = true;
        pauseButton.textContent = 'Pause';
        pauseButton.setAttribute('aria-pressed', 'false');

        if (score > best) {
            best = score;
            writeScore(storageKey(), best);
        }

        showBest();
        overlay.hidden = false;
        overlayTitle.textContent = didWin ? 'Board cleared' : 'Game over';
        overlayText.textContent = `Score ${score}.`;
        startButton.textContent = 'Play again';
        startButton.focus();
    }

    function stepMs() {
        const pace = SPEEDS[speed];
        const drops = currentLevel() - 1;
        return Math.max(pace.floor, pace.start - drops * pace.step);
    }

    function update() {
        if (queued) {
            direction = queued;
            queued = null;
        }

        const delta = DELTA[direction];
        const head = snake[0];
        const next = {
            x: (head.x + delta.x + COLS) % COLS,
            y: (head.y + delta.y + ROWS) % ROWS,
        };

        const growing = Boolean(food && next.x === food.x && next.y === food.y);
        const occupied = growing ? snake : snake.slice(0, -1);

        if (occupied.some((part) => part.x === next.x && part.y === next.y)) {
            endGame(false);
            return;
        }

        snake.unshift(next);

        if (!growing) {
            snake.pop();
            return;
        }

        score += 1;

        if (score > best) {
            best = score;
            writeScore(storageKey(), best);
        }

        showBest();

        if (!spawnFood()) {
            endGame(true);
        }
    }

    /**
     * @param {number} now
     */
    function loop(now) {
        frameId = window.requestAnimationFrame(loop);

        if (!started || !alive || paused) {
            lastTime = now;
            draw();
            return;
        }

        if (!lastTime) {
            lastTime = now;
        }

        accumulator += now - lastTime;
        lastTime = now;
        const interval = stepMs();
        let steps = 0;

        while (accumulator >= interval && steps < 4 && alive) {
            update();
            accumulator -= interval;
            steps += 1;
        }

        if (accumulator > interval) {
            accumulator = 0;
        }

        draw();
    }

    /**
     * @param {boolean} autoStart
     */
    function reset(autoStart) {
        snake = [
            { x: 4, y: 8 },
            { x: 3, y: 8 },
            { x: 2, y: 8 },
        ];
        direction = 'right';
        queued = null;
        score = 0;
        alive = true;
        started = autoStart;
        paused = false;
        lastTime = 0;
        accumulator = 0;
        spawnFood();
        showBest();
        pauseButton.disabled = !autoStart;
        pauseButton.textContent = 'Pause';
        pauseButton.setAttribute('aria-pressed', 'false');
        overlay.hidden = autoStart;

        if (!autoStart) {
            overlayTitle.textContent = 'Ready?';
            overlayText.textContent = `${SPEEDS[speed].label} pace. Walls wrap around. Only your own body ends the run.`;
            startButton.textContent = 'Start';
        }

        draw();
    }

    /**
     * @param {'up' | 'down' | 'left' | 'right'} next
     */
    function queueDirection(next) {
        if (!started || !alive || paused) {
            return;
        }

        const current = queued || direction;

        if (next === current || next === OPPOSITE[current]) {
            return;
        }

        queued = next;
    }

    function togglePause() {
        if (!started || !alive) {
            return;
        }

        paused = !paused;
        pauseButton.textContent = paused ? 'Resume' : 'Pause';
        pauseButton.setAttribute('aria-pressed', String(paused));
    }

    const frame = root.querySelector('.frame');
    let swipeStart = null;

    frame.addEventListener('touchstart', (event) => {
        const touch = event.changedTouches[0];
        swipeStart = { x: touch.clientX, y: touch.clientY };
    }, { passive: true, signal: controller.signal });

    frame.addEventListener('touchend', (event) => {
        if (!swipeStart) {
            return;
        }

        const touch = event.changedTouches[0];
        const dx = touch.clientX - swipeStart.x;
        const dy = touch.clientY - swipeStart.y;
        swipeStart = null;

        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
            return;
        }

        if (Math.abs(dx) > Math.abs(dy)) {
            queueDirection(dx > 0 ? 'right' : 'left');
            return;
        }

        queueDirection(dy > 0 ? 'down' : 'up');
    }, { passive: true, signal: controller.signal });

    root.querySelectorAll('[data-dir]').forEach((button) => {
        button.addEventListener('click', () => {
            const next = button.dataset.dir;

            if (next === 'up' || next === 'down' || next === 'left' || next === 'right') {
                queueDirection(next);
            }
        }, { signal: controller.signal });
    });

    root.querySelectorAll('[data-speed]').forEach((button) => {
        button.addEventListener('click', () => {
            const next = button.dataset.speed;

            if (next === 'slow' || next === 'medium' || next === 'fast') {
                setSpeed(next);
            }
        }, { signal: controller.signal });
    });

    startButton.addEventListener('click', () => reset(true), { signal: controller.signal });
    pauseButton.addEventListener('click', togglePause, { signal: controller.signal });

    window.addEventListener('keydown', (event) => {
        if (event.key === ' ') {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            event.preventDefault();
            togglePause();
            return;
        }

        const next = KEYS[event.key] || KEYS[event.key.toLowerCase()];

        if (!next) {
            return;
        }

        event.preventDefault();
        queueDirection(next);
    }, { signal: controller.signal });

    const observer = new ResizeObserver(() => refit());
    observer.observe(play);
    bestEl.textContent = best > 0 ? String(best) : '—';
    reset(false);
    refit();
    frameId = window.requestAnimationFrame(loop);

    return () => {
        window.cancelAnimationFrame(frameId);
        observer.disconnect();
        controller.abort();
    };
}
