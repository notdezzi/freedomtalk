/**
 * Twitter Snowflake ID Generator
 * 
 * Generates unique 64-bit IDs with the following structure:
 * - 1 bit: Unused (always 0)
 * - 41 bits: Timestamp in milliseconds since custom epoch
 * - 10 bits: Worker/Machine ID (0-1023)
 * - 12 bits: Sequence number (0-4095)
 * 
 * This allows for:
 * - 69 years of IDs from the epoch
 * - 1024 unique workers/machines
 * - 4096 unique IDs per millisecond per worker
 */

// Custom epoch: January 1, 2024 00:00:00 UTC
const EPOCH = 1704067200000n;

// Bit lengths
const WORKER_ID_BITS = 10n;
const SEQUENCE_BITS = 12n;

// Maximum values
const MAX_WORKER_ID = (1n << WORKER_ID_BITS) - 1n; // 1023
const MAX_SEQUENCE = (1n << SEQUENCE_BITS) - 1n; // 4095

// Bit shifts
const TIMESTAMP_SHIFT = WORKER_ID_BITS + SEQUENCE_BITS; // 22
const WORKER_ID_SHIFT = SEQUENCE_BITS; // 12

/**
 * Snowflake ID type (string representation of bigint)
 */
export type SnowflakeId = string;

/**
 * Snowflake ID Generator Class
 */
export class SnowflakeGenerator {
  private workerId: bigint;
  private sequence: bigint = 0n;
  private lastTimestamp: bigint = -1n;

  constructor(workerId: number = 1) {
    const workerIdBigInt = BigInt(workerId);
    
    if (workerIdBigInt < 0n || workerIdBigInt > MAX_WORKER_ID) {
      throw new Error(`Worker ID must be between 0 and ${MAX_WORKER_ID}`);
    }
    
    this.workerId = workerIdBigInt;
  }

  /**
   * Generate a new Snowflake ID
   */
  generate(): SnowflakeId {
    let timestamp = this.getCurrentTimestamp();

    // Clock moved backwards - this should never happen in production
    if (timestamp < this.lastTimestamp) {
      throw new Error(
        `Clock moved backwards. Refusing to generate ID for ${this.lastTimestamp - timestamp}ms`
      );
    }

    // Same millisecond - increment sequence
    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & MAX_SEQUENCE;
      
      // Sequence overflow - wait for next millisecond
      if (this.sequence === 0n) {
        timestamp = this.waitNextMillis(this.lastTimestamp);
      }
    } else {
      // New millisecond - reset sequence
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    // Construct the ID
    const id = 
      ((timestamp - EPOCH) << TIMESTAMP_SHIFT) |
      (this.workerId << WORKER_ID_SHIFT) |
      this.sequence;

    return id.toString();
  }

  /**
   * Parse a Snowflake ID to extract its components
   */
  parse(id: SnowflakeId): {
    timestamp: Date;
    workerId: number;
    sequence: number;
  } {
    const idBigInt = BigInt(id);

    const timestamp = Number((idBigInt >> TIMESTAMP_SHIFT) + EPOCH);
    const workerId = Number((idBigInt >> WORKER_ID_SHIFT) & MAX_WORKER_ID);
    const sequence = Number(idBigInt & MAX_SEQUENCE);

    return {
      timestamp: new Date(timestamp),
      workerId,
      sequence,
    };
  }

  /**
   * Get current timestamp in milliseconds
   */
  private getCurrentTimestamp(): bigint {
    return BigInt(Date.now());
  }

  /**
   * Wait until next millisecond
   */
  private waitNextMillis(lastTimestamp: bigint): bigint {
    let timestamp = this.getCurrentTimestamp();
    while (timestamp <= lastTimestamp) {
      timestamp = this.getCurrentTimestamp();
    }
    return timestamp;
  }
}

/**
 * Singleton instance of SnowflakeGenerator
 * Uses WORKER_ID from environment or defaults to 1
 */
const workerId = parseInt(process.env.WORKER_ID || '1', 10);
export const snowflake = new SnowflakeGenerator(workerId);

/**
 * Generate a new Snowflake ID (convenience function)
 */
export function generateSnowflakeId(): SnowflakeId {
  return snowflake.generate();
}

/**
 * Parse a Snowflake ID (convenience function)
 */
export function parseSnowflakeId(id: SnowflakeId) {
  return snowflake.parse(id);
}

