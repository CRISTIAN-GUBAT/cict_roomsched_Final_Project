import { initDB } from '../lib/database';

async function main() {
  try {
    console.log('🔄 Starting database initialization...');
    await initDB();
    console.log('✅ Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

main();