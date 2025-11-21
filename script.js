import { animate, stagger } from "https://cdn.jsdelivr.net/npm/motion@11.11.17/+esm";

const ROWS = 20;
const COLS = 40;

const gridEl = document.getElementById("grid");
const algoSelect = document.getElementById("algorithm");
const runBtn = document.getElementById("run");
const resetBtn = document.getElementById("reset");
const clearVisitedBtn = document.getElementById("clearVisited");
const randomizeBtn = document.getElementById("randomize");
const speedInput = document.getElementById("speed");
const speedValue = document.getElementById("speedValue");
const algoDetails = document.getElementById("algoDetails");

const algoDescriptions = {
  astar:
    "A* prioritizes nodes with the lowest f = g + h, where g is path cost so far and h is a Manhattan estimate to the goal. With this admissible heuristic on a 4-way grid, it returns an optimal path while typically expanding fewer nodes than Dijkstra.",
  dijkstra:
    "Dijkstra explores nodes in increasing cumulative cost using a priority queue. With non-negative edge weights it is optimal but often expands more nodes than A* because it lacks a heuristic guide.",
  bfs:
    "Breadth-First Search expands layer by layer using a queue. On an unweighted grid every move costs 1, so the first time it reaches the goal you have the shortest path by hop count.",
  dfs:
    "Depth-First Search dives down a branch via a stack before backtracking. It is fast to implement and highlights exploration order differences, but it is not guaranteed to find the shortest path."
};

let grid = [];
let start = { row: 10, col: 6 };
let goal = { row: 10, col: 32 };
let isRunning = false;

function createNode(row, col) {
  return {
    row,
    col,
    isWall: false,
    isStart: false,
    isGoal: false,
    state: "", // "", "visited", "frontier", "path"
    el: null
  };
}

function buildGrid() {
  gridEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  grid = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => createNode(r, c))
  );

  gridEl.innerHTML = "";
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const node = grid[r][c];
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      node.el = cell;
      gridEl.appendChild(cell);
    }
  }

  setStart(start.row, start.col);
  setGoal(goal.row, goal.col);

  animateCellsIntro();
}

function resetGrid() {
  for (const row of grid) {
    for (const node of row) {
      node.isWall = false;
      node.state = "";
    }
  }
  setStart(10, 6);
  setGoal(10, 32);
  renderGrid();
}

function clearVisited() {
  for (const row of grid) {
    for (const node of row) {
      if (!node.isWall && !node.isStart && !node.isGoal) {
        node.state = "";
      } else if (node.isStart || node.isGoal) {
        node.state = "";
      }
    }
  }
  renderGrid();
}

function renderNode(node) {
  const classes = ["cell"];
  if (node.isWall) classes.push("wall");
  if (node.isStart) classes.push("start");
  if (node.isGoal) classes.push("goal");
  if (node.state) classes.push(node.state);
  node.el.className = classes.join(" ");
}

function renderGrid() {
  for (const row of grid) {
    for (const node of row) {
      renderNode(node);
    }
  }
}

function setStart(r, c) {
  if (!inBounds(r, c)) return;
  grid[start.row][start.col].isStart = false;
  grid[start.row][start.col].state = "";
  start = { row: r, col: c };
  const node = grid[r][c];
  node.isWall = false;
  node.isStart = true;
  node.state = "";
  renderGrid();
}

function setGoal(r, c) {
  if (!inBounds(r, c)) return;
  grid[goal.row][goal.col].isGoal = false;
  grid[goal.row][goal.col].state = "";
  goal = { row: r, col: c };
  const node = grid[r][c];
  node.isWall = false;
  node.isGoal = true;
  node.state = "";
  renderGrid();
}

function inBounds(r, c) {
  return r >= 0 && c >= 0 && r < ROWS && c < COLS;
}

function addWall(r, c) {
  const node = grid[r][c];
  if (node.isStart || node.isGoal) return;
  node.isWall = !node.isWall;
  renderNode(node);
}

function handleCellClick(e) {
  const target = e.target;
  if (!target.classList.contains("cell")) return;
  const r = Number(target.dataset.row);
  const c = Number(target.dataset.col);

  if (e.shiftKey) {
    setStart(r, c);
  } else if (e.altKey || e.metaKey) {
    setGoal(r, c);
  } else {
    addWall(r, c);
  }
}

function neighbors(r, c) {
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];
  const result = [];
  for (const [dr, dc] of offsets) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc) && !grid[nr][nc].isWall) {
      result.push([nr, nc]);
    }
  }
  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setFrontier(r, c) {
  const node = grid[r][c];
  if (node.isStart || node.isGoal) return;
  node.state = "frontier";
  renderNode(node);
}

function setVisited(r, c) {
  const node = grid[r][c];
  if (node.isStart || node.isGoal) return;
  node.state = "visited";
  renderNode(node);
}

function setPath(r, c) {
  const node = grid[r][c];
  if (node.isStart || node.isGoal) return;
  node.state = "path";
  renderNode(node);
}

function cameFromKey(r, c) {
  return `${r},${c}`;
}

function backtrack(cameFrom) {
  let currentKey = cameFromKey(goal.row, goal.col);
  while (cameFrom.has(currentKey)) {
    const prev = cameFrom.get(currentKey);
    const [r, c] = currentKey.split(",").map(Number);
    if (!(r === goal.row && c === goal.col) && !(r === start.row && c === start.col)) {
      setPath(r, c);
    }
    currentKey = prev;
  }
}

async function bfs(visitDelay) {
  const queue = [];
  const visited = new Set();
  const cameFrom = new Map();
  const startKey = cameFromKey(start.row, start.col);
  visited.add(startKey);
  queue.push([start.row, start.col]);

  while (queue.length) {
    const [r, c] = queue.shift();
    setVisited(r, c);
    if (r === goal.row && c === goal.col) break;
    for (const [nr, nc] of neighbors(r, c)) {
      const key = cameFromKey(nr, nc);
      if (visited.has(key)) continue;
      visited.add(key);
      cameFrom.set(key, cameFromKey(r, c));
      setFrontier(nr, nc);
      queue.push([nr, nc]);
    }
    await sleep(visitDelay);
  }
  backtrack(cameFrom);
}

async function dfs(visitDelay) {
  const stack = [];
  const visited = new Set();
  const cameFrom = new Map();
  stack.push([start.row, start.col]);
  visited.add(cameFromKey(start.row, start.col));

  while (stack.length) {
    const [r, c] = stack.pop();
    setVisited(r, c);
    if (r === goal.row && c === goal.col) break;
    for (const [nr, nc] of neighbors(r, c)) {
      const key = cameFromKey(nr, nc);
      if (visited.has(key)) continue;
      visited.add(key);
      cameFrom.set(key, cameFromKey(r, c));
      setFrontier(nr, nc);
      stack.push([nr, nc]);
    }
    await sleep(visitDelay);
  }
  backtrack(cameFrom);
}

class PriorityQueue {
  constructor(compare) {
    this.compare = compare;
    this.data = [];
  }
  push(item) {
    this.data.push(item);
    this.bubbleUp(this.data.length - 1);
  }
  pop() {
    if (this.data.length === 0) return null;
    const top = this.data[0];
    const end = this.data.pop();
    if (this.data.length > 0 && end) {
      this.data[0] = end;
      this.sinkDown(0);
    }
    return top;
  }
  isEmpty() {
    return this.data.length === 0;
  }
  bubbleUp(n) {
    const element = this.data[n];
    while (n > 0) {
      const parentN = Math.floor((n + 1) / 2) - 1;
      const parent = this.data[parentN];
      if (this.compare(element, parent) >= 0) break;
      this.data[parentN] = element;
      this.data[n] = parent;
      n = parentN;
    }
  }
  sinkDown(n) {
    const length = this.data.length;
    const element = this.data[n];
    while (true) {
      const rChild = (n + 1) * 2;
      const lChild = rChild - 1;
      let swapIdx = null;
      if (lChild < length) {
        const left = this.data[lChild];
        if (this.compare(left, element) < 0) swapIdx = lChild;
      }
      if (rChild < length) {
        const right = this.data[rChild];
        if (
          (swapIdx === null && this.compare(right, element) < 0) ||
          (swapIdx !== null && this.compare(right, this.data[swapIdx]) < 0)
        ) {
          swapIdx = rChild;
        }
      }
      if (swapIdx === null) break;
      this.data[n] = this.data[swapIdx];
      this.data[swapIdx] = element;
      n = swapIdx;
    }
  }
}

function manhattan(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

async function dijkstra(visitDelay) {
  const dist = new Map();
  const cameFrom = new Map();
  const startKey = cameFromKey(start.row, start.col);

  const pq = new PriorityQueue((a, b) => a.priority - b.priority);
  pq.push({ key: startKey, row: start.row, col: start.col, priority: 0 });
  dist.set(startKey, 0);

  while (!pq.isEmpty()) {
    const current = pq.pop();
    setVisited(current.row, current.col);
    if (current.row === goal.row && current.col === goal.col) break;

    for (const [nr, nc] of neighbors(current.row, current.col)) {
      const neighborKey = cameFromKey(nr, nc);
      const newDist = dist.get(current.key) + 1;
      const prevDist = dist.get(neighborKey);
      if (prevDist === undefined || newDist < prevDist) {
        dist.set(neighborKey, newDist);
        cameFrom.set(neighborKey, current.key);
        pq.push({ key: neighborKey, row: nr, col: nc, priority: newDist });
        setFrontier(nr, nc);
      }
    }
    await sleep(visitDelay);
  }

  backtrack(cameFrom);
}

async function astar(visitDelay) {
  const gScore = new Map();
  const cameFrom = new Map();
  const startKey = cameFromKey(start.row, start.col);
  gScore.set(startKey, 0);

  const pq = new PriorityQueue((a, b) => a.f - b.f);
  pq.push({
    key: startKey,
    row: start.row,
    col: start.col,
    f: manhattan(start, goal)
  });

  while (!pq.isEmpty()) {
    const current = pq.pop();
    setVisited(current.row, current.col);
    if (current.row === goal.row && current.col === goal.col) break;

    for (const [nr, nc] of neighbors(current.row, current.col)) {
      const neighborKey = cameFromKey(nr, nc);
      const tentativeG = gScore.get(current.key) + 1;
      const neighborG = gScore.get(neighborKey);
      if (neighborG === undefined || tentativeG < neighborG) {
        gScore.set(neighborKey, tentativeG);
        cameFrom.set(neighborKey, current.key);
        const f = tentativeG + manhattan({ row: nr, col: nc }, goal);
        pq.push({ key: neighborKey, row: nr, col: nc, f });
        setFrontier(nr, nc);
      }
    }
    await sleep(visitDelay);
  }

  backtrack(cameFrom);
}

function disableControls(disabled) {
  runBtn.disabled = disabled;
  resetBtn.disabled = disabled;
  clearVisitedBtn.disabled = disabled;
  randomizeBtn.disabled = disabled;
  algoSelect.disabled = disabled;
}

async function run() {
  if (isRunning) return;
  isRunning = true;
  disableControls(true);
  clearVisited();

  const delay = Number(speedInput.value);
  const algo = algoSelect.value;

  switch (algo) {
    case "bfs":
      await bfs(delay);
      break;
    case "dfs":
      await dfs(delay);
      break;
    case "dijkstra":
      await dijkstra(delay);
      break;
    case "astar":
    default:
      await astar(delay);
  }

  isRunning = false;
  disableControls(false);
}

function randomWalls() {
  clearVisited();
  for (const row of grid) {
    for (const node of row) {
      if (node.isStart || node.isGoal) continue;
      node.isWall = Math.random() < 0.26;
    }
  }
  renderGrid();
}

function bindUI() {
  gridEl.addEventListener("click", handleCellClick);
  runBtn.addEventListener("click", run);
  resetBtn.addEventListener("click", resetGrid);
  clearVisitedBtn.addEventListener("click", clearVisited);
  randomizeBtn.addEventListener("click", randomWalls);
  speedInput.addEventListener("input", () => {
    speedValue.textContent = `${speedInput.value} ms`;
  });
  algoSelect.addEventListener("change", updateAlgoDetails);
}

function updateAlgoDetails() {
  const key = algoSelect.value;
  algoDetails.textContent = algoDescriptions[key] || "";
}

function animateIntro() {
  animate(".header", { opacity: [0, 1], y: [-20, 0] }, { duration: 0.5 });
  animate(".controls", { opacity: [0, 1], y: [12, 0] }, { delay: 0.08, duration: 0.4 });
  animate(".legend span", { opacity: [0, 1], y: [6, 0] }, { delay: stagger(0.03, { start: 0.14 }), duration: 0.25 });
}

function animateCellsIntro() {
  const cells = gridEl.querySelectorAll(".cell");
  animate(
    cells,
    { opacity: [0, 1], scale: [0.9, 1] },
    { duration: 0.25, delay: stagger(0.002, { start: 0.12 }) }
  );
}

buildGrid();
bindUI();
renderGrid();
speedValue.textContent = `${speedInput.value} ms`;
updateAlgoDetails();
animateIntro();
