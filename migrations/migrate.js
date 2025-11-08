import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
    try {
        console.log('🔄 Running database migrations...');

        // Test database connection first
        try {
            await query('SELECT 1');
            console.log('✅ Database connection verified');
        } catch (connError) {
            console.error('❌ Database connection failed:', connError.message);
            throw new Error('Cannot connect to database: ' + connError.message);
        }

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split by semicolons and execute each statement
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        let successCount = 0;
        let errorCount = 0;

        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await query(statement);
                    successCount++;
                } catch (error) {
                    // Ignore "already exists" errors
                    if (error.message.includes('already exists') || 
                        error.message.includes('duplicate') ||
                        error.message.includes('does not exist')) {
                        // These are OK - table/function might already exist
                        successCount++;
                    } else {
                        console.error('Migration statement error:', error.message);
                        console.error('Statement:', statement.substring(0, 100));
                        errorCount++;
                    }
                }
            }
        }

        console.log(`✅ Database migrations completed: ${successCount} successful, ${errorCount} errors`);
        
        // Verify tables were created
        const tablesCheck = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'receipts', 'audit_logs', 'user_sessions')
        `);
        
        console.log(`📊 Created tables: ${tablesCheck.rows.map(r => r.table_name).join(', ')}`);
        
        if (tablesCheck.rows.length < 4) {
            console.warn('⚠️ Warning: Not all tables were created. Some migrations may have failed.');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.error('Error stack:', error.stack);
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

