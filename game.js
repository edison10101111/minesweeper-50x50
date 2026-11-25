const ROWS = 50;
const COLS = 50;
const MINE_COUNT = 375;

const boardEl = document.getElementById("board");
const mineCountEl = document.getElementById("mine-count");
const timerEl = document.getElementById("timer");
const newGameBtn = document.getElementById("new-game");
const overlay = document.getElementById("overlay");
const overlayMsg = document.getElementById("overlay-msg");
const overlayRestart = document.getElementById("overlay-restart");

let grid = [];
let mines = new Set();
let flags = new Set();
let revealed = new Set();
let firstClick = true;
let gameOver = false;
let won = false;
let timerId = null;
let seconds = 0;

function key(r, c) {
  return `${r},${c}`;
}

function neighbors(r, c) {
  const list = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) list.push([nr, nc]);
    }
  }
  return list;
}

function placeMines(safeR, safeC) {
  mines.clear();
  const forbidden = new Set([key(safeR, safeC)]);
  for (const [nr, nc] of neighbors(safeR, safeC)) {
    forbidden.add(key(nr, nc));
  }
  const slots = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!forbidden.has(key(r, c))) slots.push([r, c]);
    }
  }
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const count = Math.min(MINE_COUNT, slots.length);
  for (let i = 0; i < count; i++) {
    const [r, c] = slots[i];
    mines.add(key(r, c));
  }
}

function countAdjacent(r, c) {
  let n = 0;
  for (const [nr, nc] of neighbors(r, c)) {
    if (mines.has(key(nr, nc))) n++;
  }
  return n;
}

function updateMineDisplay() {
  const flagged = flags.size;
  mineCountEl.textContent = String(Math.max(0, MINE_COUNT - flagged)).padStart(3, "0");
}

function startTimer() {
  if (timerId) return;
  timerId = setInterval(() => {
    seconds++;
    timerEl.textContent = String(Math.min(999, seconds)).padStart(3, "0");
  }, 1000);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function showEnd(message, isWin) {
  gameOver = true;
  won = isWin;
  stopTimer();
  newGameBtn.textContent = isWin ? "😎" : "😵";
  overlayMsg.textContent = message;
  overlay.classList.remove("hidden");
  if (!isWin) {
    for (const k of mines) {
      const [r, c] = k.split(",").map(Number);
      const cell = grid[r][c];
      cell.classList.add("revealed", "mine");
      if (flags.has(k)) cell.classList.remove("flagged");
    }
  }
}

function checkWin() {
  const safeCells = ROWS * COLS - mines.size;
  if (revealed.size === safeCells) {
    showEnd("恭喜過關！", true);
  }
}

function revealCell(r, c) {
  const k = key(r, c);
  if (gameOver || flags.has(k) || revealed.has(k)) return;

  if (firstClick) {
    firstClick = false;
    placeMines(r, c);
    startTimer();
  }

  if (mines.has(k)) {
    const cell = grid[r][c];
    cell.classList.add("revealed", "mine");
    revealed.add(k);
    showEnd("踩到地雷了！", false);
    return;
  }

  const stack = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop();
    const ck = key(cr, cc);
    if (revealed.has(ck) || flags.has(ck)) continue;
    revealed.add(ck);
    const cell = grid[cr][cc];
    cell.classList.add("revealed");
    cell.disabled = true;

    const n = countAdjacent(cr, cc);
    if (n > 0) {
      cell.textContent = n;
      cell.classList.add(`n${n}`);
    } else {
      for (const [nr, nc] of neighbors(cr, cc)) {
        const nk = key(nr, nc);
        if (!revealed.has(nk) && !mines.has(nk)) stack.push([nr, nc]);
      }
    }
  }
  checkWin();
}

function chord(r, c) {
  const k = key(r, c);
  if (!revealed.has(k) || gameOver) return;
  const cell = grid[r][c];
  const num = parseInt(cell.textContent, 10);
  if (!num) return;

  let adjFlags = 0;
  const hidden = [];
  for (const [nr, nc] of neighbors(r, c)) {
    const nk = key(nr, nc);
    if (flags.has(nk)) adjFlags++;
    else if (!revealed.has(nk)) hidden.push([nr, nc]);
  }
  if (adjFlags !== num) return;

  for (const [nr, nc] of hidden) {
    revealCell(nr, nc);
    if (gameOver) break;
  }
}

function toggleFlag(r, c) {
  const k = key(r, c);
  if (gameOver || revealed.has(k)) return;
  if (flags.has(k)) {
    flags.delete(k);
    grid[r][c].classList.remove("flagged");
  } else {
    flags.add(k);
    grid[r][c].classList.add("flagged");
  }
  updateMineDisplay();
}

function buildBoard() {
  boardEl.innerHTML = "";
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cell";
      btn.setAttribute("role", "gridcell");
      btn.dataset.r = r;
      btn.dataset.c = c;

      btn.addEventListener("click", (e) => {
        if (e.button !== 0) return;
        revealCell(r, c);
      });

      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        toggleFlag(r, c);
      });

      btn.addEventListener("auxclick", (e) => {
        if (e.button === 1) {
          e.preventDefault();
          chord(r, c);
        }
      });

      btn.addEventListener("dblclick", (e) => {
        e.preventDefault();
        chord(r, c);
      });

      row.push(btn);
      boardEl.appendChild(btn);
    }
    grid.push(row);
  }
}

function resetGame() {
  mines.clear();
  flags.clear();
  revealed.clear();
  firstClick = true;
  gameOver = false;
  won = false;
  seconds = 0;
  stopTimer();
  timerEl.textContent = "000";
  newGameBtn.textContent = "🙂";
  overlay.classList.add("hidden");
  updateMineDisplay();
  buildBoard();
}

newGameBtn.addEventListener("click", resetGame);
overlayRestart.addEventListener("click", resetGame);

resetGame();