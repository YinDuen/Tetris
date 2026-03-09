// 遊戲常數
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
  null,
  '#00ffc8', // I - 青綠
  '#ffd700', // O - 金
  '#9d4edd', // T - 紫
  '#00ff00', // S - 綠
  '#ff006e', // Z - 紅
  '#0096c7', // J - 藍
  '#ff9500', // L - 橘
];

// 七種方塊形狀 (每個形狀的多種旋轉狀態)
const SHAPES = [
  null,
  [[1, 1, 1, 1]],                                           // I
  [[2, 2], [2, 2]],                                         // O
  [[0, 3, 0], [3, 3, 3]],                                   // T
  [[0, 4, 4], [4, 4, 0]],                                   // S
  [[5, 5, 0], [0, 5, 5]],                                   // Z
  [[6, 0, 0], [6, 6, 6]],                                   // J
  [[0, 0, 7], [7, 7, 7]],                                   // L
];

// 完整旋轉狀態 (預計算，方便旋轉)
const SHAPE_ROTATIONS = {
  1: [ [[1,1,1,1]], [[1],[1],[1],[1]] ],
  2: [ [[2,2],[2,2]] ],
  3: [ [[0,3,0],[3,3,3]], [[3,0],[3,3],[3,0]], [[3,3,3],[0,3,0]], [[0,3],[3,3],[0,3]] ],
  4: [ [[0,4,4],[4,4,0]], [[4,0],[4,4],[0,4]] ],
  5: [ [[5,5,0],[0,5,5]], [[0,5],[5,5],[5,0]] ],
  6: [ [[6,0,0],[6,6,6]], [[6,6],[6,0],[6,0]], [[6,6,6],[0,0,6]], [[0,6],[0,6],[6,6]] ],
  7: [ [[0,0,7],[7,7,7]], [[7,0],[7,0],[7,7]], [[7,7,7],[7,0,0]], [[7,7],[0,7],[0,7]] ],
};

const canvas = document.getElementById('gameCanvas');
const nextCanvas = document.getElementById('nextCanvas');
const ctx = canvas.getContext('2d');
const nextCtx = nextCanvas.getContext('2d');

// 音效（Web Audio API，無需外部檔案）
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playTone(freq, duration, type = 'square', volume = 0.15, attack = 0.002) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration);
  } catch (_) {}
}
const sound = {
  clearLines(count) {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    // 依消除行數播放短上行旋律，正弦波 + 柔和包絡，較順耳
    const notes = [[523], [392, 523], [330, 392, 523], [262, 330, 392, 523]][count - 1] || [523];
    const noteLen = 0.12;
    const gap = 0.055;
    notes.forEach((freq, i) => {
      const start = ctx.currentTime + i * (noteLen + gap);
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, start);
        osc.type = 'sine';
        const at = 0.02;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.2, start + at);
        gain.gain.exponentialRampToValueAtTime(0.001, start + noteLen);
        osc.start(start);
        osc.stop(start + noteLen);
      } catch (_) {}
    });
  },
};

// 各關卡專用 BGM（每關不同旋律與低音，關卡 6+ 循環 1～5）
const BGM_TRACKS = [
  { name: 'Lv1', melody: [
    { f: 262, d: 380 }, { f: 330, d: 380 }, { f: 392, d: 560 }, { f: 523, d: 560 }, { f: 392, d: 280 }, { f: 330, d: 720 },
    { f: 0, d: 140 }, { f: 294, d: 320 }, { f: 330, d: 320 }, { f: 349, d: 320 }, { f: 392, d: 500 }, { f: 440, d: 500 }, { f: 392, d: 320 }, { f: 349, d: 660 },
    { f: 0, d: 160 }, { f: 330, d: 280 }, { f: 392, d: 280 }, { f: 440, d: 440 }, { f: 523, d: 500 }, { f: 440, d: 280 }, { f: 392, d: 580 }, { f: 330, d: 580 },
    { f: 0, d: 180 }, { f: 392, d: 320 }, { f: 330, d: 320 }, { f: 262, d: 500 }, { f: 262, d: 400 }, { f: 294, d: 400 }, { f: 330, d: 660 },
    { f: 0, d: 220 }, { f: 523, d: 500 }, { f: 392, d: 400 }, { f: 330, d: 500 }, { f: 262, d: 960 },
    { f: 0, d: 240 }, { f: 349, d: 340 }, { f: 392, d: 340 }, { f: 440, d: 520 }, { f: 523, d: 520 }, { f: 392, d: 340 }, { f: 349, d: 700 },
    { f: 0, d: 200 }, { f: 440, d: 380 }, { f: 523, d: 380 }, { f: 587, d: 560 }, { f: 659, d: 560 }, { f: 523, d: 380 }, { f: 440, d: 760 },
    { f: 0, d: 240 }, { f: 392, d: 380 }, { f: 330, d: 380 }, { f: 262, d: 600 }, { f: 262, d: 880 },
  ], bass: [131, 98, 131, 98, 131, 98, 110, 98, 131, 98, 131, 98, 110, 98, 110, 98], bassMs: 720 },
  { name: 'Lv2', melody: [
    { f: 330, d: 320 }, { f: 392, d: 320 }, { f: 440, d: 480 }, { f: 523, d: 640 }, { f: 0, d: 120 }, { f: 440, d: 320 }, { f: 392, d: 640 }, { f: 330, d: 640 },
    { f: 0, d: 160 }, { f: 349, d: 300 }, { f: 392, d: 300 }, { f: 440, d: 480 }, { f: 523, d: 480 }, { f: 440, d: 300 }, { f: 392, d: 600 }, { f: 349, d: 600 },
    { f: 0, d: 180 }, { f: 392, d: 280 }, { f: 440, d: 280 }, { f: 523, d: 520 }, { f: 659, d: 520 }, { f: 523, d: 280 }, { f: 440, d: 560 }, { f: 392, d: 560 },
    { f: 0, d: 200 }, { f: 262, d: 400 }, { f: 330, d: 400 }, { f: 392, d: 560 }, { f: 523, d: 560 }, { f: 392, d: 400 }, { f: 330, d: 800 },
    { f: 0, d: 220 }, { f: 440, d: 360 }, { f: 523, d: 360 }, { f: 587, d: 540 }, { f: 659, d: 540 }, { f: 523, d: 360 }, { f: 440, d: 720 },
    { f: 0, d: 240 }, { f: 330, d: 360 }, { f: 392, d: 360 }, { f: 440, d: 600 }, { f: 392, d: 600 }, { f: 330, d: 800 },
  ], bass: [98, 131, 98, 131, 110, 131, 98, 131, 98, 110, 98, 110, 131, 98, 131, 98], bassMs: 680 },
  { name: 'Lv3', melody: [
    { f: 392, d: 360 }, { f: 440, d: 360 }, { f: 523, d: 540 }, { f: 659, d: 540 }, { f: 523, d: 360 }, { f: 440, d: 700 },
    { f: 0, d: 140 }, { f: 523, d: 320 }, { f: 587, d: 320 }, { f: 659, d: 500 }, { f: 784, d: 500 }, { f: 659, d: 320 }, { f: 587, d: 640 }, { f: 523, d: 640 },
    { f: 0, d: 160 }, { f: 440, d: 300 }, { f: 523, d: 300 }, { f: 587, d: 480 }, { f: 659, d: 480 }, { f: 587, d: 300 }, { f: 523, d: 600 }, { f: 440, d: 600 },
    { f: 0, d: 180 }, { f: 330, d: 380 }, { f: 392, d: 380 }, { f: 440, d: 560 }, { f: 523, d: 560 }, { f: 440, d: 380 }, { f: 392, d: 760 },
    { f: 0, d: 200 }, { f: 262, d: 400 }, { f: 330, d: 400 }, { f: 392, d: 640 }, { f: 392, d: 640 }, { f: 330, d: 800 },
    { f: 0, d: 220 }, { f: 392, d: 340 }, { f: 440, d: 340 }, { f: 523, d: 520 }, { f: 440, d: 520 }, { f: 392, d: 700 },
  ], bass: [131, 131, 98, 98, 131, 98, 131, 98, 110, 110, 98, 131, 131, 98, 98, 110], bassMs: 640 },
  { name: 'Lv4', melody: [
    { f: 262, d: 240 }, { f: 330, d: 240 }, { f: 392, d: 240 }, { f: 523, d: 400 }, { f: 392, d: 240 }, { f: 523, d: 400 }, { f: 0, d: 100 },
    { f: 294, d: 220 }, { f: 349, d: 220 }, { f: 440, d: 380 }, { f: 523, d: 380 }, { f: 440, d: 220 }, { f: 349, d: 480 }, { f: 0, d: 120 },
    { f: 330, d: 220 }, { f: 392, d: 220 }, { f: 523, d: 380 }, { f: 659, d: 380 }, { f: 523, d: 220 }, { f: 392, d: 480 }, { f: 0, d: 120 },
    { f: 392, d: 260 }, { f: 330, d: 260 }, { f: 262, d: 420 }, { f: 262, d: 420 }, { f: 294, d: 260 }, { f: 330, d: 520 }, { f: 0, d: 140 },
    { f: 523, d: 380 }, { f: 440, d: 260 }, { f: 392, d: 380 }, { f: 330, d: 380 }, { f: 262, d: 720 }, { f: 0, d: 160 },
    { f: 440, d: 260 }, { f: 523, d: 260 }, { f: 587, d: 400 }, { f: 523, d: 400 }, { f: 440, d: 560 }, { f: 0, d: 180 },
  ], bass: [131, 98, 131, 98, 110, 98, 131, 98, 131, 110, 98, 110, 131, 98, 131, 98], bassMs: 560 },
  { name: 'Lv5', melody: [
    { f: 523, d: 340 }, { f: 440, d: 340 }, { f: 392, d: 520 }, { f: 330, d: 520 }, { f: 392, d: 340 }, { f: 330, d: 680 },
    { f: 0, d: 140 }, { f: 440, d: 300 }, { f: 392, d: 300 }, { f: 330, d: 480 }, { f: 262, d: 480 }, { f: 330, d: 300 }, { f: 262, d: 620 }, { f: 294, d: 620 },
    { f: 0, d: 160 }, { f: 392, d: 280 }, { f: 330, d: 280 }, { f: 262, d: 460 }, { f: 262, d: 460 }, { f: 330, d: 280 }, { f: 392, d: 560 }, { f: 330, d: 560 },
    { f: 0, d: 180 }, { f: 659, d: 360 }, { f: 523, d: 360 }, { f: 440, d: 540 }, { f: 392, d: 540 }, { f: 440, d: 360 }, { f: 523, d: 720 },
    { f: 0, d: 200 }, { f: 392, d: 320 }, { f: 330, d: 320 }, { f: 262, d: 640 }, { f: 262, d: 640 }, { f: 330, d: 800 },
    { f: 0, d: 220 }, { f: 330, d: 320 }, { f: 392, d: 320 }, { f: 440, d: 500 }, { f: 392, d: 500 }, { f: 330, d: 760 },
  ], bass: [98, 131, 98, 131, 98, 110, 131, 110, 98, 131, 98, 98, 110, 131, 110, 98], bassMs: 600 },
];
let bgmSchedHandle = null;
let bgmPaused = false;
let bgmGainNode = null;

function scheduleBGMNote(ctx, startTime, freq, durationSec, volume, waveType, attack = 0.012, dest) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(dest != null ? dest : ctx.destination);
  osc.type = waveType;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);
  osc.start(startTime);
  osc.stop(startTime + durationSec);
}

function getBGMTrackIndex() {
  return (Math.max(1, level) - 1) % BGM_TRACKS.length;
}

function getTrackLoopMs(trackIndex) {
  return BGM_TRACKS[trackIndex].melody.reduce((s, n) => s + n.d, 0);
}

function scheduleBGMLoop(ctx, startTime, trackIndex) {
  if (!bgmGainNode) return;
  const track = BGM_TRACKS[trackIndex];
  const loopMs = getTrackLoopMs(trackIndex);
  let tMel = 0;
  track.melody.forEach(({ f, d }) => {
    if (f > 0) scheduleBGMNote(ctx, startTime + tMel / 1000, f, d / 1000 * 0.78, 0.058, 'triangle', 0.01, bgmGainNode);
    tMel += d;
  });
  let tBass = 0;
  while (tBass < loopMs) {
    const freq = track.bass[Math.floor(tBass / track.bassMs) % track.bass.length];
    scheduleBGMNote(ctx, startTime + tBass / 1000, freq, track.bassMs / 1000 * 0.85, 0.035, 'sine', 0.008, bgmGainNode);
    tBass += track.bassMs;
  }
}

function bgmScheduler() {
  if (bgmPaused) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const trackIndex = getBGMTrackIndex();
    const loopMs = getTrackLoopMs(trackIndex);
    scheduleBGMLoop(ctx, ctx.currentTime, trackIndex);
    bgmSchedHandle = setTimeout(bgmScheduler, loopMs);
  } catch (_) {}
}

const bgm = {
  start() {
    this.stop();
    bgmPaused = false;
    const ctx = getAudioContext();
    if (!bgmGainNode) {
      bgmGainNode = ctx.createGain();
      bgmGainNode.connect(ctx.destination);
    }
    bgmGainNode.gain.setValueAtTime(1, ctx.currentTime);
    bgmScheduler();
  },
  stop() {
    if (bgmSchedHandle) clearTimeout(bgmSchedHandle);
    bgmSchedHandle = null;
    if (bgmGainNode) {
      try {
        const ctx = getAudioContext();
        bgmGainNode.gain.setValueAtTime(0, ctx.currentTime);
      } catch (_) {}
    }
  },
  setPaused(p) {
    bgmPaused = p;
  },
};

// 遊戲結束時播放約 2.5 秒的結束短曲（停止 BGM 後播放）
const GAME_OVER_JINGLE = [
  { f: 523, d: 380 }, { f: 440, d: 320 }, { f: 392, d: 320 }, { f: 330, d: 400 }, { f: 262, d: 1100 },
];

function playGameOverJingle() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const start = ctx.currentTime;
    let t = 0;
    GAME_OVER_JINGLE.forEach(({ f, d }) => {
      scheduleBGMNote(ctx, start + t / 1000, f, d / 1000 * 0.9, 0.07, 'sine', 0.03);
      t += d;
    });
  } catch (_) {}
}

let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let paused = false;
let gameStarted = false;
let dropInterval = 1000;
let lastDrop = 0;
let animationId = null;
let ghostEnabled = false;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const rotations = SHAPE_ROTATIONS[type];
  return {
    type,
    matrix: rotations[0].map(row => [...row]),
    rotations,
    rotationIndex: 0,
    x: Math.floor((COLS - rotations[0][0].length) / 2),
    y: 0,
  };
}

function rotateMatrix(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const rotated = [];
  for (let c = 0; c < cols; c++) {
    const newRow = [];
    for (let r = rows - 1; r >= 0; r--) {
      newRow.push(matrix[r][c]);
    }
    rotated.push(newRow);
  }
  return rotated;
}

function rotatePiece() {
  if (!currentPiece || gameOver || paused) return;
  const rot = currentPiece.rotations;
  const nextIndex = (currentPiece.rotationIndex + 1) % rot.length;
  const nextMatrix = rot[nextIndex];
  const prevMatrix = currentPiece.matrix;
  currentPiece.matrix = nextMatrix.map(row => [...row]);
  currentPiece.rotationIndex = nextIndex;
  if (collision()) {
    currentPiece.matrix = prevMatrix;
    currentPiece.rotationIndex = (currentPiece.rotationIndex - 1 + rot.length) % rot.length;
  }
}

function collision() {
  if (!currentPiece) return true;
  const { matrix, x, y } = currentPiece;
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (!matrix[row][col]) continue;
      const newX = x + col;
      const newY = y + row;
      if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
      if (newY >= 0 && board[newY][newX]) return true;
    }
  }
  return false;
}

function mergePiece() {
  if (!currentPiece) return;
  const { matrix, x, y } = currentPiece;
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (matrix[row][col]) {
        const boardY = y + row;
        const boardX = x + col;
        if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
          board[boardY][boardX] = matrix[row][col];
        }
      }
    }
  }
}

function clearLines() {
  let cleared = 0;
  let newBoard = board.filter(row => {
    const full = row.every(cell => cell !== 0);
    if (full) cleared++;
    return !full;
  });
  while (newBoard.length < ROWS) {
    newBoard.unshift(Array(COLS).fill(0));
  }
  board = newBoard;
  if (cleared > 0) {
    lines += cleared;
    sound.clearLines(cleared);
    // 計分: 1行100, 2行300, 3行500, 4行800，乘等級
    const points = [0, 100, 300, 500, 800][cleared] * level;
    score += points;
    updateLevel();
  }
}

function updateLevel() {
  level = Math.floor(lines / 10) + 1;
  dropInterval = Math.max(100, 1000 - (level - 1) * 80);
}

function spawnPiece() {
  currentPiece = nextPiece || randomPiece();
  nextPiece = randomPiece();
  if (collision()) {
    gameOver = true;
    bgm.stop();
    playGameOverJingle();
    showOverlay('遊戲結束');
  }
  drawNext();
}

function drawBlock(ctx, x, y, color, size = BLOCK_SIZE) {
  if (!color) return;
  const padding = 1;
  ctx.fillStyle = color;
  ctx.fillRect(x * size + padding, y * size + padding, size - padding * 2, size - padding * 2);
  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x * size + padding, y * size + padding, size - padding * 2, 2);
  ctx.fillRect(x * size + padding, y * size + padding, 2, size - padding * 2);
}

function getGhostY() {
  if (!currentPiece || gameOver) return null;
  const origY = currentPiece.y;
  let y = origY;
  for (;;) {
    currentPiece.y = y + 1;
    if (collision()) {
      currentPiece.y = origY;
      return y;
    }
    y = currentPiece.y;
  }
}

function drawGhost() {
  if (!currentPiece || gameOver) return;
  const ghostY = getGhostY();
  if (ghostY === null || ghostY === currentPiece.y) return;
  const { matrix, x } = currentPiece;
  const padding = 1;
  const baseX = x * BLOCK_SIZE;
  const baseY = ghostY * BLOCK_SIZE;
  const rows = matrix.length;
  const cols = matrix[0].length;
  const cell = (r, c) => (r >= 0 && r < rows && c >= 0 && c < cols && matrix[r][c]);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!matrix[row][col]) continue;
      const color = COLORS[matrix[row][col]];
      const hex = color.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const left = baseX + col * BLOCK_SIZE + padding;
      const top = baseY + row * BLOCK_SIZE + padding;
      const right = baseX + (col + 1) * BLOCK_SIZE - padding;
      const bottom = baseY + (row + 1) * BLOCK_SIZE - padding;
      ctx.fillStyle = `rgba(${r},${g},${b},0.28)`;
      ctx.fillRect(left, top, right - left, bottom - top);
    }
  }
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!matrix[row][col]) continue;
      const left = baseX + col * BLOCK_SIZE + padding;
      const top = baseY + row * BLOCK_SIZE + padding;
      const right = baseX + (col + 1) * BLOCK_SIZE - padding;
      const bottom = baseY + (row + 1) * BLOCK_SIZE - padding;
      if (!cell(row - 1, col)) { ctx.moveTo(left, top); ctx.lineTo(right, top); }
      if (!cell(row, col + 1)) { ctx.moveTo(right, top); ctx.lineTo(right, bottom); }
      if (!cell(row + 1, col)) { ctx.moveTo(right, bottom); ctx.lineTo(left, bottom); }
      if (!cell(row, col - 1)) { ctx.moveTo(left, bottom); ctx.lineTo(left, top); }
    }
  }
  ctx.stroke();
}

function drawBoard() {
  ctx.fillStyle = '#0a0a0e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // 網格
  ctx.strokeStyle = 'rgba(0, 255, 200, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * BLOCK_SIZE, 0);
    ctx.lineTo(i * BLOCK_SIZE, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i <= ROWS; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * BLOCK_SIZE);
    ctx.lineTo(canvas.width, i * BLOCK_SIZE);
    ctx.stroke();
  }
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = board[row][col];
      if (cell) drawBlock(ctx, col, row, COLORS[cell]);
    }
  }
}

function drawPiece() {
  if (!currentPiece || gameOver) return;
  const { matrix, x, y } = currentPiece;
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (matrix[row][col]) {
        drawBlock(ctx, x + col, y + row, COLORS[matrix[row][col]]);
      }
    }
  }
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextCtx.fillStyle = 'rgba(10, 10, 14, 1)';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!nextPiece) return;
  const size = 25;
  const offsetX = (nextCanvas.width - nextPiece.matrix[0].length * size) / 2 / size;
  const offsetY = (nextCanvas.height - nextPiece.matrix.length * size) / 2 / size;
  for (let row = 0; row < nextPiece.matrix.length; row++) {
    for (let col = 0; col < nextPiece.matrix[row].length; col++) {
      if (nextPiece.matrix[row][col]) {
        drawBlock(nextCtx, offsetX + col, offsetY + row, COLORS[nextPiece.matrix[row][col]], size);
      }
    }
  }
}

function updateUI() {
  document.getElementById('score').textContent = score;
  document.getElementById('level').textContent = level;
  document.getElementById('lines').textContent = lines;
  const themeLevel = ((Math.max(1, level) - 1) % 6) + 1;
  document.body.setAttribute('data-level', String(themeLevel));
}

function draw(timestamp = 0) {
  drawBoard();
  if (ghostEnabled) drawGhost();
  drawPiece();
  updateUI();
  if (!gameOver && gameStarted && !paused && timestamp - lastDrop > dropInterval) {
    moveDown();
    lastDrop = timestamp;
  }
  animationId = requestAnimationFrame(draw);
}

function moveLeft() {
  if (!currentPiece || gameOver || paused) return;
  currentPiece.x--;
  if (collision()) currentPiece.x++;
}

function moveRight() {
  if (!currentPiece || gameOver || paused) return;
  currentPiece.x++;
  if (collision()) currentPiece.x--;
}

function moveDown() {
  if (!currentPiece || gameOver || paused) return;
  currentPiece.y++;
  if (collision()) {
    currentPiece.y--;
    mergePiece();
    clearLines();
    spawnPiece();
  }
  lastDrop = performance.now();
}

function hardDrop() {
  if (!currentPiece || gameOver || paused) return;
  while (!collision()) currentPiece.y++;
  currentPiece.y--;
  mergePiece();
  score += (currentPiece.y + currentPiece.matrix.length) * 2;
  clearLines();
  spawnPiece();
  lastDrop = performance.now();
}

function showOverlay(message) {
  const overlay = document.getElementById('overlay');
  overlay.querySelector('#overlayMessage').textContent = message;
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}

function startGame() {
  board = createBoard();
  score = 0;
  level = 1;
  lines = 0;
  gameOver = false;
  paused = false;
  gameStarted = true;
  dropInterval = 1000;
  lastDrop = performance.now();
  nextPiece = null;
  document.getElementById('startOverlay').classList.add('hidden');
  hideOverlay();
  const pauseBtn = document.getElementById('touchPause');
  if (pauseBtn) pauseBtn.textContent = '暫停';
  bgm.start();
  spawnPiece();
  if (!animationId) draw();
}

function restartGame() {
  document.getElementById('overlay').classList.add('hidden');
  startGame();
}

function togglePause() {
  if (!gameStarted || gameOver) return;
  paused = !paused;
  bgm.setPaused(paused);
}

document.getElementById('startBtn').addEventListener('click', () => {
  startGame();
});

document.getElementById('restartBtn').addEventListener('click', restartGame);

// 觸控按鈕（手機用）
function bindTouchBtn(id, action) {
  const btn = document.getElementById(id);
  if (!btn) return;
  const run = (e) => {
    e.preventDefault();
    action();
  };
  btn.addEventListener('click', run);
  btn.addEventListener('touchend', run, { passive: false });
}
bindTouchBtn('touchLeft', moveLeft);
bindTouchBtn('touchRight', moveRight);
bindTouchBtn('touchRotate', rotatePiece);
bindTouchBtn('touchDown', moveDown);
bindTouchBtn('touchDrop', hardDrop);
bindTouchBtn('touchPause', () => {
  togglePause();
  const btn = document.getElementById('touchPause');
  if (btn) btn.textContent = paused ? '繼續' : '暫停';
});

document.addEventListener('keydown', (e) => {
  if (!gameStarted) {
    if (e.code === 'Space') {
      e.preventDefault();
      startGame();
    }
    return;
  }
  if (gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      e.preventDefault();
      moveLeft();
      break;
    case 'ArrowRight':
      e.preventDefault();
      moveRight();
      break;
    case 'ArrowDown':
      e.preventDefault();
      moveDown();
      break;
    case 'ArrowUp':
      e.preventDefault();
      rotatePiece();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    case 'KeyP':
      e.preventDefault();
      togglePause();
      break;
    case 'KeyG':
      e.preventDefault();
      ghostEnabled = !ghostEnabled;
      const ghostCb = document.getElementById('ghostToggle');
      if (ghostCb) ghostCb.checked = ghostEnabled;
      try { localStorage.setItem('tetris-ghost', ghostEnabled ? '1' : '0'); } catch (_) {}
      break;
  }
});

// Ghost 開關（預設關閉，可從 localStorage 讀取上次選擇）
(function initGhost() {
  try {
    const saved = localStorage.getItem('tetris-ghost');
    if (saved !== null) ghostEnabled = saved === '1';
  } catch (_) {}
  const cb = document.getElementById('ghostToggle');
  if (cb) {
    cb.checked = ghostEnabled;
    cb.addEventListener('change', () => {
      ghostEnabled = cb.checked;
      try { localStorage.setItem('tetris-ghost', ghostEnabled ? '1' : '0'); } catch (_) {}
    });
  }
})();

// 初始化
board = createBoard();
nextPiece = randomPiece();
drawNext();
updateUI();
draw();
