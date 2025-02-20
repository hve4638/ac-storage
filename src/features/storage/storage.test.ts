import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from 'data/test';


import { NotRegisterError } from 'features/StorageAccessControl';
import { ACStorage } from 'features/storage';
import StorageAccess from 'features/StorageAccess';

describe('ACStorage Test', () => {
    const testDirectory = path.join(TEST_PATH, 'storage');
    let storage:ACStorage;
    
    beforeAll(() => {
        fs.mkdirSync(testDirectory, { recursive: true });
    });
    beforeEach(() => {
        storage = new ACStorage(testDirectory);
    });
    afterEach(() => {
        storage.dropAll();
    });

    test('access unregistered storage', () => {
        expect(()=>storage.getTextAccessor('config')).toThrow(NotRegisterError)
    });
    
    test('access registered storage', () => {
        storage.register({
            'config.json' : StorageAccess.JSON(),
        });
        storage.getJSONAccessor('config.json');
    });
});