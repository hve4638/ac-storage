import * as fs from 'node:fs';
import { AppFile } from 'sqlite-appfile';

import { FileRecord, SCHEMA_VERSION } from './types';
import { CorruptedDBError } from './errors';

type AnyAppFile = any;

export class SQLiteAdapter {
    private app: AnyAppFile;

    private constructor(app: AnyAppFile) {
        this.app = app;
    }

    static create(filePath: string): SQLiteAdapter {
        if (fs.existsSync(filePath)) {
            throw new Error(`File already exists: ${filePath}`);
        }

        const app = AppFile.create(filePath) as AnyAppFile;
        const adapter = new SQLiteAdapter(app);
        adapter.initSchema();
        return adapter;
    }

    static open(filePath: string): SQLiteAdapter {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const app = AppFile.openReadOnly(filePath) as AnyAppFile;
        return new SQLiteAdapter(app);
    }

    static openForWrite(filePath: string): SQLiteAdapter {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const app = AppFile.open(filePath) as AnyAppFile;
        return new SQLiteAdapter(app);
    }

    private initSchema(): void {
        this.setMeta('version', SCHEMA_VERSION);
        this.setMeta('exportedAt', new Date().toISOString());
    }

    setMeta(key: string, value: string): void {
        this.app.setMeta(key, value);
    }

    getMeta(key: string): string | undefined {
        return this.app.getMeta(key);
    }

    insertFile(
        identifier: string,
        accessType: string,
        content: Buffer,
        customId?: string
    ): void {
        const recordMeta: Record<string, unknown> = {
            accessType,
        };
        if (customId) {
            recordMeta['customId'] = customId;
        }

        const filePath = identifier.startsWith('/') ? identifier : `/${identifier}`;
        const writeFileFn = (this.app.writeFile ?? this.app.write) as ((p: string, c: Uint8Array, o?: unknown) => void) | undefined;
        if (typeof writeFileFn !== 'function') {
            throw new Error('sqlite-appfile write method not found');
        }

        writeFileFn.call(this.app, filePath, content, { metadata: recordMeta });
    }

    getFile(identifier: string): FileRecord | undefined {
        const filePath = identifier.startsWith('/') ? identifier : `/${identifier}`;
        const files = this.getAllFiles();
        const found = files.find(f => `/${f.identifier}` === filePath);
        return found;
    }

    getAllFiles(): FileRecord[] {
        const appFiles = this.app.getAllFiles() as Array<{
            path: string;
            content: Uint8Array;
            metadata: Record<string, unknown> | null;
        }>;

        return appFiles.map(f => {
            const identifier = f.path.startsWith('/') ? f.path.slice(1) : f.path;
            const accessType = (f.metadata?.['accessType'] as string | undefined) ?? 'binary';
            const customId = f.metadata?.['customId'] as string | undefined;

            return {
                identifier,
                accessType,
                content: Buffer.from(f.content),
                ...(customId ? { customId } : {}),
            };
        });
    }

    getFilesByPrefix(prefix: string): FileRecord[] {
        return this.getAllFiles().filter(f => f.identifier.startsWith(prefix));
    }

    getFileCount(): number {
        const listFilesFn = this.app.listFiles as ((p?: string) => string[]) | undefined;
        if (typeof listFilesFn !== 'function') {
            return this.getAllFiles().length;
        }
        return listFilesFn.call(this.app).length;
    }

    validateSchema(): boolean {
        try {
            const version = this.getMeta('version');
            if (!version) {
                throw new CorruptedDBError('Missing schema version');
            }
            return version === SCHEMA_VERSION;
        } catch (e) {
            if (e instanceof CorruptedDBError) throw e;
            throw new CorruptedDBError('Invalid database structure');
        }
    }

    transaction<T>(fn: () => T): T {
        return this.app.transaction(fn);
    }

    close(): void {
        this.app.close();
    }
}

export default SQLiteAdapter;
