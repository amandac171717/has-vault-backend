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
        const errors = [];

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim() && statement.length > 5) { // Only process non-empty statements
                try {
                    await query(statement);
                    successCount++;
                    console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
                } catch (error) {
                    // Ignore "already exists" errors (these are OK)
                    if (error.message.includes('already exists') || 
                        error.message.includes('duplicate key') ||
                        error.message.includes('relation') && error.message.includes('already exists')) {
                        successCount++;
                        console.log(`ℹ️ Statement ${i + 1}/${statements.length} skipped (already exists)`);
                    } else {
                        errorCount++;
                        const errorInfo = {
                            statement: statement.substring(0, 200),
                            error: error.message,
                            code: error.code
                        };
                        errors.push(errorInfo);
                        console.error(`❌ Statement ${i + 1}/${statements.length} failed:`, error.message);
                        console.error(`   Statement preview:`, statement.substring(0, 150));
                    }
                }
            }
        }
        
        if (errors.length > 0) {
            console.error('❌ Migration errors summary:');
            errors.forEach((err, idx) => {
                console.error(`  ${idx + 1}. ${err.error}`);
                console.error(`     Code: ${err.code}`);
            });
        }

        console.log(`✅ Database migrations completed: ${successCount} successful, ${errorCount} errors`);
        
        // Verify tables were created
        const tablesCheck = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'receipts', 'audit_logs', 'user_sessions')
        `);
        
        const createdTables = tablesCheck.rows.map(r => r.table_name);
        const expectedTables = ['users', 'receipts', 'audit_logs', 'user_sessions'];
        const missingTables = expectedTables.filter(t => !createdTables.includes(t));
        
        console.log(`📊 Found tables: ${createdTables.join(', ') || 'none'}`);
        
        if (missingTables.length > 0) {
            console.error(`❌ Missing tables: ${missingTables.join(', ')}`);
            console.error('⚠️ Some migrations failed. Attempting to create missing tables...');
            
            // Try to create missing tables individually
            for (const tableName of missingTables) {
                try {
                    if (tableName === 'users') {
                        await query(`
                            CREATE TABLE IF NOT EXISTS users (
                                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                username VARCHAR(255) UNIQUE NOT NULL,
                                email VARCHAR(255) UNIQUE NOT NULL,
                                password_hash VARCHAR(255) NOT NULL,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                last_login TIMESTAMP,
                                is_active BOOLEAN DEFAULT true,
                                email_verified BOOLEAN DEFAULT false,
                                two_factor_enabled BOOLEAN DEFAULT false,
                                encryption_key_id VARCHAR(255)
                            )
                        `);
                        await query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
                        await query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
                        await query('CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)');
                        console.log('✅ Created users table');
                    } else if (tableName === 'receipts') {
                        await query(`
                            CREATE TABLE IF NOT EXISTS receipts (
                                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                date DATE NOT NULL,
                                vendor VARCHAR(255),
                                service_type VARCHAR(100),
                                amount DECIMAL(10, 2) NOT NULL,
                                ocr_text TEXT,
                                ocr_confidence DECIMAL(5, 2),
                                ocr_processed_at TIMESTAMP,
                                image_s3_key VARCHAR(500) NOT NULL,
                                image_s3_bucket VARCHAR(255) NOT NULL,
                                image_format VARCHAR(10),
                                image_size_bytes INTEGER,
                                compressed_size_bytes INTEGER,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                deleted_at TIMESTAMP,
                                tags TEXT[]
                            )
                        `);
                        await query('CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id)');
                        await query('CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date)');
                        console.log('✅ Created receipts table');
                    } else if (tableName === 'audit_logs') {
                        await query(`
                            CREATE TABLE IF NOT EXISTS audit_logs (
                                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                                action VARCHAR(100) NOT NULL,
                                resource_type VARCHAR(50),
                                resource_id UUID,
                                ip_address INET,
                                user_agent TEXT,
                                metadata JSONB,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                            )
                        `);
                        console.log('✅ Created audit_logs table');
                    } else if (tableName === 'user_sessions') {
                        await query(`
                            CREATE TABLE IF NOT EXISTS user_sessions (
                                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                token_hash VARCHAR(255) NOT NULL,
                                ip_address INET,
                                user_agent TEXT,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                expires_at TIMESTAMP NOT NULL
                            )
                        `);
                        console.log('✅ Created user_sessions table');
                    }
                } catch (tableError) {
                    console.error(`❌ Failed to create ${tableName} table:`, tableError.message);
                }
            }
            
            // Verify again
            const finalCheck = await query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('users', 'receipts', 'audit_logs', 'user_sessions')
            `);
            console.log(`📊 Final tables: ${finalCheck.rows.map(r => r.table_name).join(', ')}`);
        } else {
            console.log('✅ All required tables exist!');
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

