import { BinaryAccessorManager } from '.';

describe('AccessorManager', () => {
    test('BinaryAccessor : copy', async () => {
        const prev = BinaryAccessorManager.fromMemory();
        const next = BinaryAccessorManager.fromMemory();
        
        await prev.accessor.write(Buffer.from('Hello'));
        await prev.copy(next);
        
        expect(await next.accessor.read()).toEqual(Buffer.from('Hello'));
        expect(prev.isDropped()).toBe(false);
    });
    test('BinaryAccessor : move', async () => {
        const prev = BinaryAccessorManager.fromMemory();
        const next = BinaryAccessorManager.fromMemory();
        
        await prev.accessor.write(Buffer.from('Hello'));
        await prev.move(next);
        
        expect(await next.accessor.read()).toEqual(Buffer.from('Hello'));
        expect(prev.isDropped()).toBe(true);
    });
});