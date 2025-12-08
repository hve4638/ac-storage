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

        // Should return the same instance
        expect(accessor1).toBe(accessor2);
        expect(accessor2).toBe(accessor3);

        accessor1.setOne('key', 'value');
        expect(accessor3.getOne('key')).toBe('value');
    });

    test('duplicate release calls', async () => {
        const accessor = await storage.accessAsJSON('test.json');
        accessor.setOne('data', 'test');

        // First release should work
        await storage.release('test.json');

        // Second release should not throw
        await expect(storage.release('test.json')).resolves.not.toThrow();

        // Third release should also not throw
        await expect(storage.release('test.json')).resolves.not.toThrow();

        // Verify file exists on disk
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

        // First drop should delete
        await storage.drop('test.json');

        // Second drop should not throw
        await expect(storage.drop('test.json')).resolves.not.toThrow();

        // Third drop should also not throw
        await expect(storage.drop('test.json')).resolves.not.toThrow();

        // Verify destroy event fired only once
        expect(destroyLog).toEqual(['test.json']);

        // Verify file is deleted
        const filePath = path.join(testDir, 'test.json');
        expect(fs.existsSync(filePath)).toBeFalsy();
    });

    test('access → release → access cycle (3 times)', async () => {
        // Cycle 1
        const acc1 = await storage.accessAsJSON('test.json');
        acc1.setOne('cycle', 1);
        await storage.release('test.json');

        // Cycle 2
        const acc2 = await storage.accessAsJSON('test.json');
        expect(acc2.getOne('cycle')).toBe(1);
        acc2.setOne('cycle', 2);
        await storage.release('test.json');

        // Cycle 3
        const acc3 = await storage.accessAsJSON('test.json');
        expect(acc3.getOne('cycle')).toBe(2);
        acc3.setOne('cycle', 3);
        await storage.release('test.json');

        // Verify final state
        const filePath = path.join(testDir, 'test.json');
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        expect(content.cycle).toBe(3);
    });

    test('release then drop', async () => {
        const accessor = await storage.accessAsJSON('test.json');
        accessor.setOne('data', 'value');

        // Release first (saves file)
        await storage.release('test.json');

        const filePath = path.join(testDir, 'test.json');
        expect(fs.existsSync(filePath)).toBeTruthy();

        // Drop after release (should delete file)
        await storage.drop('test.json');
        expect(fs.existsSync(filePath)).toBeFalsy();
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

        // First access
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

        // First releaseDir
        await storage.releaseDir('dir');

        // Second releaseDir should not throw
        await expect(storage.releaseDir('dir')).resolves.not.toThrow();

        // Verify files exist
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

        // First dropDir
        await storage.dropDir('dir');

        // Second dropDir should not throw
        await expect(storage.dropDir('dir')).resolves.not.toThrow();

        // Verify destroy events fired only once per file
        expect(destroyLog.filter(id => id === 'dir:file1.json')).toHaveLength(1);
        expect(destroyLog.filter(id => id === 'dir:file2.txt')).toHaveLength(1);

        // Verify files are deleted
        expect(fs.existsSync(path.join(testDir, 'dir', 'file1.json'))).toBeFalsy();
        expect(fs.existsSync(path.join(testDir, 'dir', 'file2.txt'))).toBeFalsy();
    });

    test('duplicate releaseAll calls', async () => {
        await storage.accessAsJSON('file1.json');
        await storage.accessAsJSON('file2.json');

        // First releaseAll
        await storage.releaseAll();

        // Second releaseAll should not throw
        await expect(storage.releaseAll()).resolves.not.toThrow();

        // Verify files exist
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

        // First dropAll
        await storage.dropAll();
        const afterFirstDrop = destroyLog.length;

        // Second dropAll should not throw
        await expect(storage.dropAll()).resolves.not.toThrow();
        const afterSecondDrop = destroyLog.length;

        // Verify no duplicate destroy events
        expect(afterSecondDrop).toBe(afterFirstDrop);
    });

    test('mixed scenario: file1 release→drop, file2 drop→release', async () => {
        // File1: release then drop
        const acc1 = await storage.accessAsJSON('file1.json');
        acc1.setOne('file', 1);
        await storage.release('file1.json');
        
        const file1Path = path.join(testDir, 'file1.json');
        expect(fs.existsSync(file1Path)).toBeTruthy();
        
        await storage.drop('file1.json');
        expect(fs.existsSync(file1Path)).toBeFalsy();

        // File2: drop then try release (should not throw on non-existent)
        const acc2 = await storage.accessAsJSON('file2.json');
        acc2.setOne('file', 2);
        await storage.drop('file2.json');
        
        const file2Path = path.join(testDir, 'file2.json');
        expect(fs.existsSync(file2Path)).toBeFalsy();
        
        // Release after drop (file doesn't exist)
        await expect(storage.release('file2.json')).resolves.not.toThrow();
    });

    test('duplicate commit calls', async () => {
        const accessor = await storage.accessAsJSON('test.json');
        accessor.setOne('data', 'value');

        // First commit
        await storage.commit('test.json');

        // Second commit should not throw (no changes)
        await expect(storage.commit('test.json')).resolves.not.toThrow();

        // Third commit
        await expect(storage.commit('test.json')).resolves.not.toThrow();

        // Verify file exists with correct data
        const filePath = path.join(testDir, 'test.json');
        expect(fs.existsSync(filePath)).toBeTruthy();
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        expect(content.data).toBe('value');
    });

    test('commit → release → commit cycle', async () => {
        const accessor = await storage.accessAsJSON('test.json');
        accessor.setOne('step', 1);

        // First commit
        await storage.commit('test.json');

        // Release (commits and unloads)
        await storage.release('test.json');

        // Try to commit released file (should not throw)
        await expect(storage.commit('test.json')).resolves.not.toThrow();

        const filePath = path.join(testDir, 'test.json');
        expect(fs.existsSync(filePath)).toBeTruthy();
    });

    test('commit after drop', async () => {
        const accessor = await storage.accessAsJSON('test.json');
        accessor.setOne('data', 'value');

        // Drop without commit
        await storage.drop('test.json');

        // Commit after drop (should not throw, but file is gone)
        await expect(storage.commit('test.json')).resolves.not.toThrow();

        const filePath = path.join(testDir, 'test.json');
        expect(fs.existsSync(filePath)).toBeFalsy();
    });

    test('duplicate commitAll calls', async () => {
        await storage.accessAsJSON('file1.json');
        await storage.accessAsJSON('file2.json');

        // First commitAll
        await storage.commitAll();

        // Second commitAll should not throw
        await expect(storage.commitAll()).resolves.not.toThrow();

        // Third commitAll
        await expect(storage.commitAll()).resolves.not.toThrow();

        // Verify files exist
        expect(fs.existsSync(path.join(testDir, 'file1.json'))).toBeTruthy();
        expect(fs.existsSync(path.join(testDir, 'file2.json'))).toBeTruthy();
    });

    test('commit → modify → commit → release', async () => {
        const accessor = await storage.accessAsJSON('test.json');
        
        // First modification and commit
        accessor.setOne('value', 1);
        await storage.commit('test.json');

        // Second modification and commit
        accessor.setOne('value', 2);
        await storage.commit('test.json');

        // Release
        await storage.release('test.json');

        // Verify final state
        const filePath = path.join(testDir, 'test.json');
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        expect(content.value).toBe(2);
    });

    test('access → commit → commit → release → release', async () => {
        const accessor = await storage.accessAsJSON('test.json');
        accessor.setOne('data', 'test');

        // Double commit
        await storage.commit('test.json');
        await storage.commit('test.json');

        // Double release
        await storage.release('test.json');
        await expect(storage.release('test.json')).resolves.not.toThrow();

        // Verify file persists
        const filePath = path.join(testDir, 'test.json');
        expect(fs.existsSync(filePath)).toBeTruthy();
    });
});
