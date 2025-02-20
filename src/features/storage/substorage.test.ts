import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from 'data/test';


import { DirectoryAccessError, NotRegisterError } from 'features/StorageAccessControl';
import { ACStorage, StorageError } from 'features/storage';
import StorageAccess from 'features/StorageAccess';

describe('ACSubStorage', () => {
    const testDirectory = path.join(TEST_PATH, 'storage');
    let storage:ACStorage;
    
    beforeAll(() => {
        fs.mkdirSync(testDirectory, { recursive: true });
    });
    beforeEach(() => {
        storage = new ACStorage(testDirectory);
        storage.register({
            'layer1' : {
                'layer2' : {
                    '*' : StorageAccess.JSON(),
                }
            },
        });
    });
    afterEach(() => {
        storage.dropAll();
    });

    test('substorage', () => {
        const storageLayer1 = storage.subStorage('layer1');

        const item1FromSubstorage = storageLayer1.getJSONAccessor('layer2:item1.json');
        item1FromSubstorage.setOne('value', '1');

        const item1 = storage.getJSONAccessor('layer1:layer2:item1.json');
        expect(item1.getOne('value')).toBe('1');
    });

    test('substorage commit', () => {
        expect(()=>storage.subStorage('unregistered')).toThrow(StorageError);
    });
});