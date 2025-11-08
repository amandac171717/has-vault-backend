import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
    try {
        console.log('🔄 Running database migrations...');

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split by semicolons and execute each statement
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await query(statement);
                } catch (error) {
                    // Ignore "already exists" errors
                    if (!error.message.includes('already exists') && 
                        !error.message.includes('duplicate')) {
                        console.error('Migration error:', error.message);
                    }
                }
            }
        }

        console.log('✅ Database migrations completed successfully');
        return true;
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Only run migrations directly if this file is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
    runMigrations().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}

