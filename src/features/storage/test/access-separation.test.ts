import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from 'data/test';
import { ACStorage } from 'features/storage';
import StorageAccess from 'features/StorageAccess';
import { IACStorage } from '../types';

describe('Access API Separation', () => {
    let storage: IACStorage;
    const testDir = path.join(TEST_PATH, 'access-separation-test');

    beforeAll(() => {
        fs.mkdirSync(testDir, { recursive: true });
    });

    beforeEach(() => {
        storage = new ACStorage(testDir);
        storage.register({
            'file1.json': StorageAccess.JSON(),
            'file2.txt': StorageAccess.Text(),
            'file3.bin': StorageAccess.Binary(),
        });
    });

    afterEach(async () => {
        await storage.dropAll();
        // Clean up disk files
        const files = ['file1.json', 'file2.txt', 'file3.bin'];
        for (const file of files) {
            const filePath = path.join(testDir, file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    });

    // ===== CREATE Tests =====
    describe('create()', () => {
        test('creates new file', async () => {
            const accessor = await storage.createAsJSON('file1.json');
            accessor.setOne('test', 'value');
            await storage.commit('file1.json');

            const filePath = path.join(testDir, 'file1.json');
            expect(fs.existsSync(filePath)).toBeTruthy();

            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            expect(content.test).toBe('value');
        });

        test('throws if file exists on disk', async () => {
            // Create and commit file first
            const accessor1 = await storage.createAsJSON('file1.json');
            accessor1.setOne('existing', true);
            await storage.commit('file1.json');
            await storage.release('file1.json');

            // Try to create again - should fail
            await expect(storage.createAsJSON('file1.json')).rejects.toThrow(
                "File 'file1.json' already exists on disk"
            );
        });

        test('throws if file exists in memory', async () => {
            await storage.createAsJSON('file1.json');

            // Try to create again while in memory - should fail
            await expect(storage.createAsJSON('file1.json')).rejects.toThrow(
                "File 'file1.json' already exists in memory"
            );
        });

        test('createAsText works', async () => {
            const accessor = await storage.createAsText('file2.txt');
            await accessor.write('hello world');
            await storage.commit('file2.txt');

            const filePath = path.join(testDir, 'file2.txt');
            const content = fs.readFileSync(filePath, 'utf8');
            expect(content).toBe('hello world');
        });

        test('createAsBinary works', async () => {
            const accessor = await storage.createAsBinary('file3.bin');
            await accessor.write(Buffer.from('binary data'));
            await storage.commit('file3.bin');

            const filePath = path.join(testDir, 'file3.bin');
            expect(fs.existsSync(filePath)).toBeTruthy();
        });
    });

    // ===== OPEN Tests =====
    describe('open()', () => {
        test('loads existing file', async () => {
            // Create file first
            const create = await storage.createAsJSON('file1.json');
            create.setOne('data', 'exists');
            await storage.commit('file1.json');
            await storage.release('file1.json');

            // Open the file
            const opened = await storage.openAsJSON('file1.json');
            expect(opened.getOne('data')).toBe('exists');
        });

        test('throws if file does not exist', async () => {
            await expect(storage.openAsJSON('file1.json')).rejects.toThrow(
                "File 'file1.json' does not exist"
            );
        });

        test('returns cached accessor if already in memory', async () => {
            const accessor1 = await storage.createAsJSON('file1.json');
            accessor1.setOne('cached', true);

            const accessor2 = await storage.openAsJSON('file1.json');
            expect(accessor2.getOne('cached')).toBe(true);
        });

        test('openAsText works', async () => {
            const create = await storage.createAsText('file2.txt');
            await create.write('text content');
            await storage.commit('file2.txt');
            await storage.release('file2.txt');

            const opened = await storage.openAsText('file2.txt');
            expect(await opened.read()).toBe('text content');
        });

        test('openAsBinary works', async () => {
            const data = Buffer.from('binary');
            const create = await storage.createAsBinary('file3.bin');
            await create.write(data);
            await storage.commit('file3.bin');
            await storage.release('file3.bin');

            const opened = await storage.openAsBinary('file3.bin');
            expect(await opened.read()).toEqual(data);
        });
    });

    // ===== ACCESS Tests (기존 동작) =====
    describe('access()', () => {
        test('creates file if not exists', async () => {
            const accessor = await storage.accessAsJSON('file1.json');
            accessor.setOne('created', true);
            await storage.commit('file1.json');

            const filePath = path.join(testDir, 'file1.json');
            expect(fs.existsSync(filePath)).toBeTruthy();
        });

        test('loads file if exists', async () => {
            // Create first
            const create = await storage.createAsJSON('file1.json');
            create.setOne('existing', 'data');
            await storage.commit('file1.json');
            await storage.release('file1.json');

            // Access should load
            const accessed = await storage.accessAsJSON('file1.json');
            expect(accessed.getOne('existing')).toBe('data');
        });

        test('returns cached accessor', async () => {
            const accessor1 = await storage.accessAsJSON('file1.json');
            accessor1.setOne('same', true);

            const accessor2 = await storage.accessAsJSON('file1.json');
            expect(accessor2.getOne('same')).toBe(true);
        });
    });

    // ===== 혼합 시나리오 =====
    describe('Mixed scenarios', () => {
        test('create → commit → open same file', async () => {
            // Create
            const created = await storage.createAsJSON('file1.json');
            created.setOne('step', 1);
            await storage.commit('file1.json');
            await storage.release('file1.json');

            // Open
            const opened = await storage.openAsJSON('file1.json');
            expect(opened.getOne('step')).toBe(1);
            opened.setOne('step', 2);
            await storage.commit('file1.json');
            await storage.release('file1.json');

            // Verify on disk
            const filePath = path.join(testDir, 'file1.json');
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            expect(content.step).toBe(2);
        });

        test('create → drop → open fails', async () => {
            await storage.createAsJSON('file1.json');
            await storage.drop('file1.json');

            await expect(storage.openAsJSON('file1.json')).rejects.toThrow(
                "File 'file1.json' does not exist"
            );
        });

        test('access behaves like create when file missing', async () => {
            const accessor = await storage.accessAsJSON('file1.json');
            accessor.setOne('auto', 'created');
            await storage.commit('file1.json');

            const filePath = path.join(testDir, 'file1.json');
            expect(fs.existsSync(filePath)).toBeTruthy();
        });

        test('access behaves like open when file exists', async () => {
            // Create first
            const created = await storage.createAsJSON('file1.json');
            created.setOne('original', true);
            await storage.commit('file1.json');
            await storage.release('file1.json');

            // Access should load existing
            const accessed = await storage.accessAsJSON('file1.json');
            expect(accessed.getOne('original')).toBe(true);
        });

        test('all three methods work with different file types', async () => {
            // JSON
            const json = await storage.createAsJSON('file1.json');
            json.setOne('test', 1);
            await storage.commit('file1.json');
            await storage.release('file1.json');
            await storage.openAsJSON('file1.json');

            // Text
            const text = await storage.createAsText('file2.txt');
            await text.write('content');
            await storage.commit('file2.txt');
            await storage.release('file2.txt');
            await storage.openAsText('file2.txt');

            // Binary
            const binary = await storage.createAsBinary('file3.bin');
            await binary.write(Buffer.from('data'));
            await storage.commit('file3.bin');
            await storage.release('file3.bin');
            await storage.openAsBinary('file3.bin');
        });
    });
});
