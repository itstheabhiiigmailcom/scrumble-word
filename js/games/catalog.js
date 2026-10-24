/**
 * Games shown on the home page and in the header.
 * To add a game, drop a module that exports mount(root) and append an entry here.
 * mount(root) must return a cleanup function.
 */
export const games = [
    {
        id: 'scramble',
        title: 'Word Scramble',
        eyebrow: 'Words',
        mark: 'Aa',
        accent: '#ef6b2c',
        summary: 'Unscramble a computing term before the 30-second clock runs out.',
        howTo: [
            'Letter tiles show a scrambled computing term, with a hint underneath.',
            'Type the original word and press Check word, or press Enter. Capitalization does not matter.',
            'A correct word scores one point and loads the next puzzle.',
            'Refresh word skips the current puzzle, loads another, and resets the clock.',
            'If time runs out, the answer is shown and the next word starts on its own.',
        ],
        load: () => import('./scramble/scramble.js'),
    },
    {
        id: 'tic-tac-toe',
        title: 'Tic-Tac-Toe',
        eyebrow: 'Board',
        mark: 'XO',
        accent: '#3d6fbf',
        summary: 'Take three in a row against a perfect computer, or pass the device to a friend.',
        howTo: [
            'Solo: you are X and the computer is O. Pass and play: two people share this screen.',
            'Choose an empty square. Three of your marks in a row, column, or diagonal wins.',
            'The computer plays a perfect game, so a draw is a strong result in Solo.',
            'Restart round clears the board. The score stays until you leave or switch mode.',
        ],
        load: () => import('./tictactoe/tictactoe.js'),
    },
    {
        id: 'memory',
        title: 'Memory Match',
        eyebrow: 'Recall',
        mark: '8',
        accent: '#1f8a78',
        summary: 'Flip cards two at a time and clear the board in as few moves as you can.',
        howTo: [
            'Turn over two cards. Matching symbols stay face up.',
            'A mismatch turns both cards face down again.',
            'The clock starts on your first flip. Clear all eight pairs.',
            'Your lowest move count on this browser is kept for the next visit.',
        ],
        load: () => import('./memory/memory.js'),
    },
    {
        id: 'snake',
        title: 'Snake',
        eyebrow: 'Arcade',
        mark: 'Sn',
        accent: '#c4493a',
        summary: 'Pick a pace, then steer the snake to the food. Walls wrap around, and only your own body ends the run.',
        howTo: [
            'Choose Slow, Medium, or Fast. Slow is the gentlest pace, and you can change it at any time.',
            'Press Start, then guide the snake into the food. Each bite adds a point and grows the tail.',
            'Use the arrow keys, W A S D, the on-screen pad, or swipe the board. You cannot reverse straight into yourself.',
            'Every five points raises the level and the snake speeds up a little, while staying inside the pace you picked.',
            'Leaving one side of the board brings the snake in from the opposite side, still facing the same way. The run ends only if you run into your own body. Space pauses after the game has started. Each pace keeps its own best score in this browser.',
        ],
        load: () => import('./snake/snake.js'),
    },
    {
        id: 'hangman',
        title: 'Hangman',
        eyebrow: 'Words',
        mark: 'H',
        accent: '#e4b15a',
        summary: 'Guess the hidden word one letter at a time before the figure is complete.',
        howTo: [
            'Read the hint, then pick a letter on the keyboard or type it.',
            'A correct letter fills every matching blank. A wrong letter draws part of the figure.',
            'Six wrong guesses loses the round, and the word is revealed.',
            'New word loads another puzzle. Solved words add to your score.',
        ],
        load: () => import('./hangman/hangman.js'),
    },
    {
        id: '2048',
        title: '2048',
        eyebrow: 'Puzzle',
        mark: '48',
        accent: '#7a9f3a',
        summary: 'Slide numbered tiles. Matching numbers merge, and 2048 is the goal.',
        howTo: [
            'Slide with the arrow keys, W A S D, a swipe on the board, or the on-screen pad.',
            'Two tiles with the same number combine into their sum when they collide.',
            'Every slide that changes the board adds a new 2 or 4.',
            'The round ends when no slide is possible. Reach 2048, then keep going for a higher score.',
            'Your best score stays in this browser.',
        ],
        load: () => import('./twenty48/twenty48.js'),
    },
];

/**
 * @param {string} id
 * @returns {(typeof games)[number] | null}
 */
export function findGame(id) {
    return games.find((game) => game.id === id) ?? null;
}
