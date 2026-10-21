/**
 * Snowflake ID Generator Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { SnowflakeGenerator, parseSnowflakeId, generateSnowflakeId } from '../snowflake';

// Epoch must match the generator's constant (Jan 1, 2024 UTC)
const EPOCH = 1704067200000n;

describe('SnowflakeGenerator', () => {
  it('generates 64-bit-safe numeric string IDs', () => {
    const id = generateSnowflakeId();
    expect(id).toMatch(/^\d+$/);
    expect(BigInt(id) < (1n << 63n)).toBe(true);
  });

  it('generates unique IDs under rapid generation', () => {
    const gen = new SnowflakeGenerator(1);
    const ids = new Set<string>();
    for (let i = 0; i < 5000; i++) {
      ids.add(gen.generate());
    }
    expect(ids.size).toBe(5000);
  });

  it('encodes the worker ID', () => {
    const gen = new SnowflakeGenerator(42);
    const parsed = gen.parse(gen.generate());
    expect(parsed.workerId).toBe(42);
  });

  it('encodes a timestamp close to now', () => {
    const gen = new SnowflakeGenerator(1);
    const before = Date.now();
    const parsed = gen.parse(gen.generate());
    const after = Date.now();
    expect(parsed.timestamp.getTime()).toBeGreaterThanOrEqual(before - 1);
    expect(parsed.timestamp.getTime()).toBeLessThanOrEqual(after + 1);
  });

  it('rejects out-of-range worker IDs', () => {
    expect(() => new SnowflakeGenerator(-1)).toThrow();
    expect(() => new SnowflakeGenerator(1024)).toThrow();
    expect(() => new SnowflakeGenerator(1023)).not.toThrow();
  });

  it('throws when the clock moves backwards', () => {
    const gen = new SnowflakeGenerator(1);
    gen.generate();
    // Force lastTimestamp into the future
    (gen as unknown as { lastTimestamp: bigint }).lastTimestamp = BigInt(Date.now() + 60_000);
    expect(() => gen.generate()).toThrow(/Clock moved backwards/);
  });

  it('handles sequence overflow without producing duplicates', () => {
    const gen = new SnowflakeGenerator(1);
    // Generate past one millisecond's worth of sequence space (4096)
    const ids = new Set<string>();
    for (let i = 0; i < 4200; i++) {
      ids.add(gen.generate());
    }
    expect(ids.size).toBe(4200);
  });

  it('parse round-trips the sequence number', () => {
    const gen = new SnowflakeGenerator(7);
    const id = gen.generate();
    const parsed = gen.parse(id);
    expect(parsed.sequence).toBeGreaterThanOrEqual(0);
    expect(parsed.workerId).toBe(7);
    // Timestamp is epoch-relative
    expect(parsed.timestamp.getTime()).toBeGreaterThan(Number(EPOCH));
  });

  it('convenience singleton works and parses its own output', () => {
    const id = generateSnowflakeId();
    expect(() => parseSnowflakeId(id)).not.toThrow();
  });
});
