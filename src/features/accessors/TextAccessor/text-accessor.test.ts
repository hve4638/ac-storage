import { TextAccessorManager } from '.';

describe('text access', () => {
    test('TextAccessor : copy', async () => {
        const prev = TextAccessorManager.fromMemory();
        const next = TextAccessorManager.fromMemory();
        
        await prev.accessor.write('Hello');
        await prev.copy(next);
        
        expect(await next.accessor.read()).toEqual('Hello');
        expect(prev.isDropped()).toBe(false);
    });
    test('TextAccessor : move', async () => {
        const prev = TextAccessorManager.fromMemory();
        const next = TextAccessorManager.fromMemory();
        
        await prev.accessor.write('Hello');
        await prev.move(next);
        
        expect(await next.accessor.read()).toEqual('Hello');
        expect(prev.isDropped()).toBe(true);
    });
});