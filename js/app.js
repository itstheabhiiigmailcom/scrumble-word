import { findGame, games } from './games/catalog.js';

const app = document.querySelector('#app');

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

/**
 * @param {(typeof games)[number]} game
 * @returns {string}
 */
function gameCard(game) {
    const steps = game.howTo.map((step) => `<li>${escapeHtml(step)}</li>`).join('');

    return `
        <article class="game-card" style="--accent: ${game.accent}">
            <a class="game-card__link" href="#/play/${escapeHtml(game.id)}">
                <span class="game-card__mark" aria-hidden="true">${escapeHtml(game.mark)}</span>
                <p class="eyebrow">${escapeHtml(game.eyebrow)}</p>
                <h2>${escapeHtml(game.title)}</h2>
                <p class="summary">${escapeHtml(game.summary)}</p>
                <span class="game-card__cta">Play</span>
            </a>
            <details class="card-rules">
                <summary>How to play</summary>
                <ol>${steps}</ol>
            </details>
        </article>
    `;
}

/**
 * @param {(typeof games)[number]} game
 * @returns {string}
 */
function gamePage(game) {
    const steps = game.howTo.map((step) => `<li>${escapeHtml(step)}</li>`).join('');

    return `
        <article class="stage">
            <header class="stage-head">
                <a class="back" href="#/">All games</a>
                <p class="eyebrow">${escapeHtml(game.eyebrow)}</p>
                <h1>${escapeHtml(game.title)}</h1>
                <p class="summary">${escapeHtml(game.summary)}</p>
            </header>
            <div id="game-root" class="game-root" data-game="${escapeHtml(game.id)}">
                <p class="loading">Loading game…</p>
            </div>
            <section class="howto" aria-labelledby="howto-title">
                <h2 id="howto-title">How to play</h2>
                <ol>${steps}</ol>
            </section>
        </article>
    `;
}

app.innerHTML = `
    <a class="skip" href="#view">Skip to games</a>
    <header class="site-header">
        <div class="wrap header-bar">
            <a class="logo" href="#/" data-nav="home">
                <span class="logo__mark" aria-hidden="true">G</span>
                <span>Game Shelf</span>
            </a>
            <nav aria-label="Games">
                <ul class="nav-list">
                    ${games.map((game) => `
                        <li>
                            <a href="#/play/${escapeHtml(game.id)}" data-nav="${escapeHtml(game.id)}">${escapeHtml(game.title)}</a>
                        </li>
                    `).join('')}
                </ul>
            </nav>
        </div>
    </header>
    <main id="view" class="wrap view"></main>
    <footer class="site-footer">
        <div class="wrap">
            <p>Six games, all in the browser. Best scores stay on this device only.</p>
        </div>
    </footer>
`;

const view = document.querySelector('#view');
let generation = 0;
let cleanup = () => {};

/**
 * @param {string} id
 */
function setActive(id) {
    document.querySelectorAll('[data-nav]').forEach((link) => {
        const active = link.dataset.nav === id;
        link.classList.toggle('is-active', active);

        if (active) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

function teardown() {
    cleanup();
    cleanup = () => {};
}

function renderHome() {
    generation += 1;
    teardown();
    setActive('home');
    document.title = 'Game Shelf';
    window.scrollTo(0, 0);
    view.innerHTML = `
        <section class="hero">
            <p class="eyebrow">Browser arcade</p>
            <h1>Six games, one shelf.</h1>
            <p class="summary">Pick a game, read how it plays, and start. No accounts and nothing to install.</p>
        </section>
        <section class="catalog" aria-label="Games">
            ${games.map(gameCard).join('')}
        </section>
    `;
}

function renderMissing() {
    generation += 1;
    teardown();
    setActive('');
    document.title = 'Not found · Game Shelf';
    window.scrollTo(0, 0);
    view.innerHTML = `
        <section class="missing">
            <p class="eyebrow">Missing</p>
            <h1>That game is not on the shelf.</h1>
            <p class="summary">Choose one of the six games from the home page.</p>
            <a class="btn btn--light" href="#/">Back to games</a>
        </section>
    `;
}

/**
 * @param {(typeof games)[number]} game
 */
async function renderGame(game) {
    const current = generation + 1;
    generation = current;
    teardown();
    setActive(game.id);
    document.title = `${game.title} · Game Shelf`;
    window.scrollTo(0, 0);
    view.innerHTML = gamePage(game);

    const root = view.querySelector('#game-root');

    try {
        const module = await game.load();

        if (current !== generation) {
            return;
        }

        const stop = module.mount(root);

        if (current !== generation) {
            if (typeof stop === 'function') {
                stop();
            }
            return;
        }

        cleanup = typeof stop === 'function' ? stop : () => {};
    } catch (error) {
        console.error(error);

        if (current !== generation || !root) {
            return;
        }

        root.replaceChildren();
        const message = document.createElement('p');
        message.className = 'loading';
        message.textContent = 'This game could not start. Go back and try another.';
        root.append(message);
    }
}

function route() {
    const hash = window.location.hash.replace(/^#/, '') || '/';
    const match = hash.match(/^\/play\/([a-z0-9-]+)$/);

    if (!match) {
        renderHome();
        return;
    }

    const game = findGame(match[1]);

    if (!game) {
        renderMissing();
        return;
    }

    renderGame(game);
}

window.addEventListener('hashchange', route);
route();
