import * as fs from 'node:fs';
import * as path from 'node:path';
import { SQLiteAdapter } from './SQLiteAdapter';
import { ExportOptions, ExportResult } from './types';
import { ExportError } from './errors';

interface StorageExporterContext {
    basePath: string;
    accessCache: Record<string, string>;
    getLoadedIdentifiers(): string[];
    commitAll(): Promise<void>;
}

export class StorageExporter {
    constructor(
        private context: StorageExporterContext
    ) {}

    async export(
        identifier: string,
        exportPath: string,
        options: ExportOptions = {}
    ): Promise<ExportResult> {
        const {
            overwrite = false,
            commitBeforeExport = true,
            recursive = true,
        } = options;

        if (fs.existsSync(exportPath) && !overwrite) {
            throw new ExportError(`Export file already exists: ${exportPath}. Use overwrite option to replace.`);
        }

        if (overwrite && fs.existsSync(exportPath)) {
            fs.unlinkSync(exportPath);
        }

        if (commitBeforeExport) {
            await this.context.commitAll();
        }

        const identifiers = await this.collectIdentifiers(identifier, recursive);
        
        if (identifiers.length === 0) {
            throw new ExportError(`No files found for identifier: ${identifier}`, identifier);
        }

        const exportDir = path.dirname(exportPath);
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }

        const adapter = SQLiteAdapter.create(exportPath);
        
        try {
            adapter.setMeta('rootIdentifier', identifier);
            
            adapter.transaction(() => {
                for (const id of identifiers) {
                    const content = this.readContent(id);
                    const accessType = this.context.accessCache[id] || 'binary';
                    
                    const customId = this.isCustomAccessType(accessType) ? accessType : undefined;
                    const normalizedAccessType = customId ? 'custom' : accessType;
                    
                    adapter.insertFile(id, normalizedAccessType, content, customId);
                }
            });

            return {
                success: true,
                exportedCount: identifiers.length,
                exportPath,
                identifiers,
            };
        } finally {
            adapter.close();
        }
    }

    private async collectIdentifiers(identifier: string, recursive: boolean): Promise<string[]> {
        const result: string[] = [];
        const baseFsPath = path.join(this.context.basePath, identifier.replaceAll(':', '/'));

        if (!fs.existsSync(baseFsPath)) {
            const cachedIds = Object.keys(this.context.accessCache);
            const matching = cachedIds.filter(id => 
                id === identifier || (recursive && id.startsWith(identifier + ':'))
            );
            return matching;
        }

        const stat = fs.statSync(baseFsPath);
        
        if (stat.isFile()) {
            if (this.context.accessCache[identifier]) {
                result.push(identifier);
            }
            return result;
        }

        if (stat.isDirectory() && recursive) {
            this.collectFromDirectory(identifier, baseFsPath, result);
        }

        return result;
    }

    private collectFromDirectory(prefix: string, dirPath: string, result: string[]): void {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const entryIdentifier = prefix === '' ? entry.name : `${prefix}:${entry.name}`;
            const entryPath = path.join(dirPath, entry.name);
            
            if (entry.name.startsWith('.')) continue;
            
            if (entry.isFile()) {
                if (this.context.accessCache[entryIdentifier]) {
                    result.push(entryIdentifier);
                }
            } else if (entry.isDirectory()) {
                this.collectFromDirectory(entryIdentifier, entryPath, result);
            }
        }
    }

    private readContent(identifier: string): Buffer {
        const fsPath = path.join(this.context.basePath, identifier.replaceAll(':', '/'));
        
        if (!fs.existsSync(fsPath)) {
            throw new ExportError(`File not found: ${fsPath}`, identifier);
        }
        
        return fs.readFileSync(fsPath);
    }

    private isCustomAccessType(accessType: string): boolean {
        return !['json', 'text', 'binary', 'directory'].includes(accessType);
    }
}

export default StorageExporter;
