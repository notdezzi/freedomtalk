import * as bcrypt from 'bcrypt';
import { generateSnowflakeId } from '../src/utils/snowflake.js';
export async function seed(knex) {
    const env = process.env.NODE_ENV || 'development';
    if (env === 'production') {
        console.log('⚠️  Skipping seed in production environment');
        return;
    }
    console.log('🌱 Seeding test users...');
    const passwordHash = await bcrypt.hash('TestPassword123!', 10);
    const user1Id = generateSnowflakeId();
    const user2Id = generateSnowflakeId();
    const user3Id = generateSnowflakeId();
    const user4Id = generateSnowflakeId();
    const existingUsers = await knex('users')
        .whereIn('email', [
        'alice@freedomtalk.dev',
        'bob@freedomtalk.dev',
        'charlie@freedomtalk.dev',
        'diana@freedomtalk.dev',
    ])
        .select('email');
    if (existingUsers.length > 0) {
        console.log('ℹ️  Test users already exist, skipping seed');
        return;
    }
    await knex('users').insert([
        {
            id: user1Id,
            email: 'alice@freedomtalk.dev',
            username: 'alice',
            password_hash: passwordHash,
            email_verified: true,
            mfa_enabled: false,
            account_status: 'active',
        },
        {
            id: user2Id,
            email: 'bob@freedomtalk.dev',
            username: 'bob',
            password_hash: passwordHash,
            email_verified: true,
            mfa_enabled: false,
            account_status: 'active',
        },
        {
            id: user3Id,
            email: 'charlie@freedomtalk.dev',
            username: 'charlie',
            password_hash: passwordHash,
            email_verified: true,
            mfa_enabled: false,
            account_status: 'active',
        },
        {
            id: user4Id,
            email: 'diana@freedomtalk.dev',
            username: 'diana',
            password_hash: passwordHash,
            email_verified: false,
            mfa_enabled: false,
            account_status: 'active',
        },
    ]);
    console.log('✅ Created 4 test users');
    await knex('user_profiles').insert([
        {
            id: generateSnowflakeId(),
            user_id: user1Id,
            display_name: 'Alice Anderson',
            bio: 'Software engineer and open source enthusiast. Love building cool stuff!',
            pronouns: 'she/her',
            custom_status: '🚀 Building the future',
        },
        {
            id: generateSnowflakeId(),
            user_id: user2Id,
            display_name: 'Bob Builder',
            bio: 'Full-stack developer. Coffee addict ☕',
            pronouns: 'he/him',
            custom_status: '💻 Coding',
        },
        {
            id: generateSnowflakeId(),
            user_id: user3Id,
            display_name: 'Charlie Chen',
            bio: 'DevOps engineer. Kubernetes wizard 🧙‍♂️',
            pronouns: 'they/them',
            custom_status: '🔧 Deploying',
        },
        {
            id: generateSnowflakeId(),
            user_id: user4Id,
            display_name: 'Diana Davis',
            bio: 'Product designer. Making things beautiful and usable.',
            pronouns: 'she/her',
            custom_status: '🎨 Designing',
        },
    ]);
    console.log('✅ Created user profiles');
    await knex('user_connections').insert([
        {
            id: generateSnowflakeId(),
            user_id: user1Id,
            connected_user_id: user2Id,
            connection_type: 'friend',
            status: 'active',
        },
        {
            id: generateSnowflakeId(),
            user_id: user2Id,
            connected_user_id: user1Id,
            connection_type: 'friend',
            status: 'active',
        },
        {
            id: generateSnowflakeId(),
            user_id: user1Id,
            connected_user_id: user3Id,
            connection_type: 'friend',
            status: 'active',
        },
        {
            id: generateSnowflakeId(),
            user_id: user3Id,
            connected_user_id: user1Id,
            connection_type: 'friend',
            status: 'active',
        },
        {
            id: generateSnowflakeId(),
            user_id: user4Id,
            connected_user_id: user1Id,
            connection_type: 'pending_outgoing',
            status: 'active',
        },
        {
            id: generateSnowflakeId(),
            user_id: user1Id,
            connected_user_id: user4Id,
            connection_type: 'pending_incoming',
            status: 'active',
        },
    ]);
    console.log('✅ Created user connections');
    console.log('');
    console.log('📝 Test user credentials:');
    console.log('   Email: alice@freedomtalk.dev, bob@freedomtalk.dev, charlie@freedomtalk.dev, diana@freedomtalk.dev');
    console.log('   Password: TestPassword123!');
    console.log('');
}
;
//# sourceMappingURL=001_seed_test_users.js.map