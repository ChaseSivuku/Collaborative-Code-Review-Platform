import pool from '../config/database';
import fs from 'fs';
import path from 'path';

export async function runMigrations(): Promise<void> {
  try {
    // Try multiple possible paths for the schema file
    const possiblePaths = [
      path.join(process.cwd(), 'src/config/database-schema.sql'), // Development (ts-node)
      path.join(process.cwd(), 'dist/config/database-schema.sql'), // Compiled (dist)
      path.join(__dirname, '../config/database-schema.sql'), // Fallback
    ];

    let schema: string | null = null;
    for (const schemaPath of possiblePaths) {
      if (fs.existsSync(schemaPath)) {
        schema = fs.readFileSync(schemaPath, 'utf-8');
        break;
      }
    }

    if (!schema) {
      throw new Error('Could not find database-schema.sql file. Tried paths: ' + possiblePaths.join(', '));
    }
    
    await pool.query(schema);
    console.log('✅ Database schema created successfully');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    throw error;
  }
}

export async function initDatabase(): Promise<void> {
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established');
    
    // Run migrations
    await runMigrations();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

