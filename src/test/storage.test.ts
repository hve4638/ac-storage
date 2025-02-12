import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from '../test-utils';


import { NotRegisterError } from '../features/StorageAccessControl';
import { FSStorage } from '../features/storage';
import StorageAccess from '../features/StorageAccess';

describe('FSStorage Test', () => {
    const testDirectory = path.join(TEST_PATH, 'storage');
    let storage:FSStorage;
    
    beforeAll(() => {
        fs.mkdirSync(testDirectory, { recursive: true });
    });
    beforeEach(() => {
        storage = new FSStorage(testDirectory);
    });
    afterEach(() => {
        storage.dropAllAccessor();
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