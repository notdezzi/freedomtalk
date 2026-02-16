import 'dotenv/config';
const config = {
    development: {
        client: 'postgresql',
        connection: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/freedomtalk',
        pool: {
            min: parseInt(process.env.DB_POOL_MIN || '2', 10),
            max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        },
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations',
            extension: 'ts',
            loadExtensions: ['.ts'],
        },
        seeds: {
            directory: './seeds',
            extension: 'ts',
            loadExtensions: ['.ts'],
        },
    },
    staging: {
        client: 'postgresql',
        connection: process.env.DATABASE_URL,
        pool: {
            min: parseInt(process.env.DB_POOL_MIN || '2', 10),
            max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        },
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations',
            extension: 'ts',
            loadExtensions: ['.ts'],
        },
        seeds: {
            directory: './seeds',
            extension: 'ts',
            loadExtensions: ['.ts'],
        },
    },
    production: {
        client: 'postgresql',
        connection: process.env.DATABASE_URL,
        pool: {
            min: parseInt(process.env.DB_POOL_MIN || '5', 10),
            max: parseInt(process.env.DB_POOL_MAX || '20', 10),
        },
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations',
            extension: 'ts',
            loadExtensions: ['.ts'],
        },
        seeds: {
            directory: './seeds',
            extension: 'ts',
            loadExtensions: ['.ts'],
        },
    },
};
export default config;
//# sourceMappingURL=knexfile.js.map