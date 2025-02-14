import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from 'data/test';

import { ACStorage, type IACStorage } from 'features/storage';
import StorageAccess from 'features/StorageAccess';
import { IAccessor, IAccessorManager } from 'features/accessors';

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
                const ac = {
                    acutalPath,
                    array : [],
                    commit() {},
                    drop() {},
                    get dropped() { return false; },
                };
                return {
                    accessor : ac,
                    copy() { return {} as any; },
                    move() { return {} as any; },
                    dependBy: [],
                    dependOn: [],
                    commit() {},
                    drop() {},
                    isDropped() { return false; },
                } as IAccessorManager<any>;
            }
        });
        storage.addAccessEvent('value', {
            create(acutalPath, initValue) {
                const ac = {
                    acutalPath,
                    value : initValue,
                    commit() {},
                    drop() {},
                    get dropped() { return false; },
                };
                return {
                    accessor : ac,
                    copy() { return {} as any; },
                    move() { return {} as any; },
                    dependBy: [],
                    dependOn: [],
                    commit() {},
                    drop() {},
                    isDropped() { return false; },
                } as IAccessorManager<any>;
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