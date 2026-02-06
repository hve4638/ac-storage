import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import { FileRecord, SCHEMA_VERSION } from './types';
import { CorruptedDBError } from './errors';

export class SQLiteAdapter {
    private db: Database.Database;

    private constructor(db: Database.Database) {
        this.db = db;
    }

    static create(filePath: string): SQLiteAdapter {
        if (fs.existsSync(filePath)) {
            throw new Error(`File already exists: ${filePath}`);
        }
        
        const db = new Database(filePath);
        const adapter = new SQLiteAdapter(db);
        adapter.initSchema();
        return adapter;
    }

    static open(filePath: string): SQLiteAdapter {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        
        const db = new Database(filePath, { readonly: true });
        return new SQLiteAdapter(db);
    }

    static openForWrite(filePath: string): SQLiteAdapter {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        
        const db = new Database(filePath);
        return new SQLiteAdapter(db);
    }

    private initSchema(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS _ac_meta (
                key TEXT PRIMARY KEY,
                value TEXT
            );
            
            CREATE TABLE IF NOT EXISTS files (
                identifier TEXT PRIMARY KEY,
                access_type TEXT NOT NULL,
                content BLOB,
                custom_id TEXT,
                created_at TEXT,
                updated_at TEXT
            );
        `);
        
        this.setMeta('version', SCHEMA_VERSION);
        this.setMeta('exportedAt', new Date().toISOString());
    }

    setMeta(key: string, value: string): void {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO _ac_meta (key, value) VALUES (?, ?)
        `);
        stmt.run(key, value);
    }

    getMeta(key: string): string | undefined {
        const stmt = this.db.prepare(`
            SELECT value FROM _ac_meta WHERE key = ?
        `);
        const row = stmt.get(key) as { value: string } | undefined;
        return row?.value;
    }

    insertFile(
        identifier: string,
        accessType: string,
        content: Buffer,
        customId?: string
    ): void {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            INSERT INTO files (identifier, access_type, content, custom_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(identifier, accessType, content, customId ?? null, now, now);
    }

    getFile(identifier: string): FileRecord | undefined {
        const stmt = this.db.prepare(`
            SELECT identifier, access_type, content, custom_id, created_at, updated_at
            FROM files WHERE identifier = ?
        `);
        const row = stmt.get(identifier) as {
            identifier: string;
            access_type: string;
            content: Buffer;
            custom_id: string | null;
            created_at: string;
            updated_at: string;
        } | undefined;

        if (!row) return undefined;

        return {
            identifier: row.identifier,
            accessType: row.access_type,
            content: row.content,
            customId: row.custom_id ?? undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    getAllFiles(): FileRecord[] {
        const stmt = this.db.prepare(`
            SELECT identifier, access_type, content, custom_id, created_at, updated_at
            FROM files
        `);
        const rows = stmt.all() as Array<{
            identifier: string;
            access_type: string;
            content: Buffer;
            custom_id: string | null;
            created_at: string;
            updated_at: string;
        }>;

        return rows.map(row => ({
            identifier: row.identifier,
            accessType: row.access_type,
            content: row.content,
            customId: row.custom_id ?? undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
    }

    getFilesByPrefix(prefix: string): FileRecord[] {
        const stmt = this.db.prepare(`
            SELECT identifier, access_type, content, custom_id, created_at, updated_at
            FROM files WHERE identifier LIKE ?
        `);
        const pattern = prefix === '' ? '%' : `${prefix}%`;
        const rows = stmt.all(pattern) as Array<{
            identifier: string;
            access_type: string;
            content: Buffer;
            custom_id: string | null;
            created_at: string;
            updated_at: string;
        }>;

        return rows.map(row => ({
            identifier: row.identifier,
            accessType: row.access_type,
            content: row.content,
            customId: row.custom_id ?? undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
    }

    getFileCount(): number {
        const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM files`);
        const row = stmt.get() as { count: number };
        return row.count;
    }

    validateSchema(): boolean {
        try {
            const version = this.getMeta('version');
            if (!version) {
                throw new CorruptedDBError('Missing schema version');
            }
            if (version !== SCHEMA_VERSION) {
                return false;
            }
            return true;
        } catch (e) {
            if (e instanceof CorruptedDBError) throw e;
            throw new CorruptedDBError('Invalid database structure');
        }
    }

    transaction<T>(fn: () => T): T {
        return this.db.transaction(fn)();
    }

    close(): void {
        this.db.close();
    }
}

export default SQLiteAdapter;
