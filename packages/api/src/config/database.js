import { Pool } from 'pg';
import knex from 'knex';
const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    min: parseInt(process.env.DB_POOL_MIN || '5', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
};
export const pool = new Pool(poolConfig);
export const db = knex({
    client: 'postgresql',
    connection: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/freedomtalk',
    pool: {
        min: parseInt(process.env.DB_POOL_MIN || '2', 10),
        max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    },
});
pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    process.exit(-1);
});
export const closePool = async () => {
    await pool.end();
};
export const testConnection = async () => {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        return true;
    }
    catch (error) {
        console.error('Database connection test failed:', error);
        return false;
    }
};
//# sourceMappingURL=database.js.map