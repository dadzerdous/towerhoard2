"use strict";

const canvas = document.querySelector("#view");
const ctx = canvas.getContext("2d");
const game = document.querySelector("#game");
const signalLine = document.querySelector("#signalLine");
const distanceReadout = document.querySelector("#distanceReadout");
const facingReadout = document.querySelector("#facingReadout");
const message = document.querySelector("#message");
const startScreen = document.querySelector("#startScreen");
const winScreen = document.querySelector("#winScreen");
const stepResult = document.querySelector("#stepResult");

const GRID_SIZE = 12;
const MIN_TOWER_DISTANCE = 8;
const MAX_VIEW_DISTANCE = 12;
const FOV = Math.PI * 0.42;
const directions = [
  { name: "N", x: 0, y: -1 },
  { name: "E", x: 1, y: 0 },
  { name: "S", x: 0, y: 1 },
  { name: "W", x: -1, y: 0 }
];

let player;
let tower;
let steps = 0;
let playing = false;
let flash = 0;
let touchStart = null;

function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * ratio);
  canvas.height = Math.floor(innerHeight * ratio);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function wrappedAxisDelta(from, to) {
  let delta = to - from;
  if (Math.abs(delta) > GRID_SIZE / 2) delta -= Math.sign(delta) * GRID_SIZE;
  return delta;
}

function towerVector() {
  return {
    x: wrappedAxisDelta(player.x, tower.x),
    y: wrappedAxisDelta(player.y, tower.y)
  };
}

function gridDistance() {
  const v = towerVector();
  return Math.abs(v.x) + Math.abs(v.y);
}

function spawnLevel() {
  player = {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
    facing: Math.floor(Math.random() * 4)
  };

  const candidates = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const dx = Math.abs(wrappedAxisDelta(player.x, x));
      const dy = Math.abs(wrappedAxisDelta(player.y, y));
      if (dx + dy >= MIN_TOWER_DISTANCE) candidates.push({ x, y });
    }
  }

  tower = candidates[Math.floor(Math.random() * candidates.length)];

  // Keep the tower outside the player's opening view.
  for (let attempts = 0; attempts < 20 && towerVisibility().visible; attempts++) {
    tower = candidates[Math.floor(Math.random() * candidates.length)];
  }

  steps = 0;
  flash = 1;
  message.textContent = "FIND THE TOWER";
  winScreen.classList.add("hidden");
  updateHud();
}

function towerVisibility() {
  const v = towerVector();
  const distance = Math.hypot(v.x, v.y);
  const facing = directions[player.facing];
  const facingAngle = Math.atan2(facing.x, -facing.y);
  const towerAngle = Math.atan2(v.x, -v.y);
  let angle = towerAngle - facingAngle;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return { visible: Math.abs(angle) < FOV / 2 && distance > 0, distance, angle };
}

function updateHud() {
  const distance = gridDistance();
  const closeness = 1 - Math.min(distance / 12, 1);
  distanceReadout.textContent = `SIGNAL: ${Math.round(closeness * 100).toString().padStart(2, "0")}%`;
  facingReadout.textContent = directions[player.facing].name;
  signalLine.style.width = `${8 + closeness * 72}%`;
  signalLine.style.opacity = `${0.16 + closeness * 0.82}`;
  signalLine.style.boxShadow = `0 0 ${7 + closeness * 18}px #75ffd0, 0 0 ${16 + closeness * 30}px #27bb8c`;
}

function moveForward() {
  if (!playing) return;
  const d = directions[player.facing];
  player.x = (player.x + d.x + GRID_SIZE) % GRID_SIZE;
  player.y = (player.y + d.y + GRID_SIZE) % GRID_SIZE;
  steps++;
  flash = .45;
  updateHud();
  if (player.x === tower.x && player.y === tower.y) win();
}

function turn(amount) {
  if (!playing) return;
  player.facing = (player.facing + amount + 4) % 4;
  steps++;
  flash = .22;
  updateHud();
}

function win() {
  playing = false;
  stepResult.textContent = `You reached the tower in ${steps} moves.`;
  winScreen.classList.remove("hidden");
}

function drawNoise(width, height) {
  ctx.save();
  ctx.globalAlpha = .07;
  for (let i = 0; i < 70; i++) {
    const shade = 35 + Math.random() * 45;
    ctx.fillStyle = `rgb(${shade * .65},${shade},${shade * .82})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, Math.random() * 2 + .5, Math.random() * 2 + .5);
  }
  ctx.restore();
}

function drawTower(width, height, info) {
  if (!info.visible || info.distance > MAX_VIEW_DISTANCE) return;

  const scopeRadius = Math.min(width, height) * .29;
  const centerX = width / 2;
  const centerY = height * .47;
  const horizontal = info.angle / (FOV / 2);
  const x = centerX + horizontal * scopeRadius * .78;
  const proximity = 1 - Math.min(info.distance / MAX_VIEW_DISTANCE, .94);
  const towerHeight = scopeRadius * (.13 + proximity * 1.32);
  const towerWidth = towerHeight * .24;
  const groundY = centerY + scopeRadius * .42;
  const alpha = .18 + proximity * .8;

  ctx.save();
  ctx.translate(x, groundY);
  ctx.globalAlpha = alpha;
  ctx.shadowColor = "#8fffd9";
  ctx.shadowBlur = 4 + proximity * 15;

  const gradient = ctx.createLinearGradient(0, -towerHeight, 0, 0);
  gradient.addColorStop(0, "#b8d2ca");
  gradient.addColorStop(.55, "#405951");
  gradient.addColorStop(1, "#17211e");
  ctx.fillStyle = gradient;

  ctx.beginPath();
  ctx.moveTo(-towerWidth * .65, 0);
  ctx.lineTo(-towerWidth * .43, -towerHeight * .78);
  ctx.lineTo(-towerWidth * .7, -towerHeight * .8);
  ctx.lineTo(-towerWidth * .52, -towerHeight);
  ctx.lineTo(0, -towerHeight * 1.08);
  ctx.lineTo(towerWidth * .52, -towerHeight);
  ctx.lineTo(towerWidth * .7, -towerHeight * .8);
  ctx.lineTo(towerWidth * .43, -towerHeight * .78);
  ctx.lineTo(towerWidth * .65, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = `rgba(158,255,219,${.3 + proximity * .7})`;
  const slitWidth = Math.max(1, towerWidth * .12);
  for (const level of [.25, .46, .68]) {
    ctx.fillRect(-slitWidth / 2, -towerHeight * level, slitWidth, Math.max(1, towerHeight * .035));
  }

  ctx.restore();
}

function render() {
  const width = innerWidth;
  const height = innerHeight;
  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createRadialGradient(width / 2, height * .47, 0, width / 2, height * .47, Math.min(width, height) * .32);
  bg.addColorStop(0, "#101b18");
  bg.addColorStop(.62, "#070c0b");
  bg.addColorStop(1, "#000");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const scopeRadius = Math.min(width, height) * .29;
  const cx = width / 2;
  const cy = height * .47;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, scopeRadius, 0, Math.PI * 2);
  ctx.clip();

  const ground = ctx.createLinearGradient(0, cy, 0, cy + scopeRadius);
  ground.addColorStop(0, "rgba(18,30,26,.12)");
  ground.addColorStop(1, "rgba(35,58,49,.42)");
  ctx.fillStyle = ground;
  ctx.fillRect(cx - scopeRadius, cy, scopeRadius * 2, scopeRadius);

  ctx.strokeStyle = "rgba(130,190,169,.055)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 7; i++) {
    const y = cy + scopeRadius * (1 - 1 / (i * .62 + 1));
    ctx.beginPath();
    ctx.moveTo(cx - scopeRadius, y);
    ctx.lineTo(cx + scopeRadius, y);
    ctx.stroke();
  }

  drawTower(width, height, towerVisibility());
  drawNoise(width, height);

  if (flash > 0) {
    ctx.fillStyle = `rgba(170,255,224,${flash * .07})`;
    ctx.fillRect(0, 0, width, height);
    flash *= .88;
  }
  ctx.restore();

  requestAnimationFrame(render);
}

function start() {
  spawnLevel();
  startScreen.classList.add("hidden");
  playing = true;
}

document.querySelector("#startButton").addEventListener("click", start);
document.querySelector("#nextButton").addEventListener("click", start);
document.querySelector("#moveForward").addEventListener("click", moveForward);
document.querySelector("#turnLeft").addEventListener("click", () => turn(-1));
document.querySelector("#turnRight").addEventListener("click", () => turn(1));
document.querySelector("#turnBack").addEventListener("click", () => turn(2));

addEventListener("keydown", event => {
  if (["ArrowUp", "w", "W"].includes(event.key)) moveForward();
  if (["ArrowLeft", "a", "A"].includes(event.key)) turn(-1);
  if (["ArrowRight", "d", "D"].includes(event.key)) turn(1);
  if (["ArrowDown", "s", "S"].includes(event.key)) turn(2);
});

game.addEventListener("pointerdown", event => {
  if (event.target.closest("button")) return;
  touchStart = { x: event.clientX, y: event.clientY };
});

game.addEventListener("pointerup", event => {
  if (!touchStart || event.target.closest("button")) return;
  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  touchStart = null;
  if (Math.hypot(dx, dy) < 28) return;
  if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1);
  else if (dy < 0) moveForward();
  else turn(2);
});

addEventListener("resize", resize);
resize();
spawnLevel();
render();
