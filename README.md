# BattleStars Prototype

Browser and Monte Carlo prototypes for a fleet tactics game intended for a later Unreal Engine implementation.

## Run

```bash
npm test
npm run serve
```

Open `http://localhost:8000/battle.html` for the tactical battle or `http://localhost:8000/map.html` for the strategic map.

## Architecture

The tactical prototype uses patterns with direct Unreal equivalents:

- `battle/state.js`: session aggregate and composition root.
- `battle/core/phaseMachine.js`: explicit menu/deployment/combat/game-over state machine.
- `battle/controller.js`: command boundary for player intent.
- `battle/ecs.js`, `components.js`: entity/component data model.
- `battle/systems.js`: headless gameplay rules and AI systems.
- `battle/core/events.js`: observer/event bus for semantic gameplay events.
- `battle/core/random.js`: injected random strategy for deterministic tests and replays.
- `battle/presenter.js`, `render.js`, `panels.js`: browser-only presentation.
- `battle/config.js`, `formations.js`: data-driven rules and setup templates.

Rules should flow inward: browser input issues commands, systems mutate the session, systems publish events, and presentation observes those events. Domain modules must not import the DOM-facing modules.

See [docs/unreal-porting-guide.md](docs/unreal-porting-guide.md) and [unreal-reference](unreal-reference) for the intended Unreal mapping.
