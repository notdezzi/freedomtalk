import { Pool, PoolConfig } from 'pg';
import knex, { Knex } from 'knex';

/**
 * PostgreSQL connection pool configuration
 * Uses environment variables for connection settings
 */
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  min: parseInt(process.env.DB_POOL_MIN || '5', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
};

// Create the connection pool
export const pool = new Pool(poolConfig);

/**
 * Knex instance for query building
 * Uses the same configuration as the connection pool
 */
export const db: Knex = knex({
  client: 'postgresql',
  connection: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/freedomtalk',
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  },
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Graceful shutdown
export const closePool = async (): Promise<void> => {
  await pool.end();
};

// Test connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

