import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from 'data/test';
import { ACStorage } from 'features/storage';
import StorageAccess from 'features/StorageAccess';
import { IACStorage } from '../types';

/**
 * 잘못된 작업 순서 검증 테스트
 * 
 * 이 테스트는 멱등성(같은 작업 반복)이 아닌,
 * 잘못된 순서로 작업을 수행했을 때의 동작을 검증합니다.
 * 
 * 예: drop 후 commit, release 후 commit 등
 */
describe('Invalid Operation Order', () => {
    let storage: IACStorage;
    const testDir = path.join(TEST_PATH, 'invalid-operation-order-test');

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
        });
    });

    afterEach(async () => {
        await storage.dropAll();
    });

    describe('Operations after drop', () => {
        test('commit after drop should be no-op', async () => {
            const accessor = await storage.accessAsJSON('test.json');
            accessor.setOne('data', 'value');

            // Drop without commit (data lost)
            await storage.drop('test.json');

            // Commit after drop (no-op, file already deleted)
            await expect(storage.commit('test.json')).resolves.not.toThrow();

            // Verify file was deleted and stays deleted
            const filePath = path.join(testDir, 'test.json');
            expect(fs.existsSync(filePath)).toBeFalsy();
        });

        test('release after drop should be no-op', async () => {
            const accessor = await storage.accessAsJSON('test.json');
            accessor.setOne('data', 'value');

            // Drop
            await storage.drop('test.json');

            const filePath = path.join(testDir, 'test.json');
            expect(fs.existsSync(filePath)).toBeFalsy();

            // Release after drop (no-op, already removed from memory)
            await expect(storage.release('test.json')).resolves.not.toThrow();

            // File stays deleted
            expect(fs.existsSync(filePath)).toBeFalsy();
        });

        test('multiple operations after drop should all be no-op', async () => {
            const accessor = await storage.accessAsJSON('test.json');
            accessor.setOne('data', 'value');

            await storage.drop('test.json');

            // All operations after drop should not throw
            await expect(storage.commit('test.json')).resolves.not.toThrow();
            await expect(storage.release('test.json')).resolves.not.toThrow();
            await expect(storage.commit('test.json')).resolves.not.toThrow();

            const filePath = path.join(testDir, 'test.json');
            expect(fs.existsSync(filePath)).toBeFalsy();
        });
    });

    describe('Operations after release', () => {
        test('commit after release should be no-op (no accessor in memory)', async () => {
            const accessor = await storage.accessAsJSON('test.json');
            accessor.setOne('data', 'value');

            // Release (saves and unloads from memory)
            await storage.release('test.json');

            const filePath = path.join(testDir, 'test.json');
            expect(fs.existsSync(filePath)).toBeTruthy();

            // Commit after release (no-op, no accessor in memory)
            await expect(storage.commit('test.json')).resolves.not.toThrow();

            // File still exists
            expect(fs.existsSync(filePath)).toBeTruthy();
        });

        test('multiple commits after release should be no-op', async () => {
            const accessor = await storage.accessAsJSON('test.json');
            accessor.setOne('step', 1);

            await storage.commit('test.json');
            await storage.release('test.json');

            // Multiple commits after release (all no-op)
            await expect(storage.commit('test.json')).resolves.not.toThrow();
            await expect(storage.commit('test.json')).resolves.not.toThrow();
            await expect(storage.commit('test.json')).resolves.not.toThrow();

            const filePath = path.join(testDir, 'test.json');
            expect(fs.existsSync(filePath)).toBeTruthy();
        });
    });

    describe('Complex invalid sequences', () => {
        test('commit → drop → commit → release sequence', async () => {
            const accessor = await storage.accessAsJSON('test.json');
            accessor.setOne('data', 'value');

            await storage.commit('test.json');
            
            const filePath = path.join(testDir, 'test.json');
            expect(fs.existsSync(filePath)).toBeTruthy();

            await storage.drop('test.json');
            expect(fs.existsSync(filePath)).toBeFalsy();

            // Operations after drop are no-op
            await expect(storage.commit('test.json')).resolves.not.toThrow();
            await expect(storage.release('test.json')).resolves.not.toThrow();

            expect(fs.existsSync(filePath)).toBeFalsy();
        });

        test('release → commit → release → drop sequence', async () => {
            const accessor = await storage.accessAsJSON('test.json');
            accessor.setOne('data', 'value');

            await storage.release('test.json');

            const filePath = path.join(testDir, 'test.json');
            expect(fs.existsSync(filePath)).toBeTruthy();

            // Commit after release (no-op)
            await expect(storage.commit('test.json')).resolves.not.toThrow();
            
            // Second release (no-op)
            await expect(storage.release('test.json')).resolves.not.toThrow();

            // Drop on released file (no-op, need to access first to drop)
            await expect(storage.drop('test.json')).resolves.not.toThrow();

            // File still exists (drop didn't work because not in memory)
            expect(fs.existsSync(filePath)).toBeTruthy();
        });
    });

    describe('Documentation: Correct patterns', () => {
        test('correct pattern: access → modify → commit → release', async () => {
            // This is the correct pattern
            const accessor = await storage.accessAsJSON('test.json');
            accessor.setOne('data', 'value');
            
            await storage.commit('test.json');
            await storage.release('test.json');

            const filePath = path.join(testDir, 'test.json');
            expect(fs.existsSync(filePath)).toBeTruthy();
            
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            expect(content.data).toBe('value');
        });

        test('correct pattern: access → modify → drop (delete without saving)', async () => {
            // This is correct if you want to delete without saving
            const accessor = await storage.accessAsJSON('test.json');
            accessor.setOne('data', 'value');
            
            await storage.drop('test.json');

            const filePath = path.join(testDir, 'test.json');
            expect(fs.existsSync(filePath)).toBeFalsy();
        });

        test('correct pattern: release → access → modify → drop', async () => {
            // Release, then re-access if you need to drop later
            const accessor1 = await storage.accessAsJSON('test.json');
            accessor1.setOne('data', 'value');
            await storage.release('test.json');

            const filePath = path.join(testDir, 'test.json');
            expect(fs.existsSync(filePath)).toBeTruthy();

            // Re-access to drop
            const accessor2 = await storage.accessAsJSON('test.json');
            await storage.drop('test.json');
            
            expect(fs.existsSync(filePath)).toBeFalsy();
        });
    });
});
