// VELMARA: Streets of Gold — game configuration and tuning.
// One job: every number, name and colour the rest of the game shares.

export const CITY = { width: 3600, height: 2600 };
export const VIEW = { width: 1280, height: 720 };
export const ROAD_WIDTH = 120;
export const AVENUES = [300, 900, 1500, 2100, 2700, 3300];
export const STREETS = [300, 800, 1300, 1800, 2300];
export const SAVE_KEY = 'velmara-save-v1';

export const PLAYER = {
  name: 'Riko Vale',
  radius: 14,
  walkSpeed: 210,
  runSpeed: 300,
  health: 100,
  punchDamage: 12,
  bulletDamage: 34,
};

export const CAR_MODELS = [
  { id: 'comet', name: 'Comet Sedan', color: '#3f7fd0', length: 64, width: 30, topSpeed: 430, accel: 300, grip: 3.4 },
  { id: 'aurora', name: 'Aurora GT', color: '#d03f5e', length: 62, width: 28, topSpeed: 520, accel: 380, grip: 3.0 },
  { id: 'falcon', name: 'Falcon S', color: '#f2a71b', length: 60, width: 28, topSpeed: 580, accel: 430, grip: 2.7 },
  { id: 'cab', name: 'City Cab', color: '#f5c518', length: 64, width: 30, topSpeed: 400, accel: 280, grip: 3.6 },
  { id: 'hauler', name: 'Hauler Van', color: '#7a8a99', length: 78, width: 34, topSpeed: 340, accel: 220, grip: 4.0 },
  { id: 'luxor', name: 'Luxor Coupe', color: '#8e44ad', length: 62, width: 28, topSpeed: 500, accel: 360, grip: 3.1 },
];
export const POLICE_MODEL = { id: 'interceptor', name: 'Interceptor', color: '#1c2733', length: 66, width: 30, topSpeed: 560, accel: 420, grip: 2.9 };

export const DISTRICTS = [
  { name: 'Old Port', x: 0, y: 0, w: 620, h: 620, ground: '#c9b183', label: 'PORT' },
  { name: 'Marina Bay', x: 620, y: 0, w: 1100, h: 620, ground: '#8fb8a8', label: 'MARINA' },
  { name: 'Gold Mile', x: 1720, y: 0, w: 1100, h: 620, ground: '#d8c49a', label: 'GOLD MILE' },
  { name: 'Sunset Hills', x: 2820, y: 0, w: 780, h: 620, ground: '#a8c68f', label: 'HILLS' },
  { name: 'Downtown', x: 0, y: 620, w: 1720, h: 1000, ground: '#b7b3a4', label: 'DOWNTOWN' },
  { name: 'Little Havana Row', x: 1720, y: 620, w: 1880, h: 1000, ground: '#cbb59a', label: 'HAVANA ROW' },
  { name: 'South Docks', x: 0, y: 1620, w: 1720, h: 980, ground: '#9fb0bd', label: 'DOCKS' },
  { name: 'Palm Court', x: 1720, y: 1620, w: 1880, h: 980, ground: '#c2d6a4', label: 'PALM COURT' },
];

export const MISSION_DEFS = [
  { id: 1, title: 'First Pickup', giver: 'Mara Voss', pay: 400,
    brief: 'Mara needs a package from the Old Port warehouse. Get there — on foot or in a car.',
    target: { x: 420, y: 430 }, kind: 'goto',
    done: 'Package secured. Mara trusts you now.' },
  { id: 2, title: 'The Gold Mile Drop', giver: 'Mara Voss', pay: 600,
    brief: 'Deliver the package to the Gold Mile penthouse garage. The streets are watching.',
    target: { x: 2400, y: 430 }, kind: 'goto',
    done: 'Delivery made. Word travels fast in Velmara.' },
  { id: 3, title: 'Wheels for the Crew', giver: 'Dante Cole', pay: 800,
    brief: 'Dante needs a fast car. Steal a Falcon S from Sunset Hills and bring it to the garage.',
    target: { x: 3050, y: 450 }, kind: 'steal',
    done: 'Falcon S delivered. Dante owes you one.' },
  { id: 4, title: 'Heat on the Docks', giver: 'Dante Cole', pay: 1000,
    brief: 'The docks are crawling with patrols. Reach the South Docks container yard and shake the heat.',
    target: { x: 700, y: 2150 }, kind: 'goto',
    done: 'You slipped the net. The crew is impressed.' },
  { id: 5, title: 'Streets of Gold', giver: 'Mara Voss', pay: 1500,
    brief: 'One last run: cross the whole city to Palm Court and claim the gold. Finish it, Riko.',
    target: { x: 3150, y: 2200 }, kind: 'goto',
    done: 'The gold is yours. Velmara remembers the name Riko Vale.' },
];

export const TAXI_FARES = [
  { from: { x: 900, y: 800 }, to: { x: 2700, y: 1800 }, pay: 120 },
  { from: { x: 2100, y: 300 }, to: { x: 900, y: 2300 }, pay: 150 },
  { from: { x: 1500, y: 1300 }, to: { x: 3300, y: 800 }, pay: 110 },
  { from: { x: 300, y: 1800 }, to: { x: 2100, y: 2300 }, pay: 130 },
];

export const COLORS = {
  grass: '#7da65c', road: '#3a3f46', roadLine: '#e8d44d', sidewalk: '#9aa0a3',
  buildingRoof: ['#b5654a', '#4a6b8a', '#8a6b4a', '#5d7a52', '#7a4a6b', '#a89a6a'],
  water: '#3f8fbf', sand: '#e0c98f', night: 'rgba(8,12,40,0.42)',
  player: '#e74c3c', police: '#1c2733', ped: ['#f1c40f', '#2ecc71', '#e67e22', '#9b59b6', '#1abc9c'],
};

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
// Deterministic seeded random so the city looks the same every run.
export function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
