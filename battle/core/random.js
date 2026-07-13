// Strategy interface used by gameplay code. Swap MathRandomSource for a seeded
// source in tests/replays or Unreal's FRandomStream in the engine port.
export class MathRandomSource {
  next() {
    return Math.random();
  }

  integer(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  d6() {
    return this.integer(1, 6);
  }

  pick(values) {
    if (!values.length) return undefined;
    return values[this.integer(0, values.length - 1)];
  }
}

// Mulberry32: small, deterministic, and sufficient for reproducible prototype
// battles. It is not intended for security or cross-language save formats.
export class SeededRandomSource extends MathRandomSource {
  constructor(seed = 1) {
    super();
    this.state = seed >>> 0;
  }

  next() {
    let value = this.state += 0x6d2b79f5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  }
}

// Useful for exact rule tests where each die result matters.
export class SequenceRandomSource extends MathRandomSource {
  constructor(values) {
    super();
    this.values = [...values];
  }

  d6() {
    if (!this.values.length) throw new Error("SequenceRandomSource exhausted");
    const value = this.values.shift();
    if (!Number.isInteger(value) || value < 1 || value > 6) {
      throw new RangeError(`Invalid d6 value: ${value}`);
    }
    return value;
  }
}
