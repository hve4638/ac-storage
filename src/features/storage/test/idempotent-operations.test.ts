import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from 'data/test';
import { ACStorage } from 'features/storage';
import StorageAccess from 'features/StorageAccess';
import { IACStorage } from '../types';

describe('Idempotent Operations', () => {
    let storage: IACStorage;
    const testDir = path.join(TEST_PATH, 'idempotent-test');

    beforeAll(() => {
        fs.mkdirSync(testDir, { recursive: true });
    });

    beforeEach(() => {
        storage = new ACStorage(testDir);
        storage.register({
            'test.json': StorageAccess.JSON(),
            'test.txt': StorageAccess.Text(),
            'file1.json': StorageAccess.JSON(),
            'file2.json': StorageAccess.JSON(),
            'file3.json': StorageAccess.JSON(),
            'dir': {
                'file1.json': StorageAccess.JSON(),
                'file2.txt': StorageAccess.Text()
            }
        });
    });

    afterEach(async () => {
        await storage.dropAll();
    });

    test('duplicate access returns same accessor', async () => {
        const accessor1 = await storage.accessAsJSON('test.json');
        const accessor2 = await storage.accessAsJSON('test.json');
        const accessor3 = await storage.accessAsJSON('test.json');

        // Idempotent: Multiple access calls return the same instance
        expect(accessor1).toBe(accessor2);
        expect(accessor2).toBe(accessor3);

        accessor1.setOne('key', 'value');
        expect(accessor3.getOne('key')).toBe('value');
    });

    test('duplicate release calls', async () => {
        const accessor = await storage.accessAsJSON('test.json');
        accessor.setOne('data', 'test');

        // Idempotent: Multiple release calls should be safe (no-op after first)
        await storage.release('test.json');
        await expect(storage.release('test.json')).resolves.not.toThrow();
        await expect(storage.release('test.json')).resolves.not.toThrow();

        const filePath = path.join(testDir, 'test.json');
        expect(fs.existsSync(filePath)).toBeTruthy();
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        expect(content.data).toBe('test');
    });

    test('duplicate drop calls', async () => {
        const destroyLog: string[] = [];
        storage.addListener('destroy', (identifier: string) => {
            destroyLog.push(identifier);
        });

        await storage.accessAsJSON('test.json');

        // Idempotent: Multiple drop calls should be safe (no-op after first)
        await storage.drop('test.json');
        await expect(storage.drop('test.json')).resolves.not.toThrow();
        await expect(storage.drop('test.json')).resolves.not.toThrow();

        expect(destroyLog).toEqual(['test.json']);

        const filePath = path.join(testDir, 'test.json');
        expect(fs.existsSync(filePath)).toBeFalsy();
    });

    test('access → release → access cycle (3 times)', async () => {
        const acc1 = await storage.accessAsJSON('test.json');
        acc1.setOne('cycle', 1);
        await storage.release('test.json');

        const acc2 = await storage.accessAsJSON('test.json');
        expect(acc2.getOne('cycle')).toBe(1);
        acc2.setOne('cycle', 2);
        await storage.release('test.json');

        const acc3 = await storage.accessAsJSON('test.json');
        expect(acc3.getOne('cycle')).toBe(2);
        acc3.setOne('cycle', 3);
        await storage.release('test.json');

        const filePath = path.join(testDir, 'test.json');
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        expect(content.cycle).toBe(3);
    });



    test('drop then access creates new file', async () => {
        const accessLog: string[] = [];
        const destroyLog: string[] = [];

        storage.addListener('access', (identifier: string) => {
            accessLog.push(identifier);
        });
        storage.addListener('destroy', (identifier: string) => {
            destroyLog.push(identifier);
        });

        const acc1 = await storage.accessAsJSON('test.json');
        acc1.setOne('first', true);
        await storage.commit('test.json');

        // Drop
        await storage.drop('test.json');

        // Second access (should create new file)
        const acc2 = await storage.accessAsJSON('test.json');
        expect(acc2.getOne('first')).toBeUndefined(); // New file, no data

        acc2.setOne('second', true);
        await storage.commit('test.json');

        // Verify events
        expect(accessLog).toEqual(['test.json', 'test.json']);
        expect(destroyLog).toEqual(['test.json']);

        // Verify file content is new
        const filePath = path.join(testDir, 'test.json');
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        expect(content.first).toBeUndefined();
        expect(content.second).toBe(true);
    });

    test('duplicate releaseDir calls', async () => {
        await storage.accessAsJSON('dir:file1.json');
        await storage.accessAsText('dir:file2.txt');

        // Idempotent: Multiple releaseDir calls should be safe
        await storage.releaseDir('dir');
        await expect(storage.releaseDir('dir')).resolves.not.toThrow();

        expect(fs.existsSync(path.join(testDir, 'dir', 'file1.json'))).toBeTruthy();
        expect(fs.existsSync(path.join(testDir, 'dir', 'file2.txt'))).toBeTruthy();
    });

    test('duplicate dropDir calls', async () => {
        const destroyLog: string[] = [];
        storage.addListener('destroy', (identifier: string) => {
            destroyLog.push(identifier);
        });

        await storage.accessAsJSON('dir:file1.json');
        await storage.accessAsText('dir:file2.txt');

        // Idempotent: Multiple dropDir calls should be safe
        await storage.dropDir('dir');
        await expect(storage.dropDir('dir')).resolves.not.toThrow();

        expect(destroyLog.filter(id => id === 'dir:file1.json')).toHaveLength(1);
        expect(destroyLog.filter(id => id === 'dir:file2.txt')).toHaveLength(1);

        expect(fs.existsSync(path.join(testDir, 'dir', 'file1.json'))).toBeFalsy();
        expect(fs.existsSync(path.join(testDir, 'dir', 'file2.txt'))).toBeFalsy();
    });

    test('duplicate releaseAll calls', async () => {
        await storage.accessAsJSON('file1.json');
        await storage.accessAsJSON('file2.json');

        // Idempotent: Multiple releaseAll calls should be safe
        await storage.releaseAll();
        await expect(storage.releaseAll()).resolves.not.toThrow();

        expect(fs.existsSync(path.join(testDir, 'file1.json'))).toBeTruthy();
        expect(fs.existsSync(path.join(testDir, 'file2.json'))).toBeTruthy();
    });

    test('duplicate dropAll calls', async () => {
        const destroyLog: string[] = [];
        storage.addListener('destroy', (identifier: string) => {
            destroyLog.push(identifier);
        });

        await storage.accessAsJSON('file1.json');
        await storage.accessAsJSON('file2.json');

        const initialDestroyCount = destroyLog.length;

        // Idempotent: Multiple dropAll calls should be safe
        await storage.dropAll();
        const afterFirstDrop = destroyLog.length;

        await expect(storage.dropAll()).resolves.not.toThrow();
        const afterSecondDrop = destroyLog.length;

        expect(afterSecondDrop).toBe(afterFirstDrop);
    });



    test('duplicate commit calls', async () => {
        const accessor = await storage.accessAsJSON('test.json');
        accessor.setOne('data', 'value');

        // Idempotent: Multiple commit calls should be safe (no-op after first if no changes)
        await storage.commit('test.json');
        await expect(storage.commit('test.json')).resolves.not.toThrow();
        await expect(storage.commit('test.json')).resolves.not.toThrow();

        const filePath = path.join(testDir, 'test.json');
        expect(fs.existsSync(filePath)).toBeTruthy();
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        expect(content.data).toBe('value');
    });



    test('duplicate commitAll calls', async () => {
        await storage.accessAsJSON('file1.json');
        await storage.accessAsJSON('file2.json');

        // Idempotent: Multiple commitAll calls should be safe
        await storage.commitAll();
        await expect(storage.commitAll()).resolves.not.toThrow();
        await expect(storage.commitAll()).resolves.not.toThrow();

        expect(fs.existsSync(path.join(testDir, 'file1.json'))).toBeTruthy();
        expect(fs.existsSync(path.join(testDir, 'file2.json'))).toBeTruthy();
    });

    test('commit → modify → commit → release', async () => {
        const accessor = await storage.accessAsJSON('test.json');
        
        accessor.setOne('value', 1);
        await storage.commit('test.json');

        accessor.setOne('value', 2);
        await storage.commit('test.json');

        await storage.release('test.json');

        const filePath = path.join(testDir, 'test.json');
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        expect(content.value).toBe(2);
    });

    test('access → commit → commit → release → release', async () => {
        const accessor = await storage.accessAsJSON('test.json');
        accessor.setOne('data', 'test');

        // Idempotent operations can be safely combined
        await storage.commit('test.json');
        await storage.commit('test.json');

        await storage.release('test.json');
        await expect(storage.release('test.json')).resolves.not.toThrow();

        const filePath = path.join(testDir, 'test.json');
        expect(fs.existsSync(filePath)).toBeTruthy();
    });
});
