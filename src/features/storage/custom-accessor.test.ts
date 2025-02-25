import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from 'data/test';

import { ACStorage, type IACStorage } from 'features/storage';
import StorageAccess from 'features/StorageAccess';

const ACCESS_EVENT_TEMPLATE = {
    init() {},
    create() {},
    load() {},
    save() {},
    exists() { return false; },
    move() {},
    copy() {},
    destroy() {},
}

describe('Storage Accessor Test', () => {
    const testDirectory = path.join(TEST_PATH, 'custom-accessor');
    let storage:IACStorage;
    let accessLog:string[] = [];
    
    beforeAll(() => {
        fs.mkdirSync(testDirectory, { recursive: true });
    });
    beforeEach(() => {
        accessLog = [];

        storage = new ACStorage(testDirectory);
        storage.register({
            'item.array' : StorageAccess.Custom('array'),
            'a.value' : StorageAccess.Custom('value', 0),
            'b.value' : StorageAccess.Custom('value', 1),
        });
        storage.addAccessEvent('array', {
            ...ACCESS_EVENT_TEMPLATE,
            init(acutalPath) {
                accessLog.push(`array.init`);
                return {
                    acutalPath,
                    array : [],
                };
            },
            create(ac, path, ...args) {
                accessLog.push(`array.create`);
            },
            load(ac, path, ...args) {
                accessLog.push(`array.load`);
            },
            save() {
                accessLog.push(`array.save`);
            },
            exists() {
                accessLog.push(`array.exists`);
                return true;
            },
            move() {
                accessLog.push(`array.move`);
            },
            copy() {
                accessLog.push(`array.copy`);
            },
            destroy() {
                accessLog.push(`array.destroy`);
            }
        });
        storage.addAccessEvent('value', {
            init(acutalPath, initValue) {
                accessLog.push(`value.init`);
                return {
                    acutalPath,
                    value : initValue,
                };
            },
            create(ac, path, ...args) {
                accessLog.push(`value.create`);
            },
            load(ac, path, ...args) {
                accessLog.push(`value.load`);
            },
            save() {
                accessLog.push(`value.save`);
            },
            exists() {
                accessLog.push(`value.exists`);
                return true;
            },
            move() {
                accessLog.push(`value.move`);
            },
            copy() {
                accessLog.push(`value.copy`);
            },
            destroy() {
                accessLog.push(`value.destroy`);
            }
        });
    });
    afterEach(() => {
        storage.dropAll();
    });

    test('CustomAccessor', () => {
        const acItemArray = storage.access('item.array', 'array') as any;
        expect(acItemArray.array).toEqual([]);
        
        const acA = storage.access('a.value', 'value') as any;
        expect(acA.value).toEqual(0);

        const acB = storage.access('b.value', 'value') as any;
        expect(acB.value).toEqual(1);
    });
    
    test('handler test', () => {
        storage.access('item.array', 'array');
        storage.drop('item.array');
        expect(accessLog).toEqual([
            'array.init',
            'array.exists',
            'array.load',
            'array.destroy'
        ]);

        accessLog.length = 0;
        
        storage.access('a.value', 'value');
        storage.access('b.value', 'value');
        storage.drop('a.value');
        storage.drop('b.value');
        expect(accessLog).toEqual([
            'value.init',
            'value.exists',
            'value.load',

            'value.init',
            'value.exists',
            'value.load',

            'value.destroy',
            'value.destroy',
        ]);
    })
});