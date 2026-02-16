const EPOCH = 1704067200000n;
const WORKER_ID_BITS = 10n;
const SEQUENCE_BITS = 12n;
const MAX_WORKER_ID = (1n << WORKER_ID_BITS) - 1n;
const MAX_SEQUENCE = (1n << SEQUENCE_BITS) - 1n;
const TIMESTAMP_SHIFT = WORKER_ID_BITS + SEQUENCE_BITS;
const WORKER_ID_SHIFT = SEQUENCE_BITS;
export class SnowflakeGenerator {
    workerId;
    sequence = 0n;
    lastTimestamp = -1n;
    constructor(workerId = 1) {
        const workerIdBigInt = BigInt(workerId);
        if (workerIdBigInt < 0n || workerIdBigInt > MAX_WORKER_ID) {
            throw new Error(`Worker ID must be between 0 and ${MAX_WORKER_ID}`);
        }
        this.workerId = workerIdBigInt;
    }
    generate() {
        let timestamp = this.getCurrentTimestamp();
        if (timestamp < this.lastTimestamp) {
            throw new Error(`Clock moved backwards. Refusing to generate ID for ${this.lastTimestamp - timestamp}ms`);
        }
        if (timestamp === this.lastTimestamp) {
            this.sequence = (this.sequence + 1n) & MAX_SEQUENCE;
            if (this.sequence === 0n) {
                timestamp = this.waitNextMillis(this.lastTimestamp);
            }
        }
        else {
            this.sequence = 0n;
        }
        this.lastTimestamp = timestamp;
        const id = ((timestamp - EPOCH) << TIMESTAMP_SHIFT) |
            (this.workerId << WORKER_ID_SHIFT) |
            this.sequence;
        return id.toString();
    }
    parse(id) {
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
    getCurrentTimestamp() {
        return BigInt(Date.now());
    }
    waitNextMillis(lastTimestamp) {
        let timestamp = this.getCurrentTimestamp();
        while (timestamp <= lastTimestamp) {
            timestamp = this.getCurrentTimestamp();
        }
        return timestamp;
    }
}
const workerId = parseInt(process.env.WORKER_ID || '1', 10);
export const snowflake = new SnowflakeGenerator(workerId);
export function generateSnowflakeId() {
    return snowflake.generate();
}
export function parseSnowflakeId(id) {
    return snowflake.parse(id);
}
//# sourceMappingURL=snowflake.js.map