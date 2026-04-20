// ================================
// DNT GAME HUB — script.js
// ================================

// --- Particle Background ---
(function initParticles() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const colors = ['#b84dff', '#00d4ff', '#ff2d95', '#39ff14'];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 80; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            r: Math.random() * 2 + 1,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }

    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.5;
            ctx.fill();
        }
        // Draw connections
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = '#b84dff';
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                if (dx * dx + dy * dy < 15000) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
        ctx.globalAlpha = 1;
        requestAnimationFrame(drawParticles);
    }
    drawParticles();
})();

// --- Score System ---
let totalScore = 0;
let highScores = JSON.parse(localStorage.getItem('dnt-highscores') || '{}');

function addScore(game, points) {
    totalScore += points;
    document.getElementById('total-score').textContent = totalScore;
    if (!highScores[game] || points > highScores[game]) {
        highScores[game] = points;
        localStorage.setItem('dnt-highscores', JSON.stringify(highScores));
    }
    updateLeaderboard();
}

function updateLeaderboard() {
    const grid = document.getElementById('leaderboard-grid');
    const games = {
        snake: { name: '🐍 Snake', label: 'poäng' },
        memory: { name: '🧠 Memory', label: 'drag' },
        reaction: { name: '⚡ Reaktion', label: 'ms' },
        whack: { name: '🔨 Whack-a-Mole', label: 'poäng' },
        tictactoe: { name: '❌ Tic-Tac-Toe', label: 'vinster' }
    };
    grid.innerHTML = '';
    for (const [key, info] of Object.entries(games)) {
        const val = highScores[key] || 0;
        const card = document.createElement('div');
        card.className = 'lb-card';
        card.innerHTML = `<h4>${info.name}</h4><div class="lb-score">${val}</div><div class="lb-label">Bästa ${info.label}</div>`;
        grid.appendChild(card);
    }
}
updateLeaderboard();

// --- Game Modal ---
let activeGameCleanup = null;

function openGame(game) {
    document.getElementById('game-overlay').classList.remove('hidden');
    const container = document.getElementById('game-container');
    container.innerHTML = '';
    switch (game) {
        case 'snake': initSnake(container); break;
        case 'memory': initMemory(container); break;
        case 'reaction': initReaction(container); break;
        case 'whack': initWhack(container); break;
        case 'tictactoe': initTicTacToe(container); break;
    }
}

function closeGame() {
    document.getElementById('game-overlay').classList.add('hidden');
    document.getElementById('game-container').innerHTML = '';
    if (activeGameCleanup) { activeGameCleanup(); activeGameCleanup = null; }
}

function closeGameOutside(e) {
    if (e.target === e.currentTarget) closeGame();
}

// ================================
// 🐍 SNAKE
// ================================
function initSnake(container) {
    container.innerHTML = `
        <h2 class="game-title">🐍 Snake</h2>
        <p class="game-score">Poäng: <span id="snake-score">0</span></p>
        <canvas id="snake-canvas" width="400" height="400"></canvas>
        <div class="touch-controls">
            <div class="touch-grid">
                <div class="empty"></div>
                <button onclick="snakeDir('up')">⬆️</button>
                <div class="empty"></div>
                <button onclick="snakeDir('left')">⬅️</button>
                <div class="empty"></div>
                <button onclick="snakeDir('right')">➡️</button>
                <div class="empty"></div>
                <button onclick="snakeDir('down')">⬇️</button>
                <div class="empty"></div>
            </div>
        </div>
        <button class="game-btn" id="snake-restart">🔄 Starta om</button>
        <p class="game-info">Använd piltangenter för att styra</p>
    `;

    const canvas = document.getElementById('snake-canvas');
    const ctx = canvas.getContext('2d');
    const size = 20, cols = canvas.width / size, rows = canvas.height / size;
    let snake, dir, food, score, gameLoop, gameOver;

    function start() {
        snake = [{ x: 10, y: 10 }];
        dir = { x: 1, y: 0 };
        score = 0;
        gameOver = false;
        document.getElementById('snake-score').textContent = '0';
        placeFood();
        if (gameLoop) clearInterval(gameLoop);
        gameLoop = setInterval(tick, 100);
    }

    function placeFood() {
        do {
            food = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
        } while (snake.some(s => s.x === food.x && s.y === food.y));
    }

    function tick() {
        if (gameOver) return;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows ||
            snake.some(s => s.x === head.x && s.y === head.y)) {
            gameOver = true;
            clearInterval(gameLoop);
            addScore('snake', score);
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff2d95';
            ctx.font = '24px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 10);
            ctx.fillStyle = '#fff';
            ctx.font = '14px "Press Start 2P", monospace';
            ctx.fillText('Poäng: ' + score, canvas.width / 2, canvas.height / 2 + 20);
            return;
        }

        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
            score += 10;
            document.getElementById('snake-score').textContent = score;
            placeFood();
        } else {
            snake.pop();
        }
        draw();
    }

    function draw() {
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        for (let i = 0; i < cols; i++) {
            ctx.beginPath(); ctx.moveTo(i * size, 0); ctx.lineTo(i * size, canvas.height); ctx.stroke();
        }
        for (let i = 0; i < rows; i++) {
            ctx.beginPath(); ctx.moveTo(0, i * size); ctx.lineTo(canvas.width, i * size); ctx.stroke();
        }

        // Food
        ctx.fillStyle = '#ff2d95';
        ctx.shadowColor = '#ff2d95';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(food.x * size + size / 2, food.y * size + size / 2, size / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Snake
        snake.forEach((s, i) => {
            const alpha = 1 - (i / snake.length) * 0.5;
            ctx.fillStyle = i === 0 ? '#39ff14' : `rgba(57,255,20,${alpha})`;
            ctx.shadowColor = '#39ff14';
            ctx.shadowBlur = i === 0 ? 10 : 5;
            ctx.fillRect(s.x * size + 1, s.y * size + 1, size - 2, size - 2);
        });
        ctx.shadowBlur = 0;
    }

    // Global direction function for touch controls
    window.snakeDir = function (d) {
        const dirs = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
        const nd = dirs[d];
        if (nd && !(nd.x === -dir.x && nd.y === -dir.y)) dir = nd;
    };

    function onKey(e) {
        const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
        if (map[e.key]) { e.preventDefault(); window.snakeDir(map[e.key]); }
    }

    document.addEventListener('keydown', onKey);
    document.getElementById('snake-restart').addEventListener('click', start);

    activeGameCleanup = () => {
        clearInterval(gameLoop);
        document.removeEventListener('keydown', onKey);
    };

    start();
}

// ================================
// 🧠 MEMORY
// ================================
function initMemory(container) {
    const emojis = ['🎮', '🚀', '🔥', '💎', '👾', '🌈', '⭐', '🎯'];
    let cards = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
    let flipped = [], matched = 0, moves = 0, locked = false;

    container.innerHTML = `
        <h2 class="game-title">🧠 Memory</h2>
        <p class="game-score">Drag: <span id="memory-moves">0</span> | Matchade: <span id="memory-matched">0</span>/8</p>
        <div class="memory-board" id="memory-board"></div>
        <button class="game-btn" id="memory-restart">🔄 Starta om</button>
    `;

    const board = document.getElementById('memory-board');

    function renderBoard() {
        board.innerHTML = '';
        cards.forEach((emoji, i) => {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.innerHTML = `<span class="card-front">${emoji}</span><span class="card-back">❓</span>`;
            card.addEventListener('click', () => flipCard(card, i));
            board.appendChild(card);
        });
    }

    function flipCard(card, index) {
        if (locked || card.classList.contains('flipped') || card.classList.contains('matched')) return;
        card.classList.add('flipped');
        flipped.push({ card, index });

        if (flipped.length === 2) {
            moves++;
            document.getElementById('memory-moves').textContent = moves;
            locked = true;

            if (cards[flipped[0].index] === cards[flipped[1].index]) {
                flipped[0].card.classList.add('matched');
                flipped[1].card.classList.add('matched');
                matched++;
                document.getElementById('memory-matched').textContent = matched;
                flipped = [];
                locked = false;

                if (matched === 8) {
                    addScore('memory', moves);
                    setTimeout(() => alert(`🎉 Grattis! Du klarade det på ${moves} drag!`), 400);
                }
            } else {
                setTimeout(() => {
                    flipped[0].card.classList.remove('flipped');
                    flipped[1].card.classList.remove('flipped');
                    flipped = [];
                    locked = false;
                }, 800);
            }
        }
    }

    document.getElementById('memory-restart').addEventListener('click', () => {
        cards = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
        flipped = []; matched = 0; moves = 0; locked = false;
        document.getElementById('memory-moves').textContent = '0';
        document.getElementById('memory-matched').textContent = '0';
        renderBoard();
    });

    renderBoard();
}

// ================================
// ⚡ REACTION TEST
// ================================
function initReaction(container) {
    container.innerHTML = `
        <h2 class="game-title">⚡ Reaktionstest</h2>
        <p class="game-score">Bästa tid: <span id="reaction-best">–</span></p>
        <div class="reaction-box waiting" id="reaction-box">
            <span>Vänta på grönt... Klicka sedan!</span>
        </div>
        <p class="game-info">Klicka så snabbt du kan när rutan blir grön!</p>
    `;

    const box = document.getElementById('reaction-box');
    let timeout = null, startTime = 0, best = Infinity, state = 'waiting';

    function startRound() {
        state = 'waiting';
        box.className = 'reaction-box waiting';
        box.querySelector('span').textContent = 'Vänta på grönt...';
        timeout = setTimeout(() => {
            state = 'ready';
            startTime = Date.now();
            box.className = 'reaction-box ready';
            box.querySelector('span').textContent = 'KLICKA NU!!!';
        }, 1000 + Math.random() * 4000);
    }

    box.addEventListener('click', () => {
        if (state === 'waiting') {
            clearTimeout(timeout);
            box.className = 'reaction-box result';
            box.querySelector('span').textContent = '😬 För tidigt! Klicka för att försöka igen.';
            state = 'result';
        } else if (state === 'ready') {
            const ms = Date.now() - startTime;
            if (ms < best) best = ms;
            document.getElementById('reaction-best').textContent = best + ' ms';
            box.className = 'reaction-box result';
            box.querySelector('span').textContent = `⚡ ${ms} ms! Klicka för att köra igen.`;
            state = 'result';
            addScore('reaction', ms);
        } else {
            startRound();
        }
    });

    activeGameCleanup = () => clearTimeout(timeout);
    startRound();
}

// ================================
// 🔨 WHACK-A-MOLE
// ================================
function initWhack(container) {
    container.innerHTML = `
        <h2 class="game-title">🔨 Whack-a-Mole</h2>
        <p class="game-score">Poäng: <span id="whack-score">0</span> | Tid: <span id="whack-time">30</span>s</p>
        <div class="mole-grid" id="mole-grid"></div>
        <button class="game-btn" id="whack-start">▶️ Starta!</button>
    `;

    const grid = document.getElementById('mole-grid');
    let score = 0, timer = null, moleTimer = null, timeLeft = 30, running = false;

    // Create holes
    for (let i = 0; i < 9; i++) {
        const hole = document.createElement('div');
        hole.className = 'mole-hole';
        hole.textContent = '🕳️';
        hole.addEventListener('click', () => whack(hole));
        grid.appendChild(hole);
    }

    const holes = grid.querySelectorAll('.mole-hole');

    function showMole() {
        holes.forEach(h => { h.classList.remove('active'); h.textContent = '🕳️'; });
        const i = Math.floor(Math.random() * 9);
        holes[i].classList.add('active');
        holes[i].textContent = '🐹';
    }

    function whack(hole) {
        if (!running || !hole.classList.contains('active')) return;
        hole.classList.remove('active');
        hole.classList.add('hit');
        hole.textContent = '💥';
        score += 10;
        document.getElementById('whack-score').textContent = score;
        setTimeout(() => { hole.classList.remove('hit'); hole.textContent = '🕳️'; }, 300);
    }

    function startGame() {
        score = 0; timeLeft = 30; running = true;
        document.getElementById('whack-score').textContent = '0';
        document.getElementById('whack-time').textContent = '30';
        document.getElementById('whack-start').style.display = 'none';

        moleTimer = setInterval(showMole, 800);
        timer = setInterval(() => {
            timeLeft--;
            document.getElementById('whack-time').textContent = timeLeft;
            if (timeLeft <= 10) {
                clearInterval(moleTimer);
                moleTimer = setInterval(showMole, 500); // Snabbare!
            }
            if (timeLeft <= 0) {
                clearInterval(timer);
                clearInterval(moleTimer);
                running = false;
                holes.forEach(h => { h.classList.remove('active'); h.textContent = '🕳️'; });
                addScore('whack', score);
                document.getElementById('whack-start').style.display = 'block';
                document.getElementById('whack-start').textContent = `🔄 Igen! (${score} poäng)`;
            }
        }, 1000);
    }

    document.getElementById('whack-start').addEventListener('click', startGame);

    activeGameCleanup = () => {
        clearInterval(timer);
        clearInterval(moleTimer);
    };
}

// ================================
// ❌⭕ TIC-TAC-TOE
// ================================
function initTicTacToe(container) {
    container.innerHTML = `
        <h2 class="game-title">❌⭕ Tic-Tac-Toe</h2>
        <p class="game-score" id="ttt-status">Din tur (X)</p>
        <div class="ttt-board" id="ttt-board"></div>
        <button class="game-btn" id="ttt-restart">🔄 Starta om</button>
        <p class="game-info">Spela mot datorn! Du är X.</p>
    `;

    let board, currentPlayer, gameActive, wins = highScores.tictactoe || 0;
    const winCombos = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const boardEl = document.getElementById('ttt-board');

    function start() {
        board = Array(9).fill('');
        currentPlayer = 'X';
        gameActive = true;
        document.getElementById('ttt-status').textContent = 'Din tur (X)';
        renderBoard();
    }

    function renderBoard() {
        boardEl.innerHTML = '';
        board.forEach((val, i) => {
            const cell = document.createElement('div');
            cell.className = 'ttt-cell' + (val === 'X' ? ' x' : val === 'O' ? ' o' : '');
            cell.textContent = val;
            cell.addEventListener('click', () => playerMove(i));
            boardEl.appendChild(cell);
        });
    }

    function playerMove(i) {
        if (!gameActive || board[i] || currentPlayer !== 'X') return;
        board[i] = 'X';
        if (checkWin('X')) {
            gameActive = false;
            wins++;
            highScores.tictactoe = wins;
            localStorage.setItem('dnt-highscores', JSON.stringify(highScores));
            renderBoard();
            highlightWin('X');
            document.getElementById('ttt-status').textContent = '🎉 Du vann!';
            updateLeaderboard();
            return;
        }
        if (board.every(c => c)) {
            gameActive = false;
            renderBoard();
            document.getElementById('ttt-status').textContent = '🤝 Oavgjort!';
            return;
        }
        currentPlayer = 'O';
        renderBoard();
        document.getElementById('ttt-status').textContent = 'Datorn tänker...';
        setTimeout(aiMove, 500);
    }

    function aiMove() {
        if (!gameActive) return;
        // Simple AI: win > block > center > random
        let move = findWinMove('O') ?? findWinMove('X') ?? (board[4] === '' ? 4 : null);
        if (move === null) {
            const empty = board.map((v, i) => v === '' ? i : null).filter(v => v !== null);
            move = empty[Math.floor(Math.random() * empty.length)];
        }
        board[move] = 'O';
        if (checkWin('O')) {
            gameActive = false;
            renderBoard();
            highlightWin('O');
            document.getElementById('ttt-status').textContent = '😢 Datorn vann!';
            return;
        }
        if (board.every(c => c)) {
            gameActive = false;
            renderBoard();
            document.getElementById('ttt-status').textContent = '🤝 Oavgjort!';
            return;
        }
        currentPlayer = 'X';
        renderBoard();
        document.getElementById('ttt-status').textContent = 'Din tur (X)';
    }

    function findWinMove(player) {
        for (const combo of winCombos) {
            const vals = combo.map(i => board[i]);
            if (vals.filter(v => v === player).length === 2 && vals.includes('')) {
                return combo[vals.indexOf('')];
            }
        }
        return null;
    }

    function checkWin(player) {
        return winCombos.some(combo => combo.every(i => board[i] === player));
    }

    function highlightWin(player) {
        const combo = winCombos.find(c => c.every(i => board[i] === player));
        if (combo) {
            const cells = boardEl.querySelectorAll('.ttt-cell');
            combo.forEach(i => cells[i].classList.add('win'));
        }
    }

    document.getElementById('ttt-restart').addEventListener('click', start);
    start();
}