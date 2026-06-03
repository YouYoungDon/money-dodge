const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const scoreEl = document.querySelector("#score");
const bestScoreEl = document.querySelector("#bestScore");
const overlay = document.querySelector("#overlay");
const overlayKicker = document.querySelector("#overlayKicker");
const overlayTitle = document.querySelector("#overlayTitle");
const overlayText = document.querySelector("#overlayText");
const startButton = document.querySelector("#startButton");
const leftButton = document.querySelector("#leftButton");
const rightButton = document.querySelector("#rightButton");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const HIGH_SCORE_KEY = "donpihagi.highScore";

const keys = {
  left: false,
  right: false,
};

let activeDragPointerId = null;

const player = {
  x: WIDTH / 2,
  y: HEIGHT - 76,
  width: 58,
  height: 64,
  speed: 370,
};

const objectTypes = [
  {
    id: "coffee",
    label: "커피",
    color: "#ad7445",
    accent: "#fff0c9",
    size: 44,
    baseSpeed: 168,
    weight: 1,
  },
  {
    id: "delivery",
    label: "배달",
    color: "#ff8b5f",
    accent: "#ffe07d",
    size: 54,
    baseSpeed: 142,
    weight: 0.85,
  },
  {
    id: "bill",
    label: "카드값",
    color: "#6d9cff",
    accent: "#ffffff",
    size: 62,
    baseSpeed: 124,
    weight: 0.72,
  },
];

let state = "ready";
let lastTime = 0;
let elapsed = 0;
let spawnTimer = 0;
let objects = [];
let bestScore = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
let lastRunWasRecord = false;

function formatSeconds(seconds) {
  return `${seconds.toFixed(1)}초`;
}

function clampPlayerX(x) {
  return Math.max(player.width / 2 + 10, Math.min(WIDTH - player.width / 2 - 10, x));
}

function setPlayerX(x) {
  player.x = clampPlayerX(x);
}

function getCanvasPointerX(event) {
  const rect = canvas.getBoundingClientRect();
  return ((event.clientX - rect.left) / rect.width) * WIDTH;
}

function movePlayerToPointer(event) {
  setPlayerX(getCanvasPointerX(event));
}

function updateScoreUi() {
  scoreEl.textContent = formatSeconds(elapsed);
  bestScoreEl.textContent = formatSeconds(bestScore);
}

function showOverlay(mode) {
  overlay.classList.remove("hidden");

  if (mode === "gameover") {
    const isRecord = lastRunWasRecord;
    overlayKicker.textContent = isRecord ? "신기록 달성!" : "잔고 방어 실패";
    overlayTitle.textContent = `${formatSeconds(elapsed)} 생존`;
    overlayText.textContent = isRecord
      ? "오늘의 무지출 감각, 꽤 날카로웠어요."
      : "커피와 배달과 카드값은 언제나 위에서 옵니다.";
    startButton.textContent = "다시 도전";
    return;
  }

  overlayKicker.textContent = "귀여운 절약 챌린지";
  overlayTitle.textContent = "지출 폭탄을 피해요!";
  overlayText.textContent = "커피, 배달음식, 카드값을 피하며 오래 버티세요.";
  startButton.textContent = "시작하기";
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function resetGame() {
  state = "playing";
  lastTime = 0;
  elapsed = 0;
  spawnTimer = 0;
  objects = [];
  activeDragPointerId = null;
  setPlayerX(WIDTH / 2);
  updateScoreUi();
  hideOverlay();
  requestAnimationFrame(loop);
}

function finishGame() {
  state = "gameover";
  lastRunWasRecord = elapsed > bestScore;
  if (lastRunWasRecord) {
    bestScore = elapsed;
    localStorage.setItem(HIGH_SCORE_KEY, String(bestScore));
  }
  updateScoreUi();
  showOverlay("gameover");
}

function chooseObjectType() {
  const totalWeight = objectTypes.reduce((sum, type) => sum + type.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const type of objectTypes) {
    roll -= type.weight;
    if (roll <= 0) {
      return type;
    }
  }

  return objectTypes[0];
}

function spawnObject() {
  const type = chooseObjectType();
  const speedBoost = Math.min(elapsed * 4.1, 185);
  const sway = type.id === "bill" ? 34 + Math.random() * 24 : Math.random() * 18;

  objects.push({
    type,
    x: type.size / 2 + Math.random() * (WIDTH - type.size),
    y: -type.size,
    size: type.size,
    speed: type.baseSpeed + speedBoost + Math.random() * 36,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 2.4,
    sway,
    phase: Math.random() * Math.PI * 2,
  });
}

function update(dt) {
  elapsed += dt;
  spawnTimer -= dt;

  const spawnInterval = Math.max(0.34, 0.86 - elapsed * 0.008);
  if (spawnTimer <= 0) {
    spawnObject();
    if (elapsed > 18 && Math.random() < Math.min(0.42, elapsed * 0.006)) {
      spawnObject();
    }
    spawnTimer = spawnInterval;
  }

  const direction = Number(keys.right) - Number(keys.left);
  if (direction !== 0) {
    setPlayerX(player.x + direction * player.speed * dt);
  }

  for (const object of objects) {
    object.y += object.speed * dt;
    object.rotation += object.spin * dt;
    object.x += Math.sin(elapsed * 3.4 + object.phase) * object.sway * dt;
  }

  objects = objects.filter((object) => object.y < HEIGHT + object.size);

  if (objects.some(hasCollision)) {
    finishGame();
  }

  updateScoreUi();
}

function hasCollision(object) {
  const playerHitbox = {
    x: player.x - player.width * 0.34,
    y: player.y - player.height * 0.44,
    width: player.width * 0.68,
    height: player.height * 0.78,
  };

  const objectHitbox = {
    x: object.x - object.size * 0.38,
    y: object.y - object.size * 0.38,
    width: object.size * 0.76,
    height: object.size * 0.76,
  };

  return (
    playerHitbox.x < objectHitbox.x + objectHitbox.width &&
    playerHitbox.x + playerHitbox.width > objectHitbox.x &&
    playerHitbox.y < objectHitbox.y + objectHitbox.height &&
    playerHitbox.y + playerHitbox.height > objectHitbox.y
  );
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#fff9df");
  gradient.addColorStop(0.58, "#ddf7ec");
  gradient.addColorStop(1, "#ffe8f0");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  for (let i = 0; i < 12; i += 1) {
    const x = (i * 97 + elapsed * 14) % (WIDTH + 80) - 40;
    const y = 42 + ((i * 53) % 250);
    ctx.beginPath();
    ctx.ellipse(x, y, 34, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#bdebd9";
  ctx.fillRect(0, HEIGHT - 26, WIDTH, 26);
  ctx.fillStyle = "rgba(40, 48, 63, 0.08)";
  ctx.fillRect(0, HEIGHT - 26, WIDTH, 3);
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.fillStyle = "rgba(40, 48, 63, 0.14)";
  ctx.beginPath();
  ctx.ellipse(0, 40, 34, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7dd7b7";
  roundRect(-24, -10, 48, 50, 16);
  ctx.fill();

  ctx.fillStyle = "#ffe4bc";
  ctx.beginPath();
  ctx.arc(0, -26, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3b3142";
  ctx.beginPath();
  ctx.arc(-8, -28, 3, 0, Math.PI * 2);
  ctx.arc(8, -28, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#3b3142";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, -22, 9, 0.14 * Math.PI, 0.86 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = "#ffd36f";
  roundRect(-18, 9, 36, 24, 8);
  ctx.fill();
  ctx.fillStyle = "#3b3142";
  ctx.font = "900 12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("저축", 0, 21);

  ctx.restore();
}

function drawObject(object) {
  ctx.save();
  ctx.translate(object.x, object.y);
  ctx.rotate(object.rotation);

  if (object.type.id === "coffee") {
    drawCoffee(object);
  } else if (object.type.id === "delivery") {
    drawDelivery(object);
  } else {
    drawBill(object);
  }

  ctx.restore();
}

function drawCoffee(object) {
  const s = object.size;
  ctx.fillStyle = "rgba(40, 48, 63, 0.12)";
  roundRect(-s * 0.36 + 3, -s * 0.3 + 4, s * 0.72, s * 0.72, 10);
  ctx.fill();
  ctx.fillStyle = object.type.accent;
  roundRect(-s * 0.36, -s * 0.34, s * 0.72, s * 0.78, 9);
  ctx.fill();
  ctx.fillStyle = object.type.color;
  roundRect(-s * 0.31, -s * 0.21, s * 0.62, s * 0.52, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${s * 0.23}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("커피", 0, s * 0.04);
}

function drawDelivery(object) {
  const s = object.size;
  ctx.fillStyle = "rgba(40, 48, 63, 0.12)";
  roundRect(-s * 0.42 + 4, -s * 0.3 + 4, s * 0.84, s * 0.72, 12);
  ctx.fill();
  ctx.fillStyle = object.type.color;
  roundRect(-s * 0.42, -s * 0.36, s * 0.84, s * 0.76, 12);
  ctx.fill();
  ctx.fillStyle = object.type.accent;
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, -s * 0.36);
  ctx.lineTo(0, -s * 0.58);
  ctx.lineTo(s * 0.2, -s * 0.36);
  ctx.fill();
  ctx.fillStyle = "#5b3427";
  ctx.font = `900 ${s * 0.2}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("배달", 0, s * 0.05);
}

function drawBill(object) {
  const s = object.size;
  ctx.fillStyle = "rgba(40, 48, 63, 0.12)";
  roundRect(-s * 0.43 + 4, -s * 0.28 + 4, s * 0.86, s * 0.62, 8);
  ctx.fill();
  ctx.fillStyle = object.type.color;
  roundRect(-s * 0.43, -s * 0.32, s * 0.86, s * 0.64, 8);
  ctx.fill();
  ctx.fillStyle = object.type.accent;
  ctx.fillRect(-s * 0.35, -s * 0.18, s * 0.7, s * 0.08);
  ctx.fillStyle = "#20345d";
  ctx.font = `900 ${s * 0.16}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("카드값", 0, s * 0.09);
}

function draw() {
  drawBackground();
  objects.forEach(drawObject);
  drawPlayer();
}

function loop(timestamp) {
  if (state !== "playing") {
    draw();
    return;
  }

  if (!lastTime) {
    lastTime = timestamp;
  }

  const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;
  update(dt);
  draw();

  if (state === "playing") {
    requestAnimationFrame(loop);
  }
}

function roundRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function setMove(direction, isPressed) {
  if (direction === "left") {
    keys.left = isPressed;
  } else {
    keys.right = isPressed;
  }
}

window.addEventListener("keydown", (event) => {
  let handled = false;
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    setMove("left", true);
    handled = true;
  }
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    setMove("right", true);
    handled = true;
  }
  if ((event.key === " " || event.key === "Enter") && state !== "playing") {
    resetGame();
    handled = true;
  }
  if (handled) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  let handled = false;
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    setMove("left", false);
    handled = true;
  }
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    setMove("right", false);
    handled = true;
  }
  if (handled) {
    event.preventDefault();
  }
});

function bindHoldButton(button, direction) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    setMove(direction, true);
  });
  button.addEventListener("pointerup", () => setMove(direction, false));
  button.addEventListener("pointercancel", () => setMove(direction, false));
  button.addEventListener("lostpointercapture", () => setMove(direction, false));
}

canvas.addEventListener("pointerdown", (event) => {
  if (state !== "playing") {
    return;
  }

  event.preventDefault();
  activeDragPointerId = event.pointerId;
  canvas.setPointerCapture(event.pointerId);
  movePlayerToPointer(event);
});

canvas.addEventListener("pointermove", (event) => {
  if (state !== "playing" || event.pointerId !== activeDragPointerId) {
    return;
  }

  event.preventDefault();
  movePlayerToPointer(event);
});

function endCanvasDrag(event) {
  if (event.pointerId === activeDragPointerId) {
    activeDragPointerId = null;
  }
}

canvas.addEventListener("pointerup", endCanvasDrag);
canvas.addEventListener("pointercancel", endCanvasDrag);
canvas.addEventListener("lostpointercapture", endCanvasDrag);

startButton.addEventListener("click", resetGame);
bindHoldButton(leftButton, "left");
bindHoldButton(rightButton, "right");

updateScoreUi();
showOverlay("ready");
draw();
