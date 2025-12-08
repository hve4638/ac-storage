import { JSONAccessorManager } from './JSONAccessor';
import { TextAccessorManager } from './TextAccessor';
import { BinaryAccessorManager } from './BinaryAccessor';

describe('Accessor Idempotent Operations', () => {
    describe('JSONAccessor', () => {
        test('duplicate commit', async () => {
            const manager = JSONAccessorManager.fromMemory();
            manager.accessor.setOne('key', 'value');

            // First commit
            await manager.commit();
            expect(manager.isDropped()).toBe(false);

            // Second commit
            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(false);

            // Third commit
            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(false);

            // Verify data integrity
            expect(manager.accessor.getOne('key')).toBe('value');
        });

        test('duplicate drop', async () => {
            const manager = JSONAccessorManager.fromMemory();
            manager.accessor.setOne('test', 'data');

            // First drop
            await manager.drop();
            expect(manager.isDropped()).toBe(true);

            // Second drop
            await expect(manager.drop()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);

            // Third drop
            await expect(manager.drop()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);
        });

        test('commit → commit → commit with modifications', async () => {
            const manager = JSONAccessorManager.fromMemory();

            manager.accessor.setOne('count', 1);
            await manager.commit();

            manager.accessor.setOne('count', 2);
            await manager.commit();

            manager.accessor.setOne('count', 3);
            await manager.commit();

            expect(manager.isDropped()).toBe(false);
            expect(manager.accessor.getOne('count')).toBe(3);
        });

        test('commit → drop sequence', async () => {
            const manager = JSONAccessorManager.fromMemory();
            manager.accessor.setOne('data', 'value');

            // Commit first
            await manager.commit();
            expect(manager.isDropped()).toBe(false);

            // Then drop
            await manager.drop();
            expect(manager.isDropped()).toBe(true);
        });

        test('drop → commit sequence', async () => {
            const manager = JSONAccessorManager.fromMemory();
            manager.accessor.setOne('data', 'value');

            // Drop first
            await manager.drop();
            expect(manager.isDropped()).toBe(true);

            // Then commit (should not throw)
            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);
        });

        test('commit → drop → commit mixed', async () => {
            const manager = JSONAccessorManager.fromMemory();
            manager.accessor.setOne('test', 'value');

            // Commit
            await manager.commit();

            // Drop
            await manager.drop();
            expect(manager.isDropped()).toBe(true);

            // Commit again after drop
            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);
        });

        test('drop → drop → commit mixed', async () => {
            const manager = JSONAccessorManager.fromMemory();
            manager.accessor.setOne('data', 'test');

            // Double drop
            await manager.drop();
            await manager.drop();
            expect(manager.isDropped()).toBe(true);

            // Commit after drops
            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);
        });

        test('commit without data write', async () => {
            const manager = JSONAccessorManager.fromMemory();

            // No data write, just commit
            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(false);
        });

        test('drop without commit', async () => {
            const manager = JSONAccessorManager.fromMemory();
            manager.accessor.setOne('uncommitted', true);

            // Drop without commit (data loss)
            await manager.drop();
            expect(manager.isDropped()).toBe(true);
        });

        test('drop without data write', async () => {
            const manager = JSONAccessorManager.fromMemory();

            // No data write, just drop
            await expect(manager.drop()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);
        });

        test('copy then drop original and commit copy', async () => {
            const original = JSONAccessorManager.fromMemory();
            const copy = JSONAccessorManager.fromMemory();

            original.accessor.setOne('original', 'data');
            await original.copy(copy);

            // Drop original
            await original.drop();
            expect(original.isDropped()).toBe(true);

            // Commit copy
            await copy.commit();
            expect(copy.isDropped()).toBe(false);
            expect(copy.accessor.getOne('original')).toBe('data');
        });

        test('move then try commit/drop on original', async () => {
            const original = JSONAccessorManager.fromMemory();
            const target = JSONAccessorManager.fromMemory();

            original.accessor.setOne('data', 'value');
            await original.move(target);

            // Original should be dropped after move
            expect(original.isDropped()).toBe(true);

            // Try commit on dropped original
            await expect(original.commit()).resolves.not.toThrow();
            expect(original.isDropped()).toBe(true);

            // Try drop on dropped original
            await expect(original.drop()).resolves.not.toThrow();
            expect(original.isDropped()).toBe(true);
        });
    });

    describe('TextAccessor', () => {
        test('duplicate commit', async () => {
            const manager = TextAccessorManager.fromMemory();
            await manager.accessor.write('test content');

            await manager.commit();
            expect(manager.isDropped()).toBe(false);

            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(false);

            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(false);

            expect(await manager.accessor.read()).toBe('test content');
        });

        test('duplicate drop', async () => {
            const manager = TextAccessorManager.fromMemory();
            await manager.accessor.write('test data');

            await manager.drop();
            expect(manager.isDropped()).toBe(true);

            await expect(manager.drop()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);

            await expect(manager.drop()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);
        });

        test('commit → commit → commit with modifications', async () => {
            const manager = TextAccessorManager.fromMemory();

            await manager.accessor.write('version 1');
            await manager.commit();

            await manager.accessor.write('version 2');
            await manager.commit();

            await manager.accessor.write('version 3');
            await manager.commit();

            expect(manager.isDropped()).toBe(false);
            expect(await manager.accessor.read()).toBe('version 3');
        });

        test('commit → drop sequence', async () => {
            const manager = TextAccessorManager.fromMemory();
            await manager.accessor.write('data');

            await manager.commit();
            expect(manager.isDropped()).toBe(false);

            await manager.drop();
            expect(manager.isDropped()).toBe(true);
        });

        test('drop → commit sequence', async () => {
            const manager = TextAccessorManager.fromMemory();
            await manager.accessor.write('data');

            await manager.drop();
            expect(manager.isDropped()).toBe(true);

            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);
        });

        test('commit → drop → commit mixed', async () => {
            const manager = TextAccessorManager.fromMemory();
            await manager.accessor.write('test');

            await manager.commit();
            await manager.drop();
            expect(manager.isDropped()).toBe(true);

            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);
        });

        test('drop → drop → commit mixed', async () => {
            const manager = TextAccessorManager.fromMemory();
            await manager.accessor.write('data');

            await manager.drop();
            await manager.drop();
            expect(manager.isDropped()).toBe(true);

            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);
        });

        test('commit without data write', async () => {
            const manager = TextAccessorManager.fromMemory();

            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(false);
        });

        test('drop without commit', async () => {
            const manager = TextAccessorManager.fromMemory();
            await manager.accessor.write('uncommitted data');

            await manager.drop();
            expect(manager.isDropped()).toBe(true);
        });

        test('drop without data write', async () => {
            const manager = TextAccessorManager.fromMemory();

            await expect(manager.drop()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);
        });

        test('copy then drop original and commit copy', async () => {
            const original = TextAccessorManager.fromMemory();
            const copy = TextAccessorManager.fromMemory();

            await original.accessor.write('original data');
            await original.copy(copy);

            await original.drop();
            expect(original.isDropped()).toBe(true);

            await copy.commit();
            expect(copy.isDropped()).toBe(false);
            expect(await copy.accessor.read()).toBe('original data');
        });

        test('move then try commit/drop on original', async () => {
            const original = TextAccessorManager.fromMemory();
            const target = TextAccessorManager.fromMemory();

            await original.accessor.write('data');
            await original.move(target);

            expect(original.isDropped()).toBe(true);

            await expect(original.commit()).resolves.not.toThrow();
            expect(original.isDropped()).toBe(true);

            await expect(original.drop()).resolves.not.toThrow();
            expect(original.isDropped()).toBe(true);
        });
    });

    describe('BinaryAccessor', () => {
        test('duplicate commit', async () => {
            const manager = BinaryAccessorManager.fromMemory();
            await manager.accessor.write(Buffer.from('test binary'));

            await manager.commit();
            expect(manager.isDropped()).toBe(false);

            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(false);

            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(false);

            const result = await manager.accessor.read();
            expect(result.toString()).toBe('test binary');
        });

        test('duplicate drop', async () => {
            const manager = BinaryAccessorManager.fromMemory();
            await manager.accessor.write(Buffer.from('test'));

            await manager.drop();
            expect(manager.isDropped()).toBe(true);

            await expect(manager.drop()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);

            await expect(manager.drop()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);
        });

        test('commit → commit → commit with modifications', async () => {
            const manager = BinaryAccessorManager.fromMemory();

            await manager.accessor.write(Buffer.from('v1'));
            await manager.commit();

            await manager.accessor.write(Buffer.from('v2'));
            await manager.commit();

            await manager.accessor.write(Buffer.from('v3'));
            await manager.commit();

            expect(manager.isDropped()).toBe(false);
            const result = await manager.accessor.read();
            expect(result.toString()).toBe('v3');
        });

        test('commit → drop sequence', async () => {
            const manager = BinaryAccessorManager.fromMemory();
            await manager.accessor.write(Buffer.from('data'));

            await manager.commit();
            expect(manager.isDropped()).toBe(false);

            await manager.drop();
            expect(manager.isDropped()).toBe(true);
        });

        test('drop → commit sequence', async () => {
            const manager = BinaryAccessorManager.fromMemory();
            await manager.accessor.write(Buffer.from('data'));

            await manager.drop();
            expect(manager.isDropped()).toBe(true);

            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);
        });

        test('commit → drop → commit mixed', async () => {
            const manager = BinaryAccessorManager.fromMemory();
            await manager.accessor.write(Buffer.from('test'));

            await manager.commit();
            await manager.drop();
            expect(manager.isDropped()).toBe(true);

            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);
        });

        test('drop → drop → commit mixed', async () => {
            const manager = BinaryAccessorManager.fromMemory();
            await manager.accessor.write(Buffer.from('data'));

            await manager.drop();
            await manager.drop();
            expect(manager.isDropped()).toBe(true);

            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);
        });

        test('commit without data write', async () => {
            const manager = BinaryAccessorManager.fromMemory();

            await expect(manager.commit()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(false);
        });

        test('drop without commit', async () => {
            const manager = BinaryAccessorManager.fromMemory();
            await manager.accessor.write(Buffer.from('uncommitted'));

            await manager.drop();
            expect(manager.isDropped()).toBe(true);
        });

        test('drop without data write', async () => {
            const manager = BinaryAccessorManager.fromMemory();

            await expect(manager.drop()).resolves.not.toThrow();
            expect(manager.isDropped()).toBe(true);
        });

        test('copy then drop original and commit copy', async () => {
            const original = BinaryAccessorManager.fromMemory();
            const copy = BinaryAccessorManager.fromMemory();

            await original.accessor.write(Buffer.from('original'));
            await original.copy(copy);

            await original.drop();
            expect(original.isDropped()).toBe(true);

            await copy.commit();
            expect(copy.isDropped()).toBe(false);
            const result = await copy.accessor.read();
            expect(result.toString()).toBe('original');
        });

        test('move then try commit/drop on original', async () => {
            const original = BinaryAccessorManager.fromMemory();
            const target = BinaryAccessorManager.fromMemory();

            await original.accessor.write(Buffer.from('data'));
            await original.move(target);

            expect(original.isDropped()).toBe(true);

            await expect(original.commit()).resolves.not.toThrow();
            expect(original.isDropped()).toBe(true);

            await expect(original.drop()).resolves.not.toThrow();
            expect(original.isDropped()).toBe(true);
        });
    });
});
