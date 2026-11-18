// VELMARA — police.js: the wanted system and the Velmara PD.
// One job: wanted stars 0-5, patrol cars and foot cops that respond to
// them, chases, busts, and the heat cooling off when the player hides.

import { POLICE_MODEL, dist, clamp } from './config.js';
import { graphPath, nearestNode, onRoad } from './world.js';

export class PoliceForce {
  constructor(world) {
    this.world = world;
    this.wanted = 0;
    this.cars = [];
    this.cops = [];
    this.heat = 0; // 0-100, decays when the player is unseen
    this.coolTimer = 0;
    this.bustTimer = 0;
    this.spawnTimer = 0;
  }
  addHeat(n, state) {
    this.heat = clamp(this.heat + n, 0, 100);
    const stars = this.heat < 8 ? 0 : this.heat < 25 ? 1 : this.heat < 45 ? 2 : this.heat < 65 ? 3 : this.heat < 85 ? 4 : 5;
    if (stars > this.wanted) {
      this.wanted = stars;
      if (state && state.sound) state.sound.sirenBurst();
    }
  }
  wantedCount() { return this.cars.length + this.cops.length; }
  desiredUnits() { return this.wanted === 0 ? 0 : this.wanted * 2; }
  spawnUnit(state) {
    const p = state.player;
    const angle = Math.random() * Math.PI * 2;
    const r = 700 + Math.random() * 300;
    const x = clamp(p.x + Math.cos(angle) * r, 60, 3540);
    const y = clamp(p.y + Math.sin(angle) * r, 60, 2540);
    if (this.wanted >= 2 || this.cars.length < 2) {
      this.cars.push({ model: POLICE_MODEL, x, y, angle: Math.atan2(p.y - y, p.x - x), speed: 0,
        color: '#1c2733', traffic: false, police: true, siren: true, path: null, pathIdx: 0, stuck: 0 });
    } else {
      this.cops.push({ x, y, angle: Math.atan2(p.y - y, p.x - x), speed: 0, color: '#24344d', foot: true, hp: 30 });
    }
  }
  update(dt, state) {
    const p = state.player;
    // Heat cools when no crime is happening and the player is out of sight.
    this.coolTimer -= dt;
    if (this.coolTimer <= 0) {
      this.coolTimer = 1;
      const nearCop = this.cars.some((c) => dist(c.x, c.y, p.x, p.y) < 500) || this.cops.some((c) => dist(c.x, c.y, p.x, p.y) < 300);
      if (!nearCop && this.heat > 0) this.heat = Math.max(0, this.heat - 4);
      if (this.heat < 8) this.wanted = 0;
      else if (this.heat < 25) this.wanted = Math.min(this.wanted, 1);
    }
    // Spawn / despawn to match the wanted level.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 0.8;
      if (this.wantedCount() < this.desiredUnits()) this.spawnUnit(state);
      if (this.wanted === 0) {
        this.cars = this.cars.filter((c) => dist(c.x, c.y, p.x, p.y) < 900);
        this.cops = this.cops.filter((c) => dist(c.x, c.y, p.x, p.y) < 600);
      }
    }
    // Police cars chase: follow the road graph toward the player, then ram.
    for (const car of this.cars) {
      const d = dist(car.x, car.y, p.x, p.y);
      if (d > 1400) { car.path = null; continue; }
      if (!car.path || car.pathIdx >= car.path.length || Math.random() < 0.01) {
        car.path = graphPath(this.world, car, p);
        car.pathIdx = 0;
      }
      const wp = car.path[Math.min(car.pathIdx, car.path.length - 1)];
      const wd = dist(car.x, car.y, wp.x, wp.y);
      if (wd < 60) car.pathIdx++;
      const want = Math.atan2(wp.y - car.y, wp.x - car.x);
      let diff = want - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += clamp(diff, -2.6 * dt, 2.6 * dt);
      const target = d < 260 ? 560 : 470;
      car.speed += (target - car.speed) * Math.min(1, dt * 1.2);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      // Ramming the player hurts and spikes the heat.
      if (d < 46) {
        if (state.inCar) { state.carDamage = clamp((state.carDamage || 0) + 18 * dt, 0, 100); }
        else { p.health -= 22 * dt; }
        if (Math.random() < dt * 2) state.sound.crash();
      }
    }
    // Foot cops run at the player and try to bust them.
    for (const cop of this.cops) {
      const d = dist(cop.x, cop.y, p.x, p.y);
      const a = Math.atan2(p.y - cop.y, p.x - cop.x);
      cop.angle = a;
      const sp = d < 200 ? 190 : 150;
      cop.x += Math.cos(a) * sp * dt;
      cop.y += Math.sin(a) * sp * dt;
      if (d < 34 && !state.inCar) {
        this.bustTimer += dt;
        if (this.bustTimer > 1.6) { state.busted = true; this.bustTimer = 0; }
      } else this.bustTimer = Math.max(0, this.bustTimer - dt);
    }
  }
  resetAfterBust(state) {
    this.wanted = 0; this.heat = 0; this.cars = []; this.cops = [];
    state.cash = Math.max(0, state.cash - 200);
    state.player.health = 100;
  }
  save() { return { wanted: this.wanted, heat: this.heat }; }
  load(s) { if (!s) return; this.wanted = s.wanted || 0; this.heat = s.heat || 0; }
}
