import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from 'data/test';
import { ACStorage } from 'features/storage';
import StorageAccess from 'features/StorageAccess';
import { IACStorage } from '../types';

describe('Release Operations', () => {
    let storage: IACStorage;
    const testDir = path.join(TEST_PATH, 'release-test');

    beforeAll(() => {
        fs.mkdirSync(testDir, { recursive: true });
    });

    beforeEach(() => {
        storage = new ACStorage(testDir);
        storage.register({
            'file1.json': StorageAccess.JSON(),
            'file2.txt': StorageAccess.Text(),
            'file3.json': StorageAccess.JSON(),
            'dir': {
                'file4.json': StorageAccess.JSON(),
                'file5.txt': StorageAccess.Text()
            }
        });
    });

    afterEach(async () => {
        await storage.dropAll();
    });

    test('release saves and unloads file', async () => {
        // Access and modify
        const accessor = await storage.accessAsJSON('file1.json');
        accessor.setOne('key', 'value');

        // Release should commit and unload
        await storage.release('file1.json');

        // Verify file exists on disk
        const filePath = path.join(testDir, 'file1.json');
        expect(fs.existsSync(filePath)).toBeTruthy();

        // Verify content was saved
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        expect(content.key).toBe('value');
    });

    test('release does not delete file', async () => {
        // Create file
        const accessor = await storage.accessAsJSON('file1.json');
        accessor.setOne('test', 'data');
        await storage.commit('file1.json');

        const filePath = path.join(testDir, 'file1.json');
        
        // Release
        await storage.release('file1.json');

        // Verify file still exists
        expect(fs.existsSync(filePath)).toBeTruthy();
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        expect(content.test).toBe('data');
    });

    test('release commits uncommitted changes', async () => {
        // Access and modify without commit
        const accessor = await storage.accessAsJSON('file1.json');
        accessor.setOne('uncommitted', true);

        // Release should auto-commit
        await storage.release('file1.json');

        // Verify changes were saved
        const filePath = path.join(testDir, 'file1.json');
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        expect(content.uncommitted).toBe(true);
    });

    test('file can be re-accessed after release', async () => {
        // First access
        const accessor1 = await storage.accessAsJSON('file1.json');
        accessor1.setOne('first', 'access');

        // Release
        await storage.release('file1.json');

        // Re-access - should load from disk
        const accessor2 = await storage.accessAsJSON('file1.json');
        expect(accessor2.getOne('first')).toBe('access');
    });

    test('releaseDir unloads directory', async () => {
        // Access files in directory
        const acc1 = await storage.accessAsJSON('dir:file4.json');
        acc1.setOne('dir', 'file4');
        
        const acc2 = await storage.accessAsText('dir:file5.txt');
        acc2.write('file5 content');

        // Release directory
        await storage.releaseDir('dir');

        // Verify files exist
        const file4Path = path.join(testDir, 'dir', 'file4.json');
        const file5Path = path.join(testDir, 'dir', 'file5.txt');
        
        expect(fs.existsSync(file4Path)).toBeTruthy();
        expect(fs.existsSync(file5Path)).toBeTruthy();

        // Verify content
        const content4 = JSON.parse(fs.readFileSync(file4Path, 'utf8'));
        expect(content4.dir).toBe('file4');
        
        const content5 = fs.readFileSync(file5Path, 'utf8');
        expect(content5).toBe('file5 content');
    });

    test('releaseAll unloads all files', async () => {
        // Access multiple files
        const acc1 = await storage.accessAsJSON('file1.json');
        acc1.setOne('one', 1);

        const acc2 = await storage.accessAsText('file2.txt');
        acc2.write('two');

        const acc3 = await storage.accessAsJSON('dir:file4.json');
        acc3.setOne('four', 4);

        // Release all
        await storage.releaseAll();

        // Verify all files exist
        expect(fs.existsSync(path.join(testDir, 'file1.json'))).toBeTruthy();
        expect(fs.existsSync(path.join(testDir, 'file2.txt'))).toBeTruthy();
        expect(fs.existsSync(path.join(testDir, 'dir', 'file4.json'))).toBeTruthy();
    });

    test('releaseDir throws error for root directory', async () => {
        await expect(storage.releaseDir('')).rejects.toThrow(
            'Cannot release the root directory. use releaseAll() instead.'
        );
    });

    test('drop vs release comparison', async () => {
        // Setup two files
        const acc1 = await storage.accessAsJSON('file1.json');
        acc1.setOne('test', '1');

        const acc2 = await storage.accessAsText('file2.txt');
        acc2.write('test2');

        const file1Path = path.join(testDir, 'file1.json');
        const file2Path = path.join(testDir, 'file2.txt');

        // Release file1 - should save and keep file
        await storage.release('file1.json');
        expect(fs.existsSync(file1Path)).toBeTruthy();

        // Drop file2 - should delete file
        await storage.drop('file2.txt');
        expect(fs.existsSync(file2Path)).toBeFalsy();
    });

    test('release does not trigger destroy event', async () => {
        const destroyListener = jest.fn();
        storage.addListener('destroy', destroyListener);

        const accessor = await storage.accessAsJSON('file1.json');
        accessor.setOne('test', 'value');

        // Release should NOT trigger destroy event
        await storage.release('file1.json');
        expect(destroyListener).not.toHaveBeenCalled();

        // Drop SHOULD trigger destroy event
        const accessor2 = await storage.accessAsJSON('file3.json');
        await storage.drop('file3.json');
        expect(destroyListener).toHaveBeenCalledWith('file3.json');
    });

    test('release with nested dependencies', async () => {
        // Access child file (which implicitly loads parent directory)
        const fileAccessor = await storage.accessAsJSON('dir:file4.json');
        fileAccessor.setOne('nested', true);

        // Release parent should release children
        await storage.releaseDir('dir');

        // Verify file exists
        const filePath = path.join(testDir, 'dir', 'file4.json');
        expect(fs.existsSync(filePath)).toBeTruthy();
        
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        expect(content.nested).toBe(true);
    });

    test('release empty accessor does nothing', async () => {
        // Try to release non-existent file
        await expect(storage.release('file1.json')).resolves.not.toThrow();
    });

    test('releaseAll after partial operations', async () => {
        // Create some files
        const acc1 = await storage.accessAsJSON('file1.json');
        acc1.setOne('a', 1);

        // Release one
        await storage.release('file1.json');

        // Create more
        const acc2 = await storage.accessAsText('file2.txt');
        acc2.write('b');

        // ReleaseAll should handle both released and active files
        await storage.releaseAll();

        expect(fs.existsSync(path.join(testDir, 'file1.json'))).toBeTruthy();
        expect(fs.existsSync(path.join(testDir, 'file2.txt'))).toBeTruthy();
    });
});
