// Aggregate root for one running battle session. The browser creates one, while
// headless tests can create as many isolated sessions as they need.
import { World } from "./ecs.js";
import { EventBus } from "./core/events.js";
import { MathRandomSource } from "./core/random.js";
import { BattlePhase, PhaseMachine } from "./core/phaseMachine.js";

export class BattleSession {
  constructor({ random = new MathRandomSource(), events = new EventBus() } = {}) {
    this.random = random;
    this.events = events;
    this.phase = new PhaseMachine();
    this.world = new World();
    this.G = null;
    this.scen = null;
    this.ctrlMode = 0;
    this.SIZE = 9;
    this.BREAK_AT = 5;
    this.moveMode = 0;
    this.deployMode = 0;
    this.act = null;
    this.autoTimer = null;
    this.setup = null;
    this.setupQueue = [];
    this.effects = [];
  }

  beginBattle() {
    this.world = new World();
    this.act = null;
    this.setup = null;
    this.setupQueue = [];
    this.effects = [];
  }

  enterMenu() {
    this.phase.transition(BattlePhase.MENU);
    this.G = null;
    this.act = null;
    this.setup = null;
    this.setupQueue = [];
  }
}

export const State = new BattleSession();
