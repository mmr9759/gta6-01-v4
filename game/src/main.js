// VELMARA — main.js: the game loop and all the play.
// One job: wire input, driving, combat, traffic, pedestrians, the clock
// and the save together, and run the frame loop. Everything else lives
// in its own file: world, missions, police, render, audio.

import { CITY, VIEW, PLAYER, CAR_MODELS, SAVE_KEY, clamp, dist, angleTo, mulberry32 } from './config.js';
import { buildWorld, collideBuildings, clampToCity, spawnTraffic, spawnParkedCars, spawnPedestrians, graphPath, nearestNode, onRoad } from './world.js';
import { MissionLog } from './missions.js';
import { PoliceForce } from './police.js';
import { Renderer } from './render.js';
import { SoundBank } from './audio.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const sound = new SoundBank();
const rand = mulberry32(777);

const state = {
  phase: 'title', // title | play | paused | dead | busted
  world: buildWorld(),
  player: { x: 900, y: 800, angle: -Math.PI / 2, health: PLAYER.health, vx: 0, vy: 0 },
  cars: [], peds: [], bullets: [], particles: [],
  police: null, missions: new MissionLog(),
  inCar: false, car: null, carDamage: 0,
  cash: 100, clock: 9, night: 0, autoDrive: null,
  keys: {}, mouse: { x: 0, y: 0, down: false },
  playTime: 0, saveTimer: 0, sound,
};

state.police = new PoliceForce(state.world);
state.cars = [...spawnParkedCars(state.world, rand), ...spawnTraffic(state.world, rand, 16)];
state.peds = spawnPedestrians(state.world, rand, 42);

// ---- input ----
const KEYMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'run', ShiftRight: 'run', Space: 'brake' };
window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  const k = KEYMAP[e.code];
  if (k) state.keys[k] = true;
  if (e.code === 'Enter' && state.phase === 'title') startGame();
  if (e.code === 'KeyE' && state.phase === 'play') toggleCar();
  if (e.code === 'KeyG' && state.phase === 'play') toggleAutoDrive();
  if (e.code === 'KeyF' && state.phase === 'play' && !state.inCar) punch();
  if (e.code === 'KeyM') sound.toggleMute();
  if (e.code === 'KeyP' && (state.phase === 'play' || state.phase === 'paused')) state.phase = state.phase === 'play' ? 'paused' : 'play';
  if (e.code === 'KeyR' && (state.phase === 'dead' || state.phase === 'busted')) respawn();
});
window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) state.keys[k] = false; });
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  state.mouse.x = (e.clientX - r.left) * (VIEW.width / r.width);
  state.mouse.y = (e.clientY - r.top) * (VIEW.height / r.height);
});
canvas.addEventListener('mousedown', (e) => {
  sound.ensure();
  if (state.phase === 'title') { startGame(); return; }
  if (state.phase === 'play' && !state.inCar) shoot();
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function startGame() {
  sound.ensure();
  state.phase = 'play';
  state.missions.showBanner('MISSION 1 — FIRST PICKUP', 'Mara Voss: get the package from the Old Port warehouse.', 4);
}
function respawn() {
  state.player.health = 100;
  state.player.x = 900; state.player.y = 800;
  state.inCar = false; state.car = null;
  state.phase = 'play';
}

// ---- car enter / exit (stealing a parked car raises the heat) ----
function nearestCar(maxD) {
  let best = null, bd = maxD;
  for (const car of state.cars) {
    const d = dist(state.player.x, state.player.y, car.x, car.y);
    if (d < bd) { bd = d; best = car; }
  }
  return best;
}
function toggleCar() {
  if (state.inCar) {
    state.inCar = false;
    const a = state.car.angle;
    state.player.x = state.car.x - Math.sin(a) * 40;
    state.player.y = state.car.y + Math.cos(a) * 40;
    state.player.angle = a;
    state.car = null;
    state.autoDrive = null;
    return;
  }
  const car = nearestCar(70);
  if (!car) return;
  if (car.parked || car.stealTarget) {
    state.police.addHeat(12, state); // stealing a car is a crime
    sound.sirenBurst();
  }
  car.parked = false; car.traffic = false;
  state.cars = state.cars.filter((c) => c !== car);
  state.car = car; state.inCar = true; state.carDamage = 0;
  sound.pickup();
  state.missions.offerFare(state);
}
function toggleAutoDrive() {
  if (!state.inCar) return;
  if (state.autoDrive) { state.autoDrive = null; return; }
  const target = state.missions.targetPos();
  if (!target) return;
  const path = graphPath(state.world, state.car, target);
  state.autoDrive = { path, idx: 0, target };
  state.missions.showBanner('AUTOPILOT ENGAGED', 'Following the road graph to the gold marker. Press G to take over.', 3);
}

// ---- combat ----
function shoot() {
  const p = state.player;
  const cam = renderer.camera;
  const wx = state.mouse.x + cam.x, wy = state.mouse.y + cam.y;
  const a = angleTo(p.x, p.y, wx, wy);
  p.angle = a;
  state.bullets.push({ x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, life: 0.6 });
  sound.shoot();
  state.police.addHeat(6, state);
  for (const ped of state.peds) if (dist(ped.x, ped.y, p.x, p.y) < 260) ped.panic = 3;
}
function punch() {
  const p = state.player;
  for (const ped of state.peds) {
    if (dist(ped.x, ped.y, p.x, p.y) < 40) { ped.panic = 4; spawnParticles(ped.x, ped.y, '#fff', 8); }
  }
  for (const cop of state.police.cops) {
    if (dist(cop.x, cop.y, p.x, p.y) < 44) { cop.hp -= PLAYER.punchDamage; state.police.addHeat(8, state); }
  }
  state.police.cops = state.police.cops.filter((c) => c.hp > 0);
}
function spawnParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160;
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, max: 0.5, r: 3 + Math.random() * 3, color });
  }
}

// ---- per-frame updates ----
function updatePlayer(dt) {
  const p = state.player;
  const k = state.keys;
  if (state.inCar) return;
  const sp = k.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  let dx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
  let dy = (k.down ? 1 : 0) - (k.up ? 1 : 0);
  if (dx || dy) {
    const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    p.angle = Math.atan2(dy, dx);
    const nx = p.x + dx * sp * dt, ny = p.y + dy * sp * dt;
    const hit = collideBuildings(state.world, nx, ny, PLAYER.radius);
    const pos = clampToCity(hit ? hit.x : nx, hit ? hit.y : ny);
    p.x = pos.x; p.y = pos.y;
  }
}
function updateCar(dt) {
  if (!state.inCar || !state.car) return;
  const car = state.car, m = car.model, k = state.keys;
  // Autopilot follows the road graph to the mission / fare marker.
  if (state.autoDrive) {
    const path = state.autoDrive.path;
    const wp = path[Math.min(state.autoDrive.idx, path.length - 1)];
    const wd = dist(car.x, car.y, wp.x, wp.y);
    if (wd < 70) state.autoDrive.idx++;
    if (state.autoDrive.idx >= path.length) { state.autoDrive = null; }
    else {
      const want = angleTo(car.x, car.y, wp.x, wp.y);
      let diff = want - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
      car.speed += (m.topSpeed * 0.75 - car.speed) * Math.min(1, dt * 1.5);
    }
  } else {
    const accel = k.up ? m.accel : k.down ? -m.accel * 0.8 : 0;
    car.speed += accel * dt;
    car.speed *= Math.pow(0.4, dt); // drag
    if (k.brake) car.speed *= Math.pow(0.05, dt);
    car.speed = clamp(car.speed, -m.topSpeed * 0.35, m.topSpeed);
    const steer = ((k.left ? 1 : 0) - (k.right ? 1 : 0)) * (car.speed >= 0 ? -1 : 1);
    car.angle += steer * m.grip * dt * Math.min(1, Math.abs(car.speed) / 120);
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Car is a circle (radius ~ length/2.4) against each building's two circles.
  const hit = collideBuildings(state.world, nx, ny, m.length / 2.4);
  if (hit) {
    if (Math.abs(car.speed) > 200) { sound.crash(); spawnParticles(nx, ny, '#ffb347', 10); state.carDamage = clamp(state.carDamage + 8, 0, 100); }
    car.speed *= -0.25;
    car.x = hit.x; car.y = hit.y;
  } else {
    const pos = clampToCity(nx, ny);
    car.x = pos.x; car.y = pos.y;
  }
  state.player.x = car.x; state.player.y = car.y;
  state.player.angle = car.angle;
  sound.engineStart(Math.abs(car.speed) / m.topSpeed);
  if (state.carDamage >= 100) {
    spawnParticles(car.x, car.y, '#ff5533', 24);
    state.cars.push({ ...car, parked: true, traffic: false });
    state.inCar = false; state.car = null; state.carDamage = 0;
    state.missions.showBanner('CAR WRECKED', 'The car gave up. Find another ride.', 3);
  }
}
function updateTraffic(dt) {
  for (const car of state.cars) {
    if (!car.traffic) continue;
    if (!car.target) {
      const node = state.world.nodes[car.node];
      car.target = state.world.nodes[state.world.adj[car.node][Math.floor(Math.random() * state.world.adj[car.node].length)]];
    }
    const t = car.target;
    const want = angleTo(car.x, car.y, t.x, t.y);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += clamp(diff, -2.2 * dt, 2.2 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (dist(car.x, car.y, t.x, t.y) < 50) {
      car.node = nearestNode(state.world, t.x, t.y);
      car.target = null;
    }
    // Bump the player if they stand in the road.
    if (!state.inCar && dist(car.x, car.y, state.player.x, state.player.y) < 34) {
      state.player.health -= 30 * dt;
      state.player.x += Math.cos(car.angle) * 60 * dt;
      state.player.y += Math.sin(car.angle) * 60 * dt;
    }
  }
}
function updatePeds(dt) {
  for (const ped of state.peds) {
    ped.wander -= dt;
    if (ped.panic > 0) {
      ped.panic -= dt;
      const a = angleTo(state.player.x, state.player.y, ped.x, ped.y);
      ped.x += Math.cos(a) * 170 * dt; ped.y += Math.sin(a) * 170 * dt;
    } else {
      if (ped.wander <= 0) { ped.wander = 2 + Math.random() * 4; ped.angle = Math.random() * Math.PI * 2; }
      const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
      const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
      const hit = collideBuildings(state.world, nx, ny, 11);
      const pos = clampToCity(hit ? hit.x : nx, hit ? hit.y : ny);
      ped.x = pos.x; ped.y = pos.y;
    }
    // A car hitting a pedestrian is a crime — and a tragedy.
    if (state.inCar && state.car && dist(ped.x, ped.y, state.player.x, state.player.y) < 36) {
      ped.panic = 4;
      state.police.addHeat(10, state);
      spawnParticles(ped.x, ped.y, '#ff6666', 10);
      ped.x += (ped.x - state.player.x) * 0.2; ped.y += (ped.y - state.player.y) * 0.2;
    }
  }
}
function updateBullets(dt) {
  for (const b of state.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    for (const cop of state.police.cops) {
      if (dist(b.x, b.y, cop.x, cop.y) < 18) { cop.hp -= PLAYER.bulletDamage; b.life = 0; spawnParticles(b.x, b.y, '#ff6666', 8); }
    }
    for (const car of state.police.cars) {
      if (dist(b.x, b.y, car.x, car.y) < 30) { b.life = 0; spawnParticles(b.x, b.y, '#ffd24d', 6); }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
  state.police.cops = state.police.cops.filter((c) => c.hp > 0);
  for (const pt of state.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; }
  state.particles = state.particles.filter((pt) => pt.life > 0);
}

function update(dt) {
  state.playTime += dt;
  state.clock = (9 + state.playTime / 60) % 24; // a full day every 24 play-minutes
  state.night = state.clock < 6 || state.clock >= 19 ? 1 : state.clock >= 17 ? (state.clock - 17) / 2 : state.clock < 8 ? (8 - state.clock) / 2 : 0;
  state.missions.ensureStealCar(state);
  updatePlayer(dt);
  updateCar(dt);
  updateTraffic(dt);
  updatePeds(dt);
  updateBullets(dt);
  state.police.update(dt, state);
  const earned = state.missions.update(state);
  if (earned) state.cash += earned;
  if (state.player.health <= 0) { state.phase = 'dead'; sound.busted(); }
  if (state.busted) { state.busted = false; state.phase = 'busted'; state.police.resetAfterBust(state); sound.busted(); }
  if (state.phase === 'play') renderer.follow(state.player.x, state.player.y);
  // Autosave every 5 seconds.
  state.saveTimer += dt;
  if (state.saveTimer > 5) { state.saveTimer = 0; saveGame(); }
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.cash, mission: state.missions.save(), police: state.police.save(),
      player: { x: state.player.x, y: state.player.y, health: state.player.health },
    }));
  } catch (_) { /* storage unavailable — the game still plays */ }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    state.cash = s.cash || 100;
    state.missions.load(s.mission);
    state.police.load(s.police);
    if (s.player) { state.player.x = s.player.x; state.player.y = s.player.y; state.player.health = s.player.health || 100; }
    return true;
  } catch (_) { return false; }
}

// ---- frame loop ----
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.phase === 'play') update(dt);
  renderer.draw(state);
  requestAnimationFrame(frame);
}

// ---- screenshot staging hooks (debug only; the game renders itself) ----
// ?shot=chase | drive | foot | night — each drops Riko into a live scene.
function applyShotPreset() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return;
  loadGame();
  state.phase = 'play';
  const p = state.player;
  if (shot === 'chase') {
    state.cash = 2450;
    state.missions.index = 1;
    p.x = 1500; p.y = 1300; p.angle = 0;
    const falcon = CAR_MODELS[2];
    state.car = { model: falcon, x: 1500, y: 1300, angle: 0, speed: 320, color: falcon.color, traffic: false, parked: false };
    state.inCar = true;
    state.police.heat = 55; state.police.wanted = 3;
    state.police.cars.push(
      { model: { id: 'interceptor', name: 'Interceptor', color: '#1c2733', length: 66, width: 30, topSpeed: 560, accel: 420, grip: 2.9 }, x: 1380, y: 1240, angle: 0.2, speed: 380, color: '#1c2733', traffic: false, police: true, siren: true, path: null, pathIdx: 0, stuck: 0 },
      { model: { id: 'interceptor', name: 'Interceptor', color: '#1c2733', length: 66, width: 30, topSpeed: 560, accel: 420, grip: 2.9 }, x: 1620, y: 1420, angle: -0.3, speed: 360, color: '#1c2733', traffic: false, police: true, siren: true, path: null, pathIdx: 0, stuck: 0 },
    );
    state.missions.showBanner('MISSION 2 — THE GOLD MILE DROP', 'Deliver the package to the Gold Mile penthouse garage.', 1.2);
  } else if (shot === 'drive') {
    state.cash = 1250;
    p.x = 2100; p.y = 800; p.angle = 0;
    const sedan = CAR_MODELS[0];
    state.car = { model: sedan, x: 2100, y: 800, angle: 0, speed: 260, color: sedan.color, traffic: false, parked: false };
    state.inCar = true;
    state.missions.showBanner('MISSION 1 — FIRST PICKUP', 'Get the package from the Old Port warehouse.', 1.2);
  } else if (shot === 'foot') {
    state.cash = 400;
    p.x = 520; p.y = 520; p.angle = Math.PI / 4;
    state.missions.showBanner('MISSION 1 — FIRST PICKUP', 'On foot in the Old Port — the warehouse marker is ahead.', 1.2);
  } else if (shot === 'night') {
    state.cash = 3100;
    state.clock = 21.5; state.playTime = (21.5 - 9) * 60; state.night = 1;
    p.x = 2700; p.y = 1800; p.angle = Math.PI;
    const cab = CAR_MODELS[3];
    state.car = { model: cab, x: 2700, y: 1800, angle: Math.PI, speed: 180, color: cab.color, traffic: false, parked: false };
    state.inCar = true;
    state.missions.taxi = { to: { x: 900, y: 2300 }, pay: 150, passenger: true };
    state.missions.showBanner('TAXI FARE  +$150', 'Passenger aboard — drop them at the gold marker.', 1.2);
  }
  renderer.follow(p.x, p.y);
}

// Debug handle for play-testing: move Riko, read state, finish objectives.
window.__velmara = {
  state,
  start: startGame,
  teleport(x, y) { state.player.x = x; state.player.y = y; if (state.inCar && state.car) { state.car.x = x; state.car.y = y; } renderer.follow(x, y); },
  giveCar(modelId) {
    const m = CAR_MODELS.find((c) => c.id === modelId) || CAR_MODELS[0];
    state.car = { model: m, x: state.player.x, y: state.player.y, angle: 0, speed: 0, color: m.color, traffic: false, parked: false };
    state.inCar = true;
  },
  mission() { return { index: state.missions.index, cash: state.cash, wanted: state.police.wanted, objective: state.missions.objectiveText() }; },
};

applyShotPreset();
if (state.phase === 'title') loadGame();
requestAnimationFrame(frame);
