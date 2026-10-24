const PREFIX = 'gameshelf.';

/**
 * Reads a number saved in this browser. Returns 0 when storage is empty or blocked.
 * @param {string} key
 * @returns {number}
 */
export function readScore(key) {
    try {
        const value = Number(window.localStorage.getItem(PREFIX + key));
        return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
        return 0;
    }
}

/**
 * Saves a number in this browser. Failure is ignored so the game still runs.
 * @param {string} key
 * @param {number} value
 */
export function writeScore(key, value) {
    try {
        window.localStorage.setItem(PREFIX + key, String(value));
    } catch {
        // Private mode and blocked storage should not stop play.
    }
}
