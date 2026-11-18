// VELMARA — missions.js: the story chain and the taxi side-job.
// One job: five chained missions from Mara Voss and Dante Cole, plus
// taxi fares. A mission completes when the player reaches its marker
// (in the right car for the steal job). Rewards pay cash and advance
// the story; finishing all five crowns Riko king of Velmara.

import { MISSION_DEFS, TAXI_FARES, dist, clamp } from './config.js';

export class MissionLog {
  constructor() {
    this.index = 0; // 0-based into MISSION_DEFS; 5 = all done
    this.completed = [];
    this.taxi = null; // active fare {to, pay, passenger}
    this.taxiDone = 0;
    this.banner = null; // {text, sub, until}
    this.stealCar = null; // the Falcon S the player must steal (mission 3)
  }
  current() { return MISSION_DEFS[this.index] || null; }
  get done() { return this.index >= MISSION_DEFS.length; }
  objectiveText() {
    if (this.done) return 'All missions complete — Velmara is yours, Riko!';
    const m = this.current();
    if (this.taxi) return 'TAXI: drop your passenger at the gold marker — $' + this.taxi.pay;
    return 'MISSION ' + m.id + '/5 — ' + m.title + ': ' + m.brief;
  }
  targetPos() {
    if (this.taxi) return this.taxi.to;
    const m = this.current();
    return m ? m.target : null;
  }
  showBanner(text, sub, seconds) {
    this.banner = { text, sub: sub || '', until: performance.now() / 1000 + (seconds || 3.5) };
  }
  // Called every frame; returns earned cash (0 if nothing completed).
  update(state) {
    const now = performance.now() / 1000;
    if (this.banner && now > this.banner.until) this.banner = null;
    const p = state.player;
    // Taxi fare completes at its destination while the passenger rides.
    if (this.taxi) {
      const d = dist(p.x, p.y, this.taxi.to.x, this.taxi.to.y);
      if (d < 70 && state.inCar) {
        const pay = this.taxi.pay;
        this.taxiDone++;
        this.taxi = null;
        this.showBanner('FARE COMPLETE  +$' + pay, 'The passenger tips their hat. Another fare is waiting.', 3);
        state.sound.cash();
        return pay;
      }
      return 0;
    }
    const m = this.current();
    if (!m) return 0;
    const d = dist(p.x, p.y, m.target.x, m.target.y);
    if (m.kind === 'steal') {
      // Mission 3: must arrive IN the stolen Falcon S.
      if (d < 80 && state.inCar && state.car && state.car.model.id === 'falcon') return this.complete(state, m);
      return 0;
    }
    if (d < 70) return this.complete(state, m);
    return 0;
  }
  complete(state, m) {
    this.completed.push(m.id);
    this.index++;
    this.showBanner('MISSION COMPLETE  +$' + m.pay, m.done, 4);
    state.sound.missionDone();
    if (this.done) this.showBanner('STREETS OF GOLD — YOU WIN', 'Riko Vale owns Velmara. $1,500 richer, legend made.', 6);
    return m.pay;
  }
  // Start the nearest waiting fare when the player is in a cab.
  offerFare(state) {
    if (this.taxi || !state.inCar || state.car.model.id !== 'cab') return false;
    const p = state.player;
    let best = null, bd = 1e18;
    for (const f of TAXI_FARES) {
      const d = dist(p.x, p.y, f.from.x, f.from.y);
      if (d < bd) { bd = d; best = f; }
    }
    if (best && bd < 200) {
      this.taxi = { to: best.to, pay: best.pay, passenger: true };
      this.showBanner('TAXI FARE  +$' + best.pay, 'Passenger aboard — drive to the gold marker.', 3);
      state.sound.pickup();
      return true;
    }
    return false;
  }
  // Mission 3 needs a Falcon S parked in Sunset Hills.
  ensureStealCar(state) {
    const m = this.current();
    if (!m || m.id !== 3 || this.stealCar) return;
    const falcon = { id: 'falcon', name: 'Falcon S', color: '#f2a71b', length: 60, width: 28, topSpeed: 580, accel: 430, grip: 2.7 };
    this.stealCar = { model: falcon, x: 3050, y: 450, angle: 0, speed: 0, color: '#f2a71b', traffic: false, parked: true, stealTarget: true };
    state.cars.push(this.stealCar);
    this.showBanner('STEAL THE FALCON S', 'A gold Falcon S waits in Sunset Hills. Take it — quietly.', 4);
  }
  save() { return { index: this.index, completed: this.completed, taxiDone: this.taxiDone }; }
  load(s) { if (!s) return; this.index = s.index || 0; this.completed = s.completed || []; this.taxiDone = s.taxiDone || 0; }
}
