// Every mutating gameplay system. This module is deliberately headless: it
// changes domain state and emits semantic events, but never touches the DOM,
// visual effects, audio, or clocks.
import { hexDist, neighbor, angleBetween, argmin, range, DIR_ANGLE, key, incomingArc } from "./hexmath.js";
import { RANGE, MP_MAX, HOLD_FORMS, MoraleState, inBounds } from "./config.js";
import { BattleEvent } from "./core/events.js";
import * as C from "./components.js";
import * as Q from "./queries.js";

const { STEADY, SHAKEN, ROUTED } = MoraleState;
const setPos = (state, e, pos) => { const p = state.world.get(e, C.Position); p.c = pos[0]; p.r = pos[1]; };

/* ---- morale ---- */
export function moraleCheck(state, e, fromFR) {
  if (!Q.isAlive(state, e) || Q.moraleOf(state, e) === ROUTED) return;
  const pos = Q.posOf(state, e), side = Q.sideOf(state, e);
  let mod = 0, why = [];
  if (Q.friendsOf(state, e).some(v => Q.moraleOf(state, v) === STEADY && hexDist(pos, Q.posOf(state, v)) === 1)) { mod++; why.push("+1 support"); }
  if (Q.inCommand(state, e)) { mod++; why.push("+1 command"); }
  if (fromFR) { mod--; why.push("−1 flanked"); }
  if (state.G.fleets[side].supply !== "ok") { mod--; why.push("−1 supply"); }
  if (state.G.fleets[side].flagLost) { mod--; why.push("−1 flagship"); }
  const roll = state.random.d6(), tot = roll + mod, pass = tot >= 4;
  state.events.emit(BattleEvent.MORALE_CHECKED, {
    unit: e, label: Q.labelOf(state, e), roll, modifier: mod,
    modifiers: why, total: tot, passed: pass,
  });
  if (pass) return true;
  const morale = state.world.get(e, C.Morale);
  if (morale.state === STEADY) { morale.state = SHAKEN; }
  else {
    morale.state = ROUTED;
    state.world.get(e, C.Facing).dir = side === 0 ? 3 : 0;
    state.events.emit(BattleEvent.UNIT_ROUTED, { unit: e, label: Q.labelOf(state, e), side });
    contagion(state, e);
  }
  return false;
}
export function contagion(state, src) {
  for (const v of Q.friendsOf(state, src).slice())
    if (Q.isAlive(state, v) && Q.moraleOf(state, v) !== ROUTED && hexDist(Q.posOf(state, v), Q.posOf(state, src)) <= 2)
      moraleCheck(state, v, false);
}
export function destroy(state, e) {
  state.world.remove(e, C.Alive);
  const wasFlag = Q.isFlagship(state, e), side = Q.sideOf(state, e);
  state.events.emit(BattleEvent.UNIT_DESTROYED, {
    unit: e, label: Q.labelOf(state, e), side, wasFlagship: wasFlag,
  });
  contagion(state, e);
  if (wasFlag) {
    state.G.fleets[side].flagLost = true;
    state.events.emit(BattleEvent.FLAGSHIP_LOST, { unit: e, side });
    for (const v of Q.aliveOfSide(state, side)) moraleCheck(state, v, false);
  }
}

/* ---- firing ---- */
export function fire(state, e, tgt) {
  const strength = Q.strengthOf(state, e);
  const dice = Q.moraleOf(state, e) === STEADY ? strength : Math.ceil(strength / 2);
  const arc = incomingArc(Q.posOf(state, tgt), Q.facingOf(state, tgt), Q.posOf(state, e));
  let need = { front: 5, flank: 4, rear: 3 }[arc];
  if (state.G.fleets[Q.sideOf(state, e)].supply === "critical") need++;
  let hits = 0; const rolls = [];
  for (let i = 0; i < dice; i++) { const r = state.random.d6(); rolls.push(r); if (r >= need) hits++; }
  state.events.emit(BattleEvent.SHOT_RESOLVED, {
    attacker: e, attackerLabel: Q.labelOf(state, e),
    target: tgt, targetLabel: Q.labelOf(state, tgt),
    arc, targetNumber: need, rolls, hits,
    from: Q.posOf(state, e), to: Q.posOf(state, tgt),
    side: Q.sideOf(state, e),
  });
  if (!hits) return { rolls, hits, arc, targetNumber: need };
  const tgtStrength = state.world.get(tgt, C.Strength);
  tgtStrength.value = Math.max(0, tgtStrength.value - hits);
  state.world.add(tgt, C.HitSinceAct, true);
  if (tgtStrength.value === 0) destroy(state, tgt);
  else moraleCheck(state, tgt, arc !== "front");
  return { rolls, hits, arc, targetNumber: need };
}

/* ---- movement ---- */
export function turnToward(state, e, d) {
  const facing = state.world.get(e, C.Facing);
  const diff = ((d - facing.dir) % 6 + 6) % 6;
  facing.dir = (facing.dir + (diff <= 3 ? 1 : 5)) % 6;
}

export function rotateActivatedUnit(state, direction) {
  if (!Q.canMove(state)) return false;
  const facing = state.world.get(state.act.u, C.Facing);
  facing.dir = (facing.dir + direction + 6) % 6;
  state.act.mp--;
  state.act.moved = true;
  state.act.fireMode = false;
  return true;
}

function tryMoveActivatedUnit(state, direction, spendAllMp) {
  if (spendAllMp ? !Q.canBack(state) : !Q.canMove(state)) return false;
  const entity = state.act.u;
  const position = Q.posOf(state, entity);
  const next = neighbor(position, direction);
  if (!inBounds(next[0], next[1]) || Q.occupiedSet(state).has(key(next[0], next[1]))) return false;
  if (Q.moraleOf(state, entity) === SHAKEN) {
    const nearest = Q.nearestEnemy(state, entity);
    if (nearest && hexDist(next, Q.posOf(state, nearest)) < hexDist(position, Q.posOf(state, nearest))) {
      state.events.emit(BattleEvent.MOVE_REJECTED, {
        unit: entity, label: Q.labelOf(state, entity), reason: "shaken_advance",
      });
      return false;
    }
  }
  setPos(state, entity, next);
  state.act.mp = spendAllMp ? 0 : state.act.mp - 1;
  state.act.moved = true;
  state.act.fireMode = false;
  return true;
}

export function moveActivatedUnitForward(state) {
  if (!state.act?.u) return false;
  return tryMoveActivatedUnit(state, Q.facingOf(state, state.act.u), false);
}

export function moveActivatedUnitBackward(state) {
  if (!state.act?.u) return false;
  return tryMoveActivatedUnit(state, (Q.facingOf(state, state.act.u) + 3) % 6, true);
}

export function desiredDir(fromPos, goal) {
  const ang = angleBetween(fromPos, goal);
  return argmin(range(0, 5), d => Math.abs(((DIR_ANGLE[d] - ang + 180) % 360 + 360) % 360 - 180));
}
export function aiStep(state, e) { // one MP toward nearest enemy; false if unusable
  const ne = Q.nearestEnemy(state, e);
  if (!ne) return false;
  const pos = Q.posOf(state, e), nePos = Q.posOf(state, ne);
  const d = desiredDir(pos, nePos);
  if (Q.facingOf(state, e) !== d) { turnToward(state, e, d); return true; }
  const nx = neighbor(pos, d);
  if (inBounds(nx[0], nx[1])
      && !Q.occupiedSet(state).has(key(nx[0], nx[1]))
      && hexDist(nx, nePos) < hexDist(pos, nePos)) { setPos(state, e, nx); return true; }
  return false;
}
export function flee(state, e) {
  const side = Q.sideOf(state, e);
  const d = side === 0 ? 3 : 0;
  for (let i = 0; i < MP_MAX; i++) {
    if (Q.facingOf(state, e) !== d) { turnToward(state, e, d); continue; }
    const nx = neighbor(Q.posOf(state, e), d);
    if (!inBounds(nx[0], nx[1])) {
      state.world.remove(e, C.Alive);
      state.events.emit(BattleEvent.UNIT_FLED, { unit: e, label: Q.labelOf(state, e), side });
      return;
    }
    if (!Q.occupiedSet(state).has(key(nx[0], nx[1]))) setPos(state, e, nx);
  }
}
export function routedActivation(state, e) { // shared by AI and human routed units
  if (!Q.hasHitSinceAct(state, e)) {
    const bonus = Q.inCommand(state, e) ? 1 : 0, r = state.random.d6();
    if (r + bonus >= 4) {
      state.world.get(e, C.Morale).state = SHAKEN;
      state.world.remove(e, C.HitSinceAct);
      state.events.emit(BattleEvent.UNIT_RALLIED, {
        unit: e, label: Q.labelOf(state, e), roll: r, bonus,
      });
      return;
    }
    state.events.emit(BattleEvent.RALLY_FAILED, {
      unit: e, label: Q.labelOf(state, e), roll: r, bonus,
    });
  }
  state.world.remove(e, C.HitSinceAct);
  flee(state, e);
}
export function aiActivate(state, e) {
  if (!Q.isAlive(state, e)) return;
  if (Q.moraleOf(state, e) === ROUTED) { routedActivation(state, e); return; }
  state.world.remove(e, C.HitSinceAct);
  const side = Q.sideOf(state, e);
  const cmd = Q.inCommand(state, e), hold = HOLD_FORMS.has(state.G.fleets[side].name);
  let tgt = Q.pickTarget(state, e);
  if (Q.moraleOf(state, e) === SHAKEN) {
    if (!tgt && !hold) {
      const ne = Q.nearestEnemy(state, e);
      if (ne) { const d = desiredDir(Q.posOf(state, e), Q.posOf(state, ne)); if (Q.facingOf(state, e) !== d) turnToward(state, e, d); }
      tgt = cmd ? Q.pickTarget(state, e) : null;
    }
    if (tgt) fire(state, e, tgt);
    return;
  }
  if (tgt) { fire(state, e, tgt); return; }
  if (hold) {
    const ne = Q.nearestEnemy(state, e);
    if (ne && hexDist(Q.posOf(state, e), Q.posOf(state, ne)) <= RANGE + 1) {
      const d = desiredDir(Q.posOf(state, e), Q.posOf(state, ne)); if (Q.facingOf(state, e) !== d) turnToward(state, e, d);
    }
    if (cmd) { tgt = Q.pickTarget(state, e); if (tgt) fire(state, e, tgt); }
    return;
  }
  for (let i = 0; i < MP_MAX; i++) if (!aiStep(state, e)) break;
  if (cmd) { tgt = Q.pickTarget(state, e); if (tgt) fire(state, e, tgt); }
}
