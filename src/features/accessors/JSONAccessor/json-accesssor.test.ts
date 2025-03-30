import { JSONAccessorManager } from '.';

describe('AccessorManager', () => {
    test('JSONAccessor : copy', async () => {
        const prev = JSONAccessorManager.fromMemory();
        const next = JSONAccessorManager.fromMemory();
        
        prev.accessor.set({ message: 'Hello' });
        await prev.copy(next);
        
        expect(next.accessor.getAll()).toEqual({ message: 'Hello' });
        expect(prev.isDropped()).toBe(false);
    });

    test('JSONAccessor : move', async () => {
        const prev = JSONAccessorManager.fromMemory();
        const next = JSONAccessorManager.fromMemory();
        
        prev.accessor.set({ message: 'Hello' });
        await prev.move(next);
        
        expect(next.accessor.getAll()).toEqual({ message: 'Hello' });
        expect(prev.isDropped()).toBe(true);
    });
});