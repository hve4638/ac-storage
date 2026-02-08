import * as fs from 'node:fs';
import * as path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SQLiteAdapter } from './SQLiteAdapter';
import { ImportOptions, ImportResult, SCHEMA_VERSION } from './types';
import { ImportError, SchemaVersionError, ConflictError, CorruptedDBError } from './errors';

interface StorageImporterContext {
    basePath: string;
    accessCache: Record<string, string>;
    commitAll(): Promise<void>;
}

export class StorageImporter {
    constructor(
        private context: StorageImporterContext
    ) {}

    async import(
        importPath: string,
        targetIdentifier: string,
        options: ImportOptions = {}
    ): Promise<ImportResult> {
        const {
            onConflict = 'error',
            commitAfterImport = true,
        } = options;

        if (!fs.existsSync(importPath)) {
            throw new ImportError(`Import file not found: ${importPath}`);
        }

        if (this.isLegacyExport(importPath)) {
            throw new ImportError('Unsupported legacy export format');
        }

        const adapter = SQLiteAdapter.open(importPath);
        
        try {
            this.validateSchema(adapter);
            
            const rootIdentifier = adapter.getMeta('rootIdentifier') || '';
            const files = adapter.getAllFiles();
            
            const importedIdentifiers: string[] = [];
            let skippedCount = 0;

            for (const file of files) {
                const newIdentifier = this.remapIdentifier(file.identifier, rootIdentifier, targetIdentifier);
                const targetPath = path.join(this.context.basePath, newIdentifier.replaceAll(':', '/'));
                
                let fileExists = false;
                if (fs.existsSync(targetPath)) {
                    const stat = fs.statSync(targetPath);
                    fileExists = stat.isFile();
                }
                
                if (fileExists) {
                    if (onConflict === 'error') {
                        throw new ConflictError(newIdentifier);
                    }
                    if (onConflict === 'skip') {
                        skippedCount++;
                        continue;
                    }
                }

                const targetDir = path.dirname(targetPath);
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                fs.writeFileSync(targetPath, file.content);
                
                const accessType = file.accessType === 'custom' && file.customId 
                    ? file.customId 
                    : file.accessType;
                this.context.accessCache[newIdentifier] = accessType;
                
                importedIdentifiers.push(newIdentifier);
            }

            if (commitAfterImport) {
                await this.context.commitAll();
            }

            return {
                success: true,
                importedCount: importedIdentifiers.length,
                skippedCount,
                identifiers: importedIdentifiers,
            };
        } finally {
            adapter.close();
        }
    }

    private validateSchema(adapter: SQLiteAdapter): void {
        try {
            const version = adapter.getMeta('version');
            if (!version) {
                throw new CorruptedDBError('Missing schema version in database');
            }
            if (version !== SCHEMA_VERSION) {
                throw new SchemaVersionError(SCHEMA_VERSION, version);
            }
        } catch (e) {
            if (e instanceof ImportError) throw e;
            throw new CorruptedDBError('Failed to validate database schema');
        }
    }

    private isLegacyExport(importPath: string): boolean {
        try {
            const db = new DatabaseSync(importPath);
            try {
                const row = db
                    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_ac_meta' LIMIT 1")
                    .get() as { name: string } | undefined;
                return !!row;
            } finally {
                db.close();
            }
        } catch {
            return false;
        }
    }

    private remapIdentifier(
        originalIdentifier: string,
        rootIdentifier: string,
        targetIdentifier: string
    ): string {
        if (rootIdentifier === '') {
            return targetIdentifier === '' 
                ? originalIdentifier 
                : `${targetIdentifier}:${originalIdentifier}`;
        }
        
        if (originalIdentifier === rootIdentifier) {
            const fileName = rootIdentifier.includes(':') 
                ? rootIdentifier.split(':').pop()! 
                : rootIdentifier;
            return targetIdentifier === '' ? fileName : `${targetIdentifier}:${fileName}`;
        }
        
        if (originalIdentifier.startsWith(rootIdentifier + ':')) {
            const suffix = originalIdentifier.slice(rootIdentifier.length + 1);
            return targetIdentifier === '' ? suffix : `${targetIdentifier}:${suffix}`;
        }
        
        return targetIdentifier === '' 
            ? originalIdentifier 
            : `${targetIdentifier}:${originalIdentifier}`;
    }
}

export default StorageImporter;
