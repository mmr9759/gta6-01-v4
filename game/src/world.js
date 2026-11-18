// VELMARA — world.js: the city itself.
// One job: build Velmara's roads, road graph, buildings and spawn points,
// and answer collision questions. Collision is circle-vs-circle: every
// building is approximated by TWO circles along its long axis, and the
// player / cars are circles too — cheap, stable, no corner snagging.

import { CITY, AVENUES, STREETS, ROAD_WIDTH, DISTRICTS, CAR_MODELS, mulberry32, clamp } from './config.js';

export function buildWorld() {
  const rand = mulberry32(20261118);
  const buildings = [];
  const trees = [];
  const parks = [];
  // Buildings fill every block between two avenues and two streets.
  for (let ax = 0; ax < AVENUES.length - 1; ax++) {
    for (let sy = 0; sy < STREETS.length - 1; sy++) {
      const x0 = AVENUES[ax] + ROAD_WIDTH / 2 + 24;
      const x1 = AVENUES[ax + 1] - ROAD_WIDTH / 2 - 24;
      const y0 = STREETS[sy] + ROAD_WIDTH / 2 + 24;
      const y1 = STREETS[sy + 1] - ROAD_WIDTH / 2 - 24;
      const bw = x1 - x0, bh = y1 - y0;
      if (bw < 120 || bh < 120) continue;
      // One park per few blocks, the rest 2-4 buildings.
      if (rand() < 0.16) {
        parks.push({ x: x0, y: y0, w: bw, h: bh });
        for (let t = 0; t < 8; t++) trees.push({ x: x0 + 30 + rand() * (bw - 60), y: y0 + 30 + rand() * (bh - 60), r: 10 + rand() * 8 });
        continue;
      }
      const n = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const bx = x0 + rand() * (bw - 130);
        const by = y0 + rand() * (bh - 110);
        const w = 90 + rand() * 90, h = 80 + rand() * 90;
        const b = { x: bx, y: by, w, h, hue: Math.floor(rand() * 6), height: 1 + Math.floor(rand() * 3) };
        b.circles = buildingCircles(b); // two circles along the long axis
        buildings.push(b);
      }
      for (let t = 0; t < 3; t++) trees.push({ x: x0 + rand() * bw, y: y0 + rand() * bh, r: 9 + rand() * 7 });
    }
  }
  // Road graph: a node at every avenue x street crossing, edges along roads.
  const nodes = [];
  const nodeId = {};
  for (const y of STREETS) for (const x of AVENUES) {
    nodeId[x + ',' + y] = nodes.length;
    nodes.push({ x, y });
  }
  const edges = [];
  for (const y of STREETS) for (let i = 0; i < AVENUES.length - 1; i++) edges.push([nodeId[AVENUES[i] + ',' + y], nodeId[AVENUES[i + 1] + ',' + y]]);
  for (const x of AVENUES) for (let i = 0; i < STREETS.length - 1; i++) edges.push([nodeId[x + ',' + STREETS[i]], nodeId[x + ',' + STREETS[i + 1]]]);
  const adj = nodes.map(() => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }

  // Parking spots sit on the road CENTRE line (lesson from v3: never at the kerb).
  const parking = [];
  for (const x of AVENUES) for (const y of STREETS) {
    parking.push({ x: x, y: y + 170, angle: Math.PI / 2 });
    parking.push({ x: x + 170, y, angle: 0 });
  }
  return { buildings, trees, parks, nodes, adj, parking, districts: DISTRICTS };
}

// Two circles along the long axis cover a rectangle far better than one.
export function buildingCircles(b) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  if (b.w >= b.h) {
    const r = Math.hypot(b.w / 4, b.h / 2) * 0.92;
    return [{ x: cx - b.w / 4, y: cy, r }, { x: cx + b.w / 4, y: cy, r }];
  }
  const r = Math.hypot(b.w / 2, b.h / 4) * 0.92;
  return [{ x: cx, y: cy - b.h / 4, r }, { x: cx, y: cy + b.h / 4, r }];
}

export function nearestRoadPoint(x, y) {
  let best = null, bd = 1e18;
  for (const ax of AVENUES) for (const sy of STREETS) {
    const d = Math.hypot(x - ax, y - sy);
    if (d < bd) { bd = d; best = { x: ax, y: sy }; }
  }
  return best;
}
export function nearestNode(world, x, y) {
  let bi = 0, bd = 1e18;
  world.nodes.forEach((n, i) => { const d = Math.hypot(x - n.x, y - n.y); if (d < bd) { bd = d; bi = i; } });
  return bi;
}
// BFS over the road graph — the auto-drive and the traffic both follow it.
export function graphPath(world, from, to) {
  const start = nearestNode(world, from.x, from.y);
  const goal = nearestNode(world, to.x, to.y);
  const prev = new Array(world.nodes.length).fill(-1);
  const q = [start]; prev[start] = start;
  while (q.length) {
    const cur = q.shift();
    if (cur === goal) break;
    for (const nb of world.adj[cur]) if (prev[nb] === -1) { prev[nb] = cur; q.push(nb); }
  }
  if (prev[goal] === -1) return [world.nodes[goal]];
  const path = [];
  let cur = goal;
  while (cur !== start) { path.unshift(world.nodes[cur]); cur = prev[cur]; }
  path.unshift(world.nodes[start]);
  return path;
}

export function onRoad(x, y) {
  const onAvenue = AVENUES.some((ax) => Math.abs(x - ax) < ROAD_WIDTH / 2);
  const onStreet = STREETS.some((sy) => Math.abs(y - sy) < ROAD_WIDTH / 2);
  return onAvenue || onStreet;
}

// Circle-vs-circle collision against every building's two circles.
// Returns the push-out correction {x, y} to apply, or null.
export function collideBuildings(world, x, y, r) {
  let px = x, py = y, hit = false;
  for (const b of world.buildings) {
    // Cheap AABB reject first.
    if (x < b.x - r || x > b.x + b.w + r || y < b.y - r || y > b.y + b.h + r) continue;
    for (const c of b.circles) {
      const dx = px - c.x, dy = py - c.y;
      const d = Math.hypot(dx, dy), min = c.r + r;
      if (d < min && d > 0.001) {
        px = c.x + (dx / d) * min; py = c.y + (dy / d) * min; hit = true;
      } else if (d <= 0.001) { px = c.x + min; hit = true; }
    }
  }
  return hit ? { x: px, y: py } : null;
}

export function clampToCity(x, y) {
  return { x: clamp(x, 40, CITY.width - 40), y: clamp(y, 40, CITY.height - 40) };
}

export function spawnTraffic(world, rand, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const model = CAR_MODELS[Math.floor(rand() * CAR_MODELS.length)];
    const avenue = AVENUES[Math.floor(rand() * AVENUES.length)];
    const street = STREETS[Math.floor(rand() * STREETS.length)];
    const alongAvenue = rand() < 0.5;
    const x = alongAvenue ? avenue + (rand() < 0.5 ? -28 : 28) : avenue + (rand() - 0.5) * 500;
    const y = alongAvenue ? street + (rand() - 0.5) * 500 : street + (rand() < 0.5 ? -28 : 28);
    cars.push({ model, x, y, angle: alongAvenue ? (rand() < 0.5 ? -Math.PI / 2 : Math.PI / 2) : (rand() < 0.5 ? 0 : Math.PI),
      speed: 120 + rand() * 80, color: model.color, traffic: true, node: nearestNode(world, x, y), target: null, parked: false });
  }
  return cars;
}

export function spawnParkedCars(world, rand) {
  const cars = [];
  const spots = [...world.parking];
  for (let i = 0; i < 14 && spots.length; i++) {
    const idx = Math.floor(rand() * spots.length);
    const spot = spots.splice(idx, 1)[0];
    const model = CAR_MODELS[Math.floor(rand() * CAR_MODELS.length)];
    cars.push({ model, x: spot.x, y: spot.y, angle: spot.angle, speed: 0, color: model.color, traffic: false, parked: true });
  }
  return cars;
}

export function spawnPedestrians(world, rand, count) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const x = 200 + rand() * (CITY.width - 400);
    const y = 200 + rand() * (CITY.height - 400);
    peds.push({ x, y, angle: rand() * Math.PI * 2, speed: 40 + rand() * 40, color: ['#f1c40f', '#2ecc71', '#e67e22', '#9b59b6', '#1abc9c'][i % 5],
      wander: rand() * 10, panic: 0 });
  }
  return peds;
}
