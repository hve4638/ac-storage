import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from '../test-utils';

import { type IStorage, MemStorage } from '../features/storage';
import StorageAccess from '../features/StorageAccess';
import { IAccessor } from 'features/accessors';

describe('Storage Accessor Test', () => {
    const testDirectory = path.join(TEST_PATH, 'storage-accessor');
    let storage:IStorage;
    
    beforeAll(() => {
        fs.mkdirSync(testDirectory, { recursive: true });
    });
    beforeEach(() => {
        storage = new MemStorage();
        storage.register({
            '**/*' : StorageAccess.Union(
                StorageAccess.JSON(),
                StorageAccess.Text(),
                StorageAccess.Binary(),
            ),
        });
    });
    afterEach(() => {
        storage.dropAllAccessor();
    });
    
    test('JSONAccessor', () => {
        const accessor = storage.getJSONAccessor('config.json');

        expect(accessor.getOne('key1')).toBeUndefined(); 

        accessor.setOne('key1', 'value1');
        expect(accessor.getOne('key1')).not.toBeUndefined();
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