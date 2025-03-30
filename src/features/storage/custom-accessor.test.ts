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
            async create(ac, path, ...args) {
                accessLog.push(`array.create`);
            },
            async load(ac, path, ...args) {
                accessLog.push(`array.load`);
            },
            async save() {
                accessLog.push(`array.save`);
            },
            async exists() {
                accessLog.push(`array.exists`);
                return true;
            },
            async move() {
                accessLog.push(`array.move`);
            },
            async copy() {
                accessLog.push(`array.copy`);
            },
            async destroy() {
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
            async create(ac, path, ...args) {
                accessLog.push(`value.create`);
            },
            async load(ac, path, ...args) {
                accessLog.push(`value.load`);
            },
            async save() {
                accessLog.push(`value.save`);
            },
            async exists() {
                accessLog.push(`value.exists`);
                return true;
            },
            async move() {
                accessLog.push(`value.move`);
            },
            async copy() {
                accessLog.push(`value.copy`);
            },
            async destroy() {
                accessLog.push(`value.destroy`);
            }
        });
    });
    afterEach(() => {
        storage.dropAll();
    });

    test('CustomAccessor', async () => {
        const acItemArray = await storage.access('item.array', 'array') as any;
        expect(acItemArray.array).toEqual([]);
        
        const acA = await storage.access('a.value', 'value') as any;
        expect(acA.value).toEqual(0);

        const acB = await storage.access('b.value', 'value') as any;
        expect(acB.value).toEqual(1);
    });
    
    test('handler test', async () => {
        await storage.access('item.array', 'array');
        await storage.drop('item.array');
        expect(accessLog).toEqual([
            'array.init',
            'array.exists',
            'array.load',
            'array.destroy'
        ]);

        accessLog.length = 0;
        
        await storage.access('a.value', 'value');
        await storage.access('b.value', 'value');
        await storage.drop('a.value');
        await storage.drop('b.value');
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