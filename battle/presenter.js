// Browser observer for semantic domain events. Replacing this module with UE
// delegate listeners leaves systems.js and all battle rules unchanged.
import { BattleEvent } from "./core/events.js";
import { sideCls, sideName } from "./config.js";
import { LASER_DURATION } from "./dimensions.js";
import { log } from "./panels.js";

function present(state, event) {
  switch (event.type) {
    case BattleEvent.MORALE_CHECKED:
      log(`  ${event.label} morale: ${event.roll}${event.modifiers.length ? " " + event.modifiers.join(" ") : ""} = ${event.total} -> ${event.passed ? "holds" : "FAILS"}`,
        event.passed ? null : "bad");
      break;
    case BattleEvent.UNIT_ROUTED:
      log(`  ${event.label} ROUTS!`, "bad");
      break;
    case BattleEvent.UNIT_DESTROYED:
      log(`  ${event.label} is DESTROYED`, "bad");
      break;
    case BattleEvent.FLAGSHIP_LOST:
      log(`  ${sideName(event.side)} FLAGSHIP LOST - fleet-wide morale check, command net down`, "bad");
      break;
    case BattleEvent.SHOT_RESOLVED:
      log(`${event.attackerLabel} fires at ${event.targetLabel} (${event.arc} arc, ${event.targetNumber}+): ` +
        `[${event.rolls.join(" ")}] -> ${event.hits} hit${event.hits === 1 ? "" : "s"}`,
        event.hits ? sideCls(event.side) : null);
      state.effects.push({
        type: "laser", from: event.from, to: event.to, side: event.side,
        hit: event.hits > 0, start: performance.now(),
        dur: event.hits > 0 ? LASER_DURATION.hit : LASER_DURATION.miss,
      });
      break;
    case BattleEvent.UNIT_FLED:
      log(`  ${event.label} flees off the map`, "bad");
      break;
    case BattleEvent.UNIT_RALLIED:
      log(`${event.label} RALLIES (${event.roll}${event.bonus ? "+1" : ""}) - now Shaken`, "good");
      break;
    case BattleEvent.RALLY_FAILED:
      log(`${event.label} fails to rally (${event.roll}${event.bonus ? "+1" : ""}) and keeps running`);
      break;
    case BattleEvent.MOVE_REJECTED:
      if (event.reason === "shaken_advance") {
        log(`${event.label} is Shaken - it refuses to move toward the enemy`, "bad");
      }
      break;
  }
}

export function attachBattlePresenter(state) {
  return state.events.onAny(event => present(state, event));
}
