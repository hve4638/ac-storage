import { BinaryAccessorManager } from './BinaryAccessor';
import { JSONAccessorManager } from './JSONAccessor';
import { TextAccessorManager } from './TextAccessor';


describe('AccessorManager', () => {
    test('BinaryAccessor : copy', () => {
        const prev = BinaryAccessorManager.fromMemory();
        const next = BinaryAccessorManager.fromMemory();
        
        prev.accessor.write(Buffer.from('Hello'));
        prev.copy(next);
        
        expect(next.accessor.read()).toEqual(Buffer.from('Hello'));
        expect(prev.isDropped()).toBe(false);
    });
    test('BinaryAccessor : move', () => {
        const prev = BinaryAccessorManager.fromMemory();
        const next = BinaryAccessorManager.fromMemory();
        
        prev.accessor.write(Buffer.from('Hello'));
        prev.move(next);
        
        expect(next.accessor.read()).toEqual(Buffer.from('Hello'));
        expect(prev.isDropped()).toBe(true);
    });

    test('TextAccessor : copy', () => {
        const prev = TextAccessorManager.fromMemory();
        const next = TextAccessorManager.fromMemory();
        
        prev.accessor.write('Hello');
        prev.copy(next);
        
        expect(next.accessor.read()).toEqual('Hello');
        expect(prev.isDropped()).toBe(false);
    });
    test('TextAccessor : move', () => {
        const prev = TextAccessorManager.fromMemory();
        const next = TextAccessorManager.fromMemory();
        
        prev.accessor.write('Hello');
        prev.move(next);
        
        expect(next.accessor.read()).toEqual('Hello');
        expect(prev.isDropped()).toBe(true);
    });

    test('JSONAccessor : copy', () => {
        const prev = JSONAccessorManager.fromMemory();
        const next = JSONAccessorManager.fromMemory();
        
        prev.accessor.set({ message: 'Hello' });
        prev.copy(next);
        
        expect(next.accessor.getAll()).toEqual({ message: 'Hello' });
        expect(prev.isDropped()).toBe(false);
    });

    test('JSONAccessor : move', () => {
        const prev = JSONAccessorManager.fromMemory();
        const next = JSONAccessorManager.fromMemory();
        
        prev.accessor.set({ message: 'Hello' });
        prev.move(next);
        
        expect(next.accessor.getAll()).toEqual({ message: 'Hello' });
        expect(prev.isDropped()).toBe(true);
    });
});