import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from '../test-utils';

import { FSStorage, StorageAccess } from '..';

describe('FSStorage Accessor Test', () => {
    const testDirectory = path.join(TEST_PATH, 'storage-accessor');
    let storage:FSStorage;
    
    beforeAll(() => {
        fs.mkdirSync(testDirectory, { recursive: true });
    });
    beforeEach(() => {
        storage = new FSStorage(testDirectory);
        storage.register({
            '**/*' : StorageAccess.ANY,
        });
    });
    afterEach(() => {
        storage.dropAllAccessor();
    });
    
    test('JSONAccessor', () => {
        const accessor = storage.getJSONAccessor('config.json');

        expect(accessor.get('key1')).toBeUndefined(); 

        accessor.set('key1', 'value1');
        expect(accessor.get('key1')).not.toBeUndefined();
    });

    test('TextAccessor', () => {
        const accessor = storage.getTextAccessor('data.txt');
        
        expect(accessor.read()).toBe('');
        
        const part1 = 'hello';
        const part2 = 'world';
        
        accessor.write(part1);
        expect(accessor.read()).toBe(part1);

        accessor.append(part2);
        expect(accessor.read()).toBe(part1 + part2);
    });

    test('BinaryAccessor', () => {
        const accessor = storage.getBinaryAccessor('data.bin');
        
        expect(accessor.read().toString()).toBe('');

        const plainText = 'hello, world!';
        const base64Text = Buffer.from(plainText).toString('base64');
    
        accessor.write(Buffer.from(plainText));
        expect(accessor.readBase64()).toBe(base64Text);
        expect(accessor.read().toString()).toBe(plainText);

        accessor.writeBase64(base64Text);
        expect(accessor.readBase64()).toBe(base64Text);
        expect(accessor.read().toString()).toBe(plainText);
    });
});