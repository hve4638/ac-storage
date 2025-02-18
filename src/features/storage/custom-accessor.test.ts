import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from 'data/test';

import { ACStorage, type IACStorage } from 'features/storage';
import StorageAccess from 'features/StorageAccess';

describe('Storage Accessor Test', () => {
    const testDirectory = path.join(TEST_PATH, 'custom-accessor');
    let storage:IACStorage;
    
    beforeAll(() => {
        fs.mkdirSync(testDirectory, { recursive: true });
    });
    beforeEach(() => {
        storage = new ACStorage(testDirectory);
        storage.register({
            'item.array' : StorageAccess.Custom('array'),
            'a.value' : StorageAccess.Custom('value', 0),
            'b.value' : StorageAccess.Custom('value', 1),
        });
        storage.addAccessEvent('array', {
            create(acutalPath) {
                return {
                    acutalPath,
                    array : [],
                    commit() {},
                    drop() {},
                    isDropped() { return false; },
                };
            }
        });
        storage.addAccessEvent('value', {
            create(acutalPath, initValue) {
                return {
                    acutalPath,
                    value : initValue,
                    commit() {},
                    drop() {},
                    isDropped() { return false; },
                };
            }
        });
    });
    afterEach(() => {
        storage.dropAllAccessor();
    });

    test('CustomAccessor', () => {
        const acItemArray = storage.getAccessor('item.array', 'array') as any;
        expect(acItemArray.array).toEqual([]);
        
        const acA = storage.getAccessor('a.value', 'value') as any;
        expect(acA.value).toEqual(0);

        const acB = storage.getAccessor('b.value', 'value') as any;
        expect(acB.value).toEqual(1);
    });
});