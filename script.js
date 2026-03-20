// 基本参数
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // canvas 单元格大小

let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
let nextCanvas = document.getElementById('nextCanvas');
let nextCtx = nextCanvas.getContext('2d');
let scoreEl = document.getElementById('score');
let levelEl = document.getElementById('level');
let bestScoreEl = document.getElementById('bestScore');
let restartBtn = document.getElementById('restartBtn');

let grid; // 游戏网格
let currentPiece;
let nextPieceData;
let dropInterval = 500; // 下落间隔 ms
let dropTimer;
let score = 0;
let level = 1;
let totalLinesCleared = 0;
let bestScore = 0;
let gameOver = false;

// 方块形状定义 (四个旋转状态)
const SHAPES = [
    // I
    [
        [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
        [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    ],
    // J
    [
        [[1,0,0],[1,1,1],[0,0,0]],
        [[0,1,1],[0,1,0],[0,1,0]],
        [[0,0,0],[1,1,1],[0,0,1]],
        [[0,1,0],[0,1,0],[1,1,0]],
    ],
    // L
    [
        [[0,0,1],[1,1,1],[0,0,0]],
        [[0,1,0],[0,1,0],[0,1,1]],
        [[0,0,0],[1,1,1],[1,0,0]],
        [[1,1,0],[0,1,0],[0,1,0]],
    ],
    // O
    [
        [[1,1],[1,1]],
    ],
    // S
    [
        [[0,1,1],[1,1,0],[0,0,0]],
        [[0,1,0],[0,1,1],[0,0,1]],
    ],
    // T
    [
        [[0,1,0],[1,1,1],[0,0,0]],
        [[0,1,0],[0,1,1],[0,1,0]],
        [[0,0,0],[1,1,1],[0,1,0]],
        [[0,1,0],[1,1,0],[0,1,0]],
    ],
    // Z
    [
        [[1,1,0],[0,1,1],[0,0,0]],
        [[0,0,1],[0,1,1],[0,1,0]],
    ],
];

// 随机生成方块
function randomPiece() {
    let type = Math.floor(Math.random() * SHAPES.length);
    let shape = SHAPES[type];
    return {
        type,
        shape,
        rotation: 0,
        x: Math.floor(COLS/2) - 1,
        y: 0,
    };
}

// 初始化或重置网格
function initGrid() {
    grid = [];
    for (let r = 0; r < ROWS; r++) {
        grid[r] = new Array(COLS).fill(0);
    }
}

// 根据当前等级计算下落间隔
function updateSpeed() {
    dropInterval = Math.max(50, 500 - (level - 1) * 50);
}

// 重新启动下落定时器
function restartDropTimer() {
    clearInterval(dropTimer);
    dropTimer = setInterval(drop, dropInterval);
}

// 绘制网格和当前方块
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 绘制已固定方块
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c]) {
                drawCell(c, r, '#d32f2f');
            }
        }
    }
    // 绘制当前活动方块
    if (currentPiece) {
        let matrix = currentPiece.shape[currentPiece.rotation];
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c]) {
                    drawCell(currentPiece.x + c, currentPiece.y + r, '#ff5252');
                }
            }
        }
    }
    drawNext();
}

// 绘制单元格
function drawCell(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

// 绘制下一个方块预览
function drawNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (nextPieceData) {
        let matrix = nextPieceData.shape[0]; // 显示第一个旋转状态
        let offsetX = (nextCanvas.width - matrix[0].length * BLOCK_SIZE) / 2;
        let offsetY = (nextCanvas.height - matrix.length * BLOCK_SIZE) / 2;
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c]) {
                    nextCtx.fillStyle = '#ff5252';
                    nextCtx.fillRect(offsetX + c * BLOCK_SIZE, offsetY + r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    nextCtx.strokeStyle = '#fff';
                    nextCtx.strokeRect(offsetX + c * BLOCK_SIZE, offsetY + r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }
    }
}

// 碰撞检测
function collide(xOffset = 0, yOffset = 0, rotation = null) {
    let rot = rotation === null ? currentPiece.rotation : rotation;
    let matrix = currentPiece.shape[rot];
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c]) {
                let nx = currentPiece.x + c + xOffset;
                let ny = currentPiece.y + r + yOffset;
                if (nx < 0 || nx >= COLS || ny >= ROWS || (ny >=0 && grid[ny][nx])) {
                    return true;
                }
            }
        }
    }
    return false;
}

// 固定当前方块到网格
function lockPiece() {
    let matrix = currentPiece.shape[currentPiece.rotation];
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c]) {
                grid[currentPiece.y + r][currentPiece.x + c] = 1;
            }
        }
    }
}

// 清除整行
function clearLines() {
    let lines = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (grid[r].every(cell => cell)) {
            grid.splice(r, 1);
            grid.unshift(new Array(COLS).fill(0));
            lines++;
            r++; // 再次检查当前行，因为它已被新的行覆盖
        }
    }
    if (lines) {
        score += lines * 100;
        scoreEl.textContent = score;
        // 判断并更新最高分
        if (score > bestScore) {
            bestScore = score;
            bestScoreEl.textContent = bestScore;
            localStorage.setItem('tetrisBestScore', bestScore);
        }
        totalLinesCleared += lines;
        let newLevel = Math.floor(totalLinesCleared / 5) + 1;
        if (newLevel > level) {
            level = newLevel;
            levelEl.textContent = level;
            updateSpeed();
            restartDropTimer();
        }
    }
}

// 生成下一个方块
function spawnNextPiece() {
    if (!nextPieceData) {
        nextPieceData = randomPiece();
    }
    currentPiece = nextPieceData;
    nextPieceData = randomPiece();
    // 如果新方块一产生就碰撞，游戏结束
    if (collide()) {
        endGame();
    }
}

// 下落逻辑
function drop() {
    if (!currentPiece) return;
    if (!collide(0, 1)) {
        currentPiece.y++;
    } else {
        lockPiece();
        clearLines();
        spawnNextPiece();
    }
    draw();
}

// 用户控制
function move(dir) {
    if (!collide(dir, 0)) {
        currentPiece.x += dir;
        draw();
    }
}

function rotate() {
    let newRot = (currentPiece.rotation + 1) % currentPiece.shape.length;
    if (!collide(0, 0, newRot)) {
        currentPiece.rotation = newRot;
        draw();
    }
}

// 事件监听
document.addEventListener('keydown', e => {
    if (gameOver) return;
    switch(e.key) {
        case 'ArrowLeft': move(-1); break;
        case 'ArrowRight': move(1); break;
        case 'ArrowUp': rotate(); break;
        case 'ArrowDown': drop(); break;
    }
});

// 游戏结束处理
function endGame() {
    clearInterval(dropTimer);
    gameOver = true;
    alert('游戏结束');
}

// 重置游戏
function restart() {
    clearInterval(dropTimer);
    score = 0;
    level = 1;
    totalLinesCleared = 0;
    scoreEl.textContent = score;
    levelEl.textContent = level;
    gameOver = false;
    initGrid();
    nextPieceData = null;
    spawnNextPiece();
    updateSpeed();
    restartDropTimer();
    draw();
}

restartBtn.addEventListener('click', restart);

// 初始化并开始
initGrid();
level = 1;
totalLinesCleared = 0;
score = 0;
bestScore = Number(localStorage.getItem('tetrisBestScore')) || 0;
levelEl.textContent = level;
scoreEl.textContent = score;
bestScoreEl.textContent = bestScore;
nextPieceData = null;
spawnNextPiece();
updateSpeed();
restartDropTimer();
draw();
