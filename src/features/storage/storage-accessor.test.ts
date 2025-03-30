import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from 'data/test';

import { type IACStorage, MemACStorage } from 'features/storage';
import StorageAccess from 'features/StorageAccess';

/**
 * 기본 Accessor에 대한 테스트
 * ACStorage로 부터 Accessor를 가져와서 사용하는 테스트
 * 
 * Accessor 각각에 대한 자세한 테스트는 accessors 테스트로 따로 진행
 * */
describe('Storage Accessor Test', () => {
    const testDirectory = path.join(TEST_PATH, 'storage-accessor');
    let storage:IACStorage;
    
    beforeAll(() => {
        fs.mkdirSync(testDirectory, { recursive: true });
    });
    beforeEach(() => {
        storage = new MemACStorage();
        storage.register({
            '**/*' : StorageAccess.Union(
                StorageAccess.JSON(),
                StorageAccess.Text(),
                StorageAccess.Binary(),
            ),
        });
    });
    afterEach(() => {
        storage.dropAll();
    });
    
    test('JSONAccessor', async () => {
        const accessor = await storage.accessAsJSON('config.json');

        expect(accessor.getOne('key1')).toBeUndefined(); 

        accessor.setOne('key1', 'value1');
        expect(accessor.getOne('key1')).not.toBeUndefined();
    });

    test('TextAccessor', async () => {
        const accessor = await storage.accessAsText('data.txt');
        
        expect(await accessor.read()).toBe('');
        
        const part1 = 'hello';
        const part2 = 'world';
        
        accessor.write(part1);
        expect(await accessor.read()).toBe(part1);

        accessor.append(part2);
        expect(await accessor.read()).toBe(part1 + part2);
    });

    test('BinaryAccessor', async () => {
        const accessor = await storage.accessAsBinary('data.bin');
        
        expect((await accessor.read()).toString()).toBe('');

        const plainText = 'hello, world!';
        const base64Text = Buffer.from(plainText).toString('base64');
    
        await accessor.write(Buffer.from(plainText));
        expect(await accessor.readBase64()).toBe(base64Text);
        expect((await accessor.read()).toString()).toBe(plainText);

        await accessor.writeBase64(base64Text);
        expect(await accessor.readBase64()).toBe(base64Text);
        expect((await accessor.read()).toString()).toBe(plainText);
    });
});