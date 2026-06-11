const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const scoreEl = document.querySelector("#score");
const savingsEl = document.querySelector("#savingsScore");
const bestScoreEl = document.querySelector("#bestScore");
const overlay = document.querySelector("#overlay");
const overlayKicker = document.querySelector("#overlayKicker");
const overlayTitle = document.querySelector("#overlayTitle");
const overlayText = document.querySelector("#overlayText");
const startButton = document.querySelector("#startButton");
const leftButton = document.querySelector("#leftButton");
const rightButton = document.querySelector("#rightButton");
const dashButton = document.querySelector("#dashButton");
const nicknameInput = document.querySelector("#nicknameInput");
const leaderboardList = document.querySelector("#leaderboardList");
const clearLeaderboardButton = document.querySelector("#clearLeaderboardButton");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const LANES = 5;
const HIGH_SCORE_KEY = "donpihagi.highScore";
const PLAYER_NAME_KEY = "donpihagi.playerName";
const LEADERBOARD_KEY = "donpihagi.leaderboard";
const LEADERBOARD_LIMIT = 5;

const DASH_SPEED = 1180;
const DASH_DURATION = 0.16;
const DASH_COOLDOWN = 1.45;
const STARTING_DASH_CHARGES = 5;
const MAX_DASH_CHARGES = 8;

const keys = {
  left: false,
  right: false,
};

const player = {
  x: WIDTH / 2,
  y: HEIGHT - 70,
  width: 44,
  height: 54,
  speed: 430,
};

const hazardTypes = [
  {
    id: "coin",
    kind: "hazard",
    label: "동전비",
    color: "#f3c549",
    accent: "#fff7b8",
    size: 34,
    baseSpeed: 330,
    weight: 0.9,
    after: 0,
  },
  {
    id: "coffee",
    kind: "hazard",
    label: "커피",
    color: "#ad7445",
    accent: "#fff0c9",
    size: 44,
    baseSpeed: 230,
    weight: 1,
    after: 0,
  },
  {
    id: "delivery",
    kind: "hazard",
    label: "배달음식",
    color: "#ff8b5f",
    accent: "#ffe07d",
    size: 54,
    baseSpeed: 202,
    weight: 0.95,
    after: 4,
  },
  {
    id: "bill",
    kind: "hazard",
    label: "카드값",
    color: "#6d9cff",
    accent: "#ffffff",
    size: 62,
    baseSpeed: 186,
    weight: 0.95,
    after: 8,
  },
  {
    id: "subscription",
    kind: "hazard",
    label: "구독료",
    color: "#8d6be8",
    accent: "#f1eaff",
    size: 50,
    baseSpeed: 212,
    weight: 0.75,
    after: 15,
  },
  {
    id: "cash",
    kind: "hazard",
    label: "지폐다발",
    color: "#62bd76",
    accent: "#dff7c8",
    size: 68,
    baseSpeed: 158,
    weight: 0.68,
    after: 25,
  },
  {
    id: "coupon",
    kind: "trap",
    label: "할인쿠폰",
    color: "#ffdf68",
    accent: "#ff6e8d",
    size: 50,
    baseSpeed: 210,
    weight: 0.58,
    after: 35,
  },
  {
    id: "tax",
    kind: "hazard",
    label: "세금고지서",
    color: "#e65f5c",
    accent: "#fff3ef",
    size: 78,
    baseSpeed: 142,
    weight: 0.32,
    after: 72,
  },
];

const pickupTypes = [
  {
    id: "piggy",
    kind: "pickup",
    label: "저금통",
    color: "#ff9cb5",
    accent: "#fff1f5",
    size: 48,
    baseSpeed: 154,
    weight: 1,
    after: 4,
    value: 15,
    duration: 4.2,
  },
  {
    id: "ledger",
    kind: "pickup",
    label: "가계부",
    color: "#63cdb1",
    accent: "#e4fff7",
    size: 50,
    baseSpeed: 146,
    weight: 0.86,
    after: 10,
    value: 12,
    duration: 4.6,
  },
  {
    id: "emergency",
    kind: "pickup",
    label: "비상금",
    color: "#ffd36f",
    accent: "#fff8d7",
    size: 48,
    baseSpeed: 144,
    weight: 0.66,
    after: 18,
    value: 10,
  },
  {
    id: "saveMode",
    kind: "pickup",
    label: "절약모드",
    color: "#76b7ff",
    accent: "#eef7ff",
    size: 52,
    baseSpeed: 138,
    weight: 0.56,
    after: 24,
    value: 14,
    duration: 5,
  },
  {
    id: "dash",
    kind: "pickup",
    label: "대시",
    color: "#2563eb",
    accent: "#eef7ff",
    size: 48,
    baseSpeed: 156,
    weight: 0.78,
    after: 12,
    value: 8,
  },
  {
    id: "salary",
    kind: "pickup",
    label: "월급",
    color: "#ff7575",
    accent: "#fff2c7",
    size: 58,
    baseSpeed: 132,
    weight: 0.42,
    after: 45,
    value: 28,
    duration: 7,
  },
];

let state = "ready";
let lastTime = 0;
let elapsed = 0;
let spawnTimer = 0;
let pickupTimer = 4.4;
let objects = [];
let popups = [];
let savingsScore = 0;
let nearMissCount = 0;
let bestScore = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
let playerName = normalizeName(localStorage.getItem(PLAYER_NAME_KEY) || "절약러");
let leaderboard = loadLeaderboard();
let latestLeaderboardId = null;
let lastRunWasRecord = false;
let lastCollisionLabel = "";

let activeDragPointerId = null;
let dragTargetX = null;
let lastPointerX = null;
let lastMoveDirection = 1;
let invincibleUntil = 0;
let slowUntil = 0;
let slipUntil = 0;
let saveModeUntil = 0;
let salarySurgeUntil = 0;
let emergencyCharges = 0;
let dashUntil = 0;
let dashCooldownUntil = 0;
let dashDirection = 1;
let dashCharges = STARTING_DASH_CHARGES;
let audioContext = null;
let playerVelocityX = 0;
let walkPhase = 0;

function formatSeconds(seconds) {
  return `${seconds.toFixed(1)}초`;
}

function normalizeName(name) {
  const normalized = String(name || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10);
  return normalized || "절약러";
}

function loadLeaderboard() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((entry) => entry && typeof entry.seconds === "number")
      .map((entry) => ({
        id: String(entry.id || makeLeaderboardId()),
        name: normalizeName(entry.name),
        seconds: Math.max(0, Number(entry.seconds) || 0),
        savings: Math.max(0, Number(entry.savings) || 0),
        nearMisses: Math.max(0, Number(entry.nearMisses) || 0),
        createdAt: Number(entry.createdAt) || Date.now(),
      }))
      .sort(compareLeaderboardEntries)
      .slice(0, LEADERBOARD_LIMIT);
  } catch {
    return [];
  }
}

function saveLeaderboard() {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
}

function compareLeaderboardEntries(a, b) {
  if (b.seconds !== a.seconds) {
    return b.seconds - a.seconds;
  }
  if (b.savings !== a.savings) {
    return b.savings - a.savings;
  }
  if (b.nearMisses !== a.nearMisses) {
    return b.nearMisses - a.nearMisses;
  }
  return a.createdAt - b.createdAt;
}

function makeLeaderboardId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function recordLeaderboardEntry() {
  const entry = {
    id: makeLeaderboardId(),
    name: playerName,
    seconds: Number(elapsed.toFixed(1)),
    savings: savingsScore,
    nearMisses: nearMissCount,
    createdAt: Date.now(),
  };
  latestLeaderboardId = entry.id;
  leaderboard = [...leaderboard, entry]
    .sort(compareLeaderboardEntries)
    .slice(0, LEADERBOARD_LIMIT);
  saveLeaderboard();
  renderLeaderboard();
}

function renderLeaderboard() {
  leaderboardList.textContent = "";

  if (leaderboard.length === 0) {
    const empty = document.createElement("li");
    empty.className = "leaderboard-empty";
    empty.textContent = "아직 기록이 없어요";
    leaderboardList.append(empty);
    return;
  }

  leaderboard.forEach((entry, index) => {
    const row = document.createElement("li");
    row.className = "leaderboard-row";
    if (entry.id === latestLeaderboardId) {
      row.classList.add("is-latest");
    }

    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = `${index + 1}`;

    const name = document.createElement("span");
    name.className = "leaderboard-name";
    name.textContent = entry.name;

    const score = document.createElement("span");
    score.className = "leaderboard-score";
    score.textContent = `${formatSeconds(entry.seconds)} · ${entry.savings}점`;

    row.append(rank, name, score);
    leaderboardList.append(row);
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampPlayerX(x) {
  return clamp(x, player.width / 2 + 10, WIDTH - player.width / 2 - 10);
}

function setPlayerX(x) {
  player.x = clampPlayerX(x);
}

function recordPlayerMovement(deltaX, dt = 1 / 60) {
  if (Math.abs(deltaX) < 0.1) {
    playerVelocityX *= 0.84;
    return;
  }

  playerVelocityX = deltaX / Math.max(dt, 1 / 120);
  walkPhase += Math.min(Math.abs(deltaX) * 0.18, 0.95);
}

function isInvincible() {
  return elapsed < invincibleUntil || elapsed < dashUntil;
}

function isSlippery() {
  return elapsed < slipUntil;
}

function isSaveMode() {
  return elapsed < saveModeUntil;
}

function getGlobalSpeedMultiplier() {
  let multiplier = 1;
  if (elapsed < slowUntil) {
    multiplier *= 0.56;
  }
  if (elapsed < salarySurgeUntil) {
    multiplier *= 1.24;
  }
  return multiplier;
}

function getCanvasPointerX(event) {
  const rect = canvas.getBoundingClientRect();
  return ((event.clientX - rect.left) / rect.width) * WIDTH;
}

function movePlayerToPointer(event) {
  const nextX = getCanvasPointerX(event);
  if (lastPointerX !== null && Math.abs(nextX - lastPointerX) > 1) {
    lastMoveDirection = Math.sign(nextX - lastPointerX);
  }
  lastPointerX = nextX;
  dragTargetX = clampPlayerX(nextX);

  if (!isSlippery()) {
    const beforeX = player.x;
    setPlayerX(dragTargetX);
    recordPlayerMovement(player.x - beforeX);
  }
}

function laneCenter(index) {
  return ((index + 0.5) / LANES) * WIDTH;
}

function getSpawnInterval() {
  if (elapsed < 15) {
    return Math.max(0.36, 0.68 - elapsed * 0.006);
  }
  if (elapsed < 45) {
    return Math.max(0.24, 0.54 - (elapsed - 15) * 0.007);
  }
  if (elapsed < 75) {
    return Math.max(0.2, 0.34 - (elapsed - 45) * 0.0025);
  }
  return 0.18;
}

function updateScoreUi() {
  scoreEl.textContent = formatSeconds(elapsed);
  savingsEl.textContent = `${savingsScore}점`;
  bestScoreEl.textContent = formatSeconds(bestScore);

  if (state !== "playing") {
    dashButton.disabled = false;
    dashButton.textContent = `대시 ${STARTING_DASH_CHARGES}/${MAX_DASH_CHARGES}`;
    return;
  }

  const cooldown = Math.max(0, dashCooldownUntil - elapsed);
  dashButton.disabled = cooldown > 0 || dashCharges <= 0;
  dashButton.textContent =
    cooldown > 0
      ? `대시 ${dashCharges}/${MAX_DASH_CHARGES} · ${cooldown.toFixed(1)}`
      : `대시 ${dashCharges}/${MAX_DASH_CHARGES}`;
}

function getGrade() {
  if (elapsed >= 120) {
    return "절약 전설";
  }
  if (elapsed >= 90) {
    return "무지출 고수";
  }
  if (elapsed >= 60) {
    return "월급 방어 성공";
  }
  if (elapsed >= 35) {
    return "커피값 방어";
  }
  if (elapsed >= 15) {
    return "잔고 수비대";
  }
  return "귀여운 첫 도전";
}

function getResultLine() {
  const lines = [
    "오늘도 무지출은 실패했지만 귀여웠다.",
    "잔고가 바람처럼 스쳐갔어요.",
    "카드값에게 정면승부를 걸지 마세요.",
    "월급은 들어왔고, 바로 나갔습니다.",
    "절약왕까지 조금 남았었는데요.",
  ];

  if (nearMissCount >= 12) {
    return "방금 몇 번은 정말 아슬아슬했어요.";
  }
  if (savingsScore >= 70) {
    return "저축 감각은 살아있습니다. 손만 조금 더 바쁘게!";
  }
  return lines[Math.floor(Math.random() * lines.length)];
}

function showOverlay(mode) {
  overlay.classList.remove("hidden");
  renderLeaderboard();

  if (mode === "gameover") {
    const isRecord = lastRunWasRecord;
    overlayKicker.textContent = isRecord ? "신기록 달성!" : "잔고 방어 종료";
    overlayTitle.textContent = `${getGrade()} · ${formatSeconds(elapsed)}`;
    overlayText.textContent = `${lastCollisionLabel || "지출"}에 닿았어요. 저축 ${savingsScore}점, 근접 회피 ${nearMissCount}회. ${getResultLine()}`;
    startButton.textContent = "다시 도전";
    updateScoreUi();
    return;
  }

  overlayKicker.textContent = "월급날 생존 챌린지";
  overlayTitle.textContent = "잔고를 지켜요!";
  overlayText.textContent =
    `소비 유혹은 피하고, 대시는 기본 ${STARTING_DASH_CHARGES}번! 파란 대시 토큰으로 ${MAX_DASH_CHARGES}개까지 채울 수 있어요.`;
  startButton.textContent = "시작하기";
  updateScoreUi();
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function resetGame() {
  primeAudio();
  state = "playing";
  lastTime = 0;
  elapsed = 0;
  spawnTimer = 0;
  pickupTimer = 4.4;
  objects = [];
  popups = [];
  savingsScore = 0;
  nearMissCount = 0;
  lastRunWasRecord = false;
  lastCollisionLabel = "";
  activeDragPointerId = null;
  dragTargetX = null;
  lastPointerX = null;
  invincibleUntil = 0;
  slowUntil = 0;
  slipUntil = 0;
  saveModeUntil = 0;
  salarySurgeUntil = 0;
  emergencyCharges = 0;
  dashUntil = 0;
  dashCooldownUntil = 0;
  dashDirection = 1;
  dashCharges = STARTING_DASH_CHARGES;
  playerVelocityX = 0;
  walkPhase = 0;
  setPlayerX(WIDTH / 2);
  updateScoreUi();
  hideOverlay();
  requestAnimationFrame(loop);
}

function finishGame(label) {
  state = "gameover";
  lastCollisionLabel = label;
  playTone(132, 0.18, "sawtooth", 0.05);
  lastRunWasRecord = elapsed > bestScore;
  if (lastRunWasRecord) {
    bestScore = elapsed;
    localStorage.setItem(HIGH_SCORE_KEY, String(bestScore));
  }
  recordLeaderboardEntry();
  updateScoreUi();
  showOverlay("gameover");
}

function addPopup(text, x, y, color = "#28303f") {
  popups.push({
    text,
    x,
    y,
    color,
    life: 0.9,
    maxLife: 0.9,
  });
}

function primeAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  audioContext = audioContext || new AudioContextClass();
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

function playTone(frequency, duration = 0.08, type = "sine", volume = 0.035) {
  const audio = primeAudio();
  if (!audio) {
    return;
  }

  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration);
}

function chooseWeighted(types) {
  const candidates = types.filter((type) => elapsed >= type.after);
  const totalWeight = candidates.reduce((sum, type) => sum + type.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const type of candidates) {
    roll -= type.weight;
    if (roll <= 0) {
      return type;
    }
  }

  return candidates[0] || types[0];
}

function getTypeById(types, id) {
  return types.find((type) => type.id === id);
}

function chooseHazardType(options = {}) {
  const excluded = options.exclude || [];
  return chooseWeighted(hazardTypes.filter((type) => !excluded.includes(type.id)));
}

function spawnEntity(type, options = {}) {
  const speedBoost = Math.min(elapsed * 6.2, 330);
  const defaultSway = type.id === "bill" ? 42 + Math.random() * 32 : 6 + Math.random() * 22;
  const size = options.size ?? type.size;

  objects.push({
    type,
    x: options.x ?? size / 2 + Math.random() * (WIDTH - size),
    y: options.y ?? -size,
    size,
    speed: (type.baseSpeed + speedBoost + Math.random() * 52) * (options.speedMultiplier ?? 1),
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 2.2,
    sway: options.sway ?? defaultSway,
    phase: Math.random() * Math.PI * 2,
    bounced: false,
    grounded: false,
    expireAt: null,
    nearMissed: false,
    collected: false,
  });
}

function spawnHazard(options = {}) {
  spawnEntity(options.type || chooseHazardType(), options);
}

function spawnPickup() {
  if (objects.filter((object) => object.type.kind === "pickup").length >= 2) {
    return;
  }

  spawnEntity(chooseWeighted(pickupTypes), {
    y: -70,
    speedMultiplier: 0.74,
    sway: 10 + Math.random() * 16,
  });
}

function spawnCurtain() {
  const gapLane = Math.floor(Math.random() * LANES);
  const type = chooseHazardType({ exclude: ["coupon", "tax"] });

  for (let lane = 0; lane < LANES; lane += 1) {
    if (lane === gapLane) {
      continue;
    }

    spawnHazard({
      type,
      x: laneCenter(lane),
      y: -82 - Math.random() * 100,
      speedMultiplier: 0.82,
      sway: 5 + Math.random() * 10,
    });
  }
}

function spawnSubscriptionStack() {
  const type = getTypeById(hazardTypes, "subscription");
  const x = laneCenter(Math.floor(Math.random() * LANES));

  for (let i = 0; i < 3; i += 1) {
    spawnHazard({
      type,
      x,
      y: -70 - i * 74,
      speedMultiplier: 0.82,
      sway: 3,
    });
  }
}

function spawnWave() {
  spawnHazard();

  if (elapsed > 8 && Math.random() < Math.min(0.68, 0.24 + elapsed * 0.01)) {
    spawnHazard({
      y: -112 - Math.random() * 80,
      speedMultiplier: 0.95,
    });
  }

  if (elapsed > 22 && Math.random() < Math.min(0.5, 0.12 + elapsed * 0.006)) {
    spawnHazard({
      y: -190 - Math.random() * 90,
      speedMultiplier: 0.9,
    });
  }

  if (elapsed > 15 && Math.random() < 0.14) {
    spawnSubscriptionStack();
  }

  if (elapsed > 45 && Math.random() < Math.min(0.34, elapsed * 0.004)) {
    spawnCurtain();
  }

  if (elapsed > 75 && Math.random() < 0.11) {
    spawnHazard({
      type: getTypeById(hazardTypes, "tax"),
      x: laneCenter(Math.floor(Math.random() * LANES)),
      y: -100,
      speedMultiplier: 0.86,
      sway: 4,
    });
  }
}

function triggerDash() {
  if (state !== "playing" || elapsed < dashCooldownUntil || dashCharges <= 0) {
    return;
  }

  dashDirection = lastMoveDirection || (player.x < WIDTH / 2 ? 1 : -1);
  dashCharges -= 1;
  dashUntil = elapsed + DASH_DURATION;
  dashCooldownUntil = elapsed + DASH_COOLDOWN;
  addPopup("대시!", player.x, player.y - 54, "#76b7ff");
  playTone(520, 0.08, "triangle", 0.032);
  updateScoreUi();
}

function updatePlayer(dt) {
  const beforeX = player.x;
  const direction = Number(keys.right) - Number(keys.left);

  if (direction !== 0) {
    lastMoveDirection = direction;
    dragTargetX = null;
    const controlMultiplier = isSlippery() ? 0.58 : 1;
    setPlayerX(player.x + direction * player.speed * controlMultiplier * dt);
  }

  if (dragTargetX !== null) {
    const followSpeed = isSlippery() ? 6 : 24;
    const nextX = player.x + (dragTargetX - player.x) * Math.min(1, followSpeed * dt);
    setPlayerX(nextX);
  }

  if (elapsed < dashUntil) {
    setPlayerX(player.x + dashDirection * DASH_SPEED * dt);
  }

  recordPlayerMovement(player.x - beforeX, dt);
}

function updateObjects(dt) {
  const speedMultiplier = getGlobalSpeedMultiplier();

  for (const object of objects) {
    const pickupSlow = object.type.kind === "pickup" ? 0.86 : 1;
    if (object.speed < 0) {
      object.speed += 900 * dt;
    }

    object.y += object.speed * speedMultiplier * pickupSlow * dt;
    object.rotation += object.spin * dt;
    object.x += Math.sin(elapsed * 3.2 + object.phase) * object.sway * dt;
    object.x = clamp(object.x, object.size * 0.38, WIDTH - object.size * 0.38);

    if (object.type.id === "delivery" && object.y > HEIGHT - 42) {
      object.y = HEIGHT - 42;
      object.grounded = true;

      if (!object.bounced) {
        object.bounced = true;
        object.expireAt = elapsed + 1;
        object.speed = -Math.abs(object.speed) * 0.36;
        object.spin *= -1.3;
        addPopup("통!", object.x, object.y - 34, "#ff8b5f");
        playTone(210, 0.07, "square", 0.025);
      } else {
        object.speed = 0;
        object.spin = 0;
        object.sway = 0;
      }
    }
  }
}

function updatePopups(dt) {
  for (const popup of popups) {
    popup.life -= dt;
    popup.y -= 34 * dt;
  }
  popups = popups.filter((popup) => popup.life > 0);
}

function collectPickup(object) {
  object.collected = true;
  savingsScore += object.type.value;

  if (object.type.id === "piggy") {
    invincibleUntil = Math.max(invincibleUntil, elapsed + object.type.duration);
    addPopup("+저금통 무적", object.x, object.y, "#ff6e8d");
  } else if (object.type.id === "ledger") {
    slowUntil = Math.max(slowUntil, elapsed + object.type.duration);
    addPopup("+가계부 느림", object.x, object.y, "#16a083");
  } else if (object.type.id === "emergency") {
    emergencyCharges += 1;
    addPopup("+비상금", object.x, object.y, "#d89022");
  } else if (object.type.id === "saveMode") {
    saveModeUntil = Math.max(saveModeUntil, elapsed + object.type.duration);
    addPopup("+절약모드", object.x, object.y, "#3f8fea");
  } else if (object.type.id === "dash") {
    if (dashCharges < MAX_DASH_CHARGES) {
      dashCharges += 1;
      addPopup("+대시 1", object.x, object.y, "#2563eb");
    } else {
      savingsScore += 5;
      addPopup("대시 가득 · 저축+5", object.x, object.y, "#2563eb");
    }
  } else if (object.type.id === "salary") {
    salarySurgeUntil = Math.max(salarySurgeUntil, elapsed + object.type.duration);
    addPopup("+월급! 후폭풍", object.x, object.y, "#e65f5c");
  }

  addPopup(`저축 +${object.type.value}`, object.x, object.y - 22, "#28303f");
  playTone(720, 0.09, "triangle", 0.035);
}

function handleHazardCollision(object) {
  object.collected = true;

  if (object.type.id === "coupon") {
    savingsScore = Math.max(0, savingsScore - 5);
    slipUntil = Math.max(slipUntil, elapsed + 2.7);
    addPopup("쿠폰 함정!", object.x, object.y, "#e65f5c");
    playTone(180, 0.12, "sawtooth", 0.035);
    return;
  }

  if (isInvincible()) {
    savingsScore += 1;
    addPopup("방어!", object.x, object.y, "#76b7ff");
    playTone(460, 0.08, "triangle", 0.03);
    return;
  }

  if (emergencyCharges > 0) {
    emergencyCharges -= 1;
    addPopup("비상금 사용!", object.x, object.y, "#d89022");
    playTone(360, 0.09, "triangle", 0.03);
    return;
  }

  finishGame(object.type.label);
}

function checkCollisions() {
  for (const object of objects) {
    if (object.collected) {
      continue;
    }

    if (hasCollision(object)) {
      if (object.type.kind === "pickup") {
        collectPickup(object);
      } else {
        handleHazardCollision(object);
      }
    } else {
      maybeAwardNearMiss(object);
    }
  }

  objects = objects.filter(
    (object) =>
      !object.collected &&
      (object.expireAt === null || elapsed < object.expireAt) &&
      object.y < HEIGHT + object.size,
  );
}

function maybeAwardNearMiss(object) {
  if (object.type.kind === "pickup" || object.nearMissed) {
    return;
  }

  const crossedPlayer = object.y > player.y - 18 && object.y < player.y + 36;
  if (!crossedPlayer) {
    return;
  }

  const safeDistance = player.width * 0.36 + object.size * getObjectHitScale(object) * 0.5;
  const distance = Math.abs(object.x - player.x);

  if (distance > safeDistance && distance < safeDistance + 38) {
    object.nearMissed = true;
    nearMissCount += 1;
    savingsScore += 2;
    addPopup("아슬 +2", (object.x + player.x) / 2, player.y - 44, "#ff9cb5");
    playTone(610, 0.055, "sine", 0.024);
  }
}

function getObjectHitScale(object) {
  if (object.type.kind === "pickup") {
    return 0.86;
  }
  if (isSaveMode()) {
    return 0.58;
  }
  return object.type.id === "tax" ? 0.74 : 0.78;
}

function hasCollision(object) {
  if (object.grounded) {
    return false;
  }

  const playerHitbox = {
    x: player.x - player.width * 0.34,
    y: player.y - player.height * 0.44,
    width: player.width * 0.68,
    height: player.height * 0.78,
  };

  const hitScale = getObjectHitScale(object);
  const objectHitbox = {
    x: object.x - object.size * hitScale * 0.5,
    y: object.y - object.size * hitScale * 0.5,
    width: object.size * hitScale,
    height: object.size * hitScale,
  };

  return (
    playerHitbox.x < objectHitbox.x + objectHitbox.width &&
    playerHitbox.x + playerHitbox.width > objectHitbox.x &&
    playerHitbox.y < objectHitbox.y + objectHitbox.height &&
    playerHitbox.y + playerHitbox.height > objectHitbox.y
  );
}

function update(dt) {
  elapsed += dt;
  spawnTimer -= dt;
  pickupTimer -= dt;

  if (spawnTimer <= 0) {
    spawnWave();
    spawnTimer = getSpawnInterval() * (0.88 + Math.random() * 0.24);
  }

  if (pickupTimer <= 0) {
    spawnPickup();
    pickupTimer = Math.max(4.4, 7.4 - elapsed * 0.018) + Math.random() * 2.2;
  }

  updatePlayer(dt);
  updateObjects(dt);
  checkCollisions();
  updatePopups(dt);
  updateScoreUi();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#fffdf7");
  gradient.addColorStop(0.66, "#f7faf7");
  gradient.addColorStop(1, "#f1f5f2");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "rgba(40, 48, 63, 0.045)";
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

function drawStatusChips() {
  const chips = [];
  if (elapsed < invincibleUntil) {
    chips.push(`저금통 ${Math.ceil(invincibleUntil - elapsed)}초`);
  }
  if (elapsed < slowUntil) {
    chips.push(`가계부 ${Math.ceil(slowUntil - elapsed)}초`);
  }
  if (emergencyCharges > 0) {
    chips.push(`비상금 ${emergencyCharges}`);
  }
  if (elapsed < saveModeUntil) {
    chips.push(`절약모드 ${Math.ceil(saveModeUntil - elapsed)}초`);
  }
  if (elapsed < slipUntil) {
    chips.push(`쿠폰 미끄럼 ${Math.ceil(slipUntil - elapsed)}초`);
  }
  if (elapsed < salarySurgeUntil) {
    chips.push(`월급 후폭풍 ${Math.ceil(salarySurgeUntil - elapsed)}초`);
  }

  let y = 16;
  for (const chip of chips.slice(0, 4)) {
    ctx.font = "900 13px sans-serif";
    const width = ctx.measureText(chip).width + 20;
    ctx.fillStyle = "rgba(255, 253, 247, 0.86)";
    roundRect(14, y, width, 26, 13);
    ctx.fill();
    ctx.fillStyle = "#28303f";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(chip, 24, y + 13);
    y += 31;
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  const speedRatio = clamp(Math.abs(playerVelocityX) / 640, 0, 1);
  const visualDirection =
    speedRatio > 0.05 ? Math.sign(playerVelocityX) : lastMoveDirection || 1;
  const stride = Math.sin(walkPhase) * 12 * speedRatio;
  const lift = Math.abs(Math.cos(walkPhase)) * 4 * speedRatio;
  const hipX = visualDirection * 2.4 * speedRatio;
  const shoulderX = visualDirection * 3.6 * speedRatio;
  const lean = visualDirection * 0.06 * speedRatio;
  const leftFootX = -13 + visualDirection * stride;
  const rightFootX = 13 - visualDirection * stride;
  const leftFootY = 32 - (stride > 0 ? lift : 0);
  const rightFootY = 32 - (stride < 0 ? lift : 0);
  const armSwing = stride * 0.55;

  if (isInvincible()) {
    ctx.strokeStyle = "rgba(37, 99, 235, 0.78)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, -3, 31, 48, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
  ctx.beginPath();
  ctx.ellipse(0, 34, 23, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#30343b";
  ctx.fillStyle = "#30343b";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.rotate(lean);

  ctx.beginPath();
  ctx.fillStyle = "#fff0d7";
  ctx.arc(0, -31, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(hipX, 9);
  ctx.moveTo(shoulderX, -7);
  ctx.lineTo(-17 - visualDirection * armSwing, 1 + speedRatio * 2);
  ctx.moveTo(shoulderX, -7);
  ctx.lineTo(17 + visualDirection * armSwing, 1 - speedRatio * 2);
  ctx.moveTo(hipX, 9);
  ctx.lineTo(leftFootX, leftFootY);
  ctx.moveTo(hipX, 9);
  ctx.lineTo(rightFootX, rightFootY);
  ctx.stroke();

  ctx.fillStyle = "#30343b";
  ctx.beginPath();
  ctx.arc(-4, -33, 1.7, 0, Math.PI * 2);
  ctx.arc(4, -33, 1.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#30343b";
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.arc(0, -30, 4.4, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 156, 181, 0.75)";
  ctx.beginPath();
  ctx.arc(-7, -30, 2.1, 0, Math.PI * 2);
  ctx.arc(7, -30, 2.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawObject(object) {
  ctx.save();
  ctx.translate(object.x, object.y);
  ctx.rotate(object.rotation);
  if (object.expireAt !== null) {
    ctx.globalAlpha = clamp(object.expireAt - elapsed, 0, 1);
  }

  if (object.type.kind !== "pickup" && isSaveMode()) {
    ctx.scale(0.85, 0.85);
  }

  if (object.type.kind === "pickup") {
    drawPickupToken(object);
  } else {
    drawHazardSilhouette(object);
  }

  ctx.restore();
}

function drawHazardSilhouette(object) {
  const s = object.size;
  const label = object.type.label.slice(0, 2);
  const isCoin = object.type.id === "coin";
  const isMoneyBlock = object.type.id === "cash" || object.type.id === "tax";

  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  if (isCoin) {
    ctx.beginPath();
    ctx.arc(4, 5, s * 0.46, 0, Math.PI * 2);
    ctx.fill();
  } else {
    roundRect(-s * 0.48 + 4, -s * 0.3 + 5, s * 0.96, s * 0.62, 8);
    ctx.fill();
  }

  ctx.fillStyle = "#111111";
  if (isCoin) {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.46, 0, Math.PI * 2);
    ctx.fill();
  } else if (isMoneyBlock) {
    roundRect(-s * 0.5, -s * 0.27, s, s * 0.54, 8);
    ctx.fill();
  } else {
    roundRect(-s * 0.42, -s * 0.35, s * 0.84, s * 0.7, 10);
    ctx.fill();
  }

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(2, s * 0.06);
  if (isCoin) {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.24, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-s * 0.24, -s * 0.09);
    ctx.lineTo(s * 0.24, -s * 0.09);
    ctx.moveTo(-s * 0.24, s * 0.09);
    ctx.lineTo(s * 0.24, s * 0.09);
    ctx.stroke();
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${Math.max(11, s * 0.18)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(isCoin ? "₩" : label, 0, 0);
}

function getPickupStyle(id) {
  if (id === "salary") {
    return { color: "#ef4444", label: "월급" };
  }
  if (id === "emergency" || id === "saveMode" || id === "dash") {
    const label = id === "emergency" ? "비상" : id === "dash" ? "대시" : "절약";
    return { color: "#2563eb", label };
  }
  return { color: "#16a34a", label: id === "piggy" ? "저축" : "가계" };
}

function drawPickupToken(object) {
  const s = object.size;
  const style = getPickupStyle(object.type.id);

  ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
  ctx.beginPath();
  ctx.arc(3, 5, s * 0.46, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = style.color;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.46, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(3, s * 0.08);
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.32, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${Math.max(12, s * 0.2)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(style.label, 0, 0);
}

function drawCoin(object) {
  const s = object.size;
  ctx.fillStyle = "rgba(40, 48, 63, 0.12)";
  ctx.beginPath();
  ctx.arc(3, 4, s * 0.44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = object.type.color;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = object.type.accent;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8d6423";
  ctx.font = `900 ${s * 0.42}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("₩", 0, 1);
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

function drawSubscription(object) {
  const s = object.size;
  ctx.fillStyle = "rgba(40, 48, 63, 0.12)";
  roundRect(-s * 0.38 + 3, -s * 0.38 + 4, s * 0.76, s * 0.76, 12);
  ctx.fill();
  ctx.fillStyle = object.type.color;
  roundRect(-s * 0.38, -s * 0.4, s * 0.76, s * 0.8, 12);
  ctx.fill();
  ctx.fillStyle = object.type.accent;
  ctx.fillRect(-s * 0.24, -s * 0.2, s * 0.48, 4);
  ctx.fillRect(-s * 0.24, -s * 0.04, s * 0.48, 4);
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${s * 0.17}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("구독", 0, s * 0.18);
}

function drawCash(object) {
  const s = object.size;
  ctx.fillStyle = "rgba(40, 48, 63, 0.12)";
  roundRect(-s * 0.48 + 4, -s * 0.26 + 4, s * 0.96, s * 0.52, 8);
  ctx.fill();
  ctx.fillStyle = object.type.color;
  roundRect(-s * 0.48, -s * 0.26, s * 0.96, s * 0.52, 8);
  ctx.fill();
  ctx.fillStyle = object.type.accent;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.2, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2f7343";
  ctx.font = `900 ${s * 0.16}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("지폐", 0, 1);
}

function drawCoupon(object) {
  const s = object.size;
  ctx.fillStyle = "rgba(40, 48, 63, 0.12)";
  roundRect(-s * 0.48 + 3, -s * 0.28 + 4, s * 0.96, s * 0.56, 8);
  ctx.fill();
  ctx.fillStyle = object.type.color;
  roundRect(-s * 0.48, -s * 0.28, s * 0.96, s * 0.56, 8);
  ctx.fill();
  ctx.fillStyle = object.type.accent;
  ctx.fillRect(-s * 0.46, -s * 0.05, s * 0.92, 4);
  ctx.fillStyle = "#7d3e28";
  ctx.font = `900 ${s * 0.17}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("쿠폰", 0, 0);
}

function drawTax(object) {
  const s = object.size;
  ctx.fillStyle = "rgba(40, 48, 63, 0.16)";
  roundRect(-s * 0.44 + 5, -s * 0.36 + 5, s * 0.88, s * 0.72, 10);
  ctx.fill();
  ctx.fillStyle = object.type.color;
  roundRect(-s * 0.44, -s * 0.36, s * 0.88, s * 0.72, 10);
  ctx.fill();
  ctx.fillStyle = object.type.accent;
  ctx.beginPath();
  ctx.moveTo(-s * 0.34, -s * 0.24);
  ctx.lineTo(0, 0);
  ctx.lineTo(s * 0.34, -s * 0.24);
  ctx.lineTo(s * 0.34, s * 0.22);
  ctx.lineTo(-s * 0.34, s * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#8b2624";
  ctx.font = `900 ${s * 0.17}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("세금", 0, s * 0.08);
}

function drawPiggy(object) {
  const s = object.size;
  ctx.fillStyle = "rgba(40, 48, 63, 0.12)";
  ctx.beginPath();
  ctx.ellipse(3, 4, s * 0.42, s * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = object.type.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.43, s * 0.31, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = object.type.accent;
  ctx.beginPath();
  ctx.arc(s * 0.34, -s * 0.04, s * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5d3141";
  ctx.fillRect(-s * 0.16, -s * 0.24, s * 0.32, 4);
  ctx.beginPath();
  ctx.arc(-s * 0.08, -s * 0.04, 2, 0, Math.PI * 2);
  ctx.arc(s * 0.38, -s * 0.04, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawLedger(object) {
  const s = object.size;
  ctx.fillStyle = "rgba(40, 48, 63, 0.12)";
  roundRect(-s * 0.36 + 3, -s * 0.42 + 4, s * 0.72, s * 0.84, 8);
  ctx.fill();
  ctx.fillStyle = object.type.color;
  roundRect(-s * 0.36, -s * 0.42, s * 0.72, s * 0.84, 8);
  ctx.fill();
  ctx.fillStyle = object.type.accent;
  ctx.fillRect(-s * 0.2, -s * 0.18, s * 0.4, 4);
  ctx.fillRect(-s * 0.2, 0, s * 0.4, 4);
  ctx.fillStyle = "#1c6d61";
  ctx.font = `900 ${s * 0.16}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("가계", 0, s * 0.2);
}

function drawEmergency(object) {
  const s = object.size;
  ctx.fillStyle = "rgba(40, 48, 63, 0.12)";
  roundRect(-s * 0.36 + 3, -s * 0.26 + 4, s * 0.72, s * 0.62, 12);
  ctx.fill();
  ctx.fillStyle = object.type.color;
  roundRect(-s * 0.36, -s * 0.3, s * 0.72, s * 0.66, 12);
  ctx.fill();
  ctx.fillStyle = "#a76b19";
  ctx.font = `900 ${s * 0.17}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("비상", 0, s * 0.04);
}

function drawSaveMode(object) {
  const s = object.size;
  ctx.fillStyle = "rgba(40, 48, 63, 0.12)";
  ctx.beginPath();
  ctx.ellipse(3, 4, s * 0.36, s * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = object.type.color;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.45);
  ctx.lineTo(s * 0.34, -s * 0.22);
  ctx.lineTo(s * 0.26, s * 0.32);
  ctx.lineTo(0, s * 0.48);
  ctx.lineTo(-s * 0.26, s * 0.32);
  ctx.lineTo(-s * 0.34, -s * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = object.type.accent;
  ctx.font = `900 ${s * 0.16}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("절약", 0, s * 0.02);
}

function drawSalary(object) {
  const s = object.size;
  ctx.fillStyle = "rgba(40, 48, 63, 0.12)";
  roundRect(-s * 0.42 + 4, -s * 0.28 + 4, s * 0.84, s * 0.6, 10);
  ctx.fill();
  ctx.fillStyle = object.type.color;
  roundRect(-s * 0.42, -s * 0.3, s * 0.84, s * 0.62, 10);
  ctx.fill();
  ctx.fillStyle = object.type.accent;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#872528";
  ctx.font = `900 ${s * 0.17}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("월급", 0, s * 0.02);
}

function drawPopups() {
  for (const popup of popups) {
    ctx.save();
    ctx.globalAlpha = clamp(popup.life / popup.maxLife, 0, 1);
    ctx.font = "900 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255, 253, 247, 0.82)";
    const width = ctx.measureText(popup.text).width + 20;
    roundRect(popup.x - width / 2, popup.y - 16, width, 32, 16);
    ctx.fill();
    ctx.fillStyle = popup.color;
    ctx.fillText(popup.text, popup.x, popup.y);
    ctx.restore();
  }
}

function draw() {
  drawBackground();
  objects.forEach(drawObject);
  drawPlayer();
  drawStatusChips();
  drawPopups();
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
  if (event.target === nicknameInput) {
    return;
  }

  let handled = false;
  const key = event.key.toLowerCase();

  if (event.key === "ArrowLeft" || key === "a") {
    setMove("left", true);
    handled = true;
  }
  if (event.key === "ArrowRight" || key === "d") {
    setMove("right", true);
    handled = true;
  }
  if ((event.key === " " || event.key === "Shift") && state === "playing") {
    triggerDash();
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
  const key = event.key.toLowerCase();

  if (event.key === "ArrowLeft" || key === "a") {
    setMove("left", false);
    handled = true;
  }
  if (event.key === "ArrowRight" || key === "d") {
    setMove("right", false);
    handled = true;
  }
  if (handled) {
    event.preventDefault();
  }
});

window.addEventListener("blur", () => {
  keys.left = false;
  keys.right = false;
});

function bindHoldButton(button, direction) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    dragTargetX = null;
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
    lastPointerX = null;
  }
}

canvas.addEventListener("pointerup", endCanvasDrag);
canvas.addEventListener("pointercancel", endCanvasDrag);
canvas.addEventListener("lostpointercapture", endCanvasDrag);

startButton.addEventListener("click", resetGame);
dashButton.addEventListener("click", triggerDash);
bindHoldButton(leftButton, "left");
bindHoldButton(rightButton, "right");

nicknameInput.value = playerName;
nicknameInput.addEventListener("input", () => {
  playerName = normalizeName(nicknameInput.value);
  localStorage.setItem(PLAYER_NAME_KEY, playerName);
});
nicknameInput.addEventListener("blur", () => {
  nicknameInput.value = playerName;
});

clearLeaderboardButton.addEventListener("click", () => {
  leaderboard = [];
  latestLeaderboardId = null;
  saveLeaderboard();
  renderLeaderboard();
});

updateScoreUi();
showOverlay("ready");
draw();
