import * as fs from 'node:fs';
import * as path from 'node:path';
import { writeFileSync } from '@/lib/fs';
import { SQLiteAdapter } from '../SQLiteAdapter';
import { SCHEMA_VERSION } from '../types';

const TEST_DIR = path.join(__dirname, '.test-sqlite-adapter');

describe('SQLiteAdapter', () => {
    beforeEach(() => {
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true });
        }
        fs.mkdirSync(TEST_DIR, { recursive: true });
    });

    afterEach(() => {
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true });
        }
    });

    describe('create', () => {
        it('should create a new database with schema', () => {
            const dbPath = path.join(TEST_DIR, 'test.db');
            const adapter = SQLiteAdapter.create(dbPath);
            
            expect(fs.existsSync(dbPath)).toBe(true);
            expect(adapter.getMeta('version')).toBe(SCHEMA_VERSION);
            expect(adapter.getMeta('exportedAt')).toBeDefined();
            
            adapter.close();
        });

        it('should throw if file already exists', () => {
            const dbPath = path.join(TEST_DIR, 'existing.db');
            writeFileSync(dbPath, '');
            
            expect(() => SQLiteAdapter.create(dbPath)).toThrow('File already exists');
        });
    });

    describe('open', () => {
        it('should open an existing database', () => {
            const dbPath = path.join(TEST_DIR, 'test.db');
            const adapter1 = SQLiteAdapter.create(dbPath);
            adapter1.setMeta('testKey', 'testValue');
            adapter1.close();

            const adapter2 = SQLiteAdapter.open(dbPath);
            expect(adapter2.getMeta('testKey')).toBe('testValue');
            adapter2.close();
        });

        it('should throw if file does not exist', () => {
            const dbPath = path.join(TEST_DIR, 'nonexistent.db');
            expect(() => SQLiteAdapter.open(dbPath)).toThrow('File not found');
        });
    });

    describe('file operations', () => {
        it('should insert and retrieve a file', () => {
            const dbPath = path.join(TEST_DIR, 'test.db');
            const adapter = SQLiteAdapter.create(dbPath);
            
            const content = Buffer.from('{"key": "value"}');
            adapter.insertFile('auth:config.json', 'json', content);
            
            const file = adapter.getFile('auth:config.json');
            expect(file).toBeDefined();
            expect(file!.identifier).toBe('auth:config.json');
            expect(file!.accessType).toBe('json');
            expect(file!.content.toString()).toBe('{"key": "value"}');
            
            adapter.close();
        });

        it('should get all files', () => {
            const dbPath = path.join(TEST_DIR, 'test.db');
            const adapter = SQLiteAdapter.create(dbPath);
            
            adapter.insertFile('file1.json', 'json', Buffer.from('1'));
            adapter.insertFile('file2.txt', 'text', Buffer.from('2'));
            adapter.insertFile('file3.bin', 'binary', Buffer.from('3'));
            
            const files = adapter.getAllFiles();
            expect(files.length).toBe(3);
            
            adapter.close();
        });

        it('should get files by prefix', () => {
            const dbPath = path.join(TEST_DIR, 'test.db');
            const adapter = SQLiteAdapter.create(dbPath);
            
            adapter.insertFile('auth:user.json', 'json', Buffer.from('1'));
            adapter.insertFile('auth:token.json', 'json', Buffer.from('2'));
            adapter.insertFile('cache:data.txt', 'text', Buffer.from('3'));
            
            const authFiles = adapter.getFilesByPrefix('auth:');
            expect(authFiles.length).toBe(2);
            
            const cacheFiles = adapter.getFilesByPrefix('cache:');
            expect(cacheFiles.length).toBe(1);
            
            adapter.close();
        });

        it('should handle custom accessor', () => {
            const dbPath = path.join(TEST_DIR, 'test.db');
            const adapter = SQLiteAdapter.create(dbPath);
            
            adapter.insertFile('custom:file', 'custom', Buffer.from('data'), 'myCustomId');
            
            const file = adapter.getFile('custom:file');
            expect(file!.accessType).toBe('custom');
            expect(file!.customId).toBe('myCustomId');
            
            adapter.close();
        });
    });

    describe('transaction', () => {
        it('should execute operations in a transaction', () => {
            const dbPath = path.join(TEST_DIR, 'test.db');
            const adapter = SQLiteAdapter.create(dbPath);
            
            adapter.transaction(() => {
                adapter.insertFile('file1.json', 'json', Buffer.from('1'));
                adapter.insertFile('file2.json', 'json', Buffer.from('2'));
            });
            
            expect(adapter.getFileCount()).toBe(2);
            
            adapter.close();
        });
    });

    describe('validateSchema', () => {
        it('should return true for valid schema', () => {
            const dbPath = path.join(TEST_DIR, 'test.db');
            const adapter = SQLiteAdapter.create(dbPath);
            
            expect(adapter.validateSchema()).toBe(true);
            
            adapter.close();
        });
    });
});
