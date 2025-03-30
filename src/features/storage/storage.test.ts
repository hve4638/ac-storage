import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from 'data/test';


import { DirectoryAccessError, NotRegisterError } from 'features/StorageAccessControl';
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
        storage.register({
            'layer1' : {
                'registered.txt' : StorageAccess.Text(),
            },
            'registered.txt' : StorageAccess.Text(),
        });
    });
    afterEach(() => {
        storage.dropAll();
    });

    test('access unregistered storage', async () => {
        await expect(storage.accessAsText('unregistered.txt')).rejects.toThrow(NotRegisterError)
    });
    
    test('access registered storage', async () => {
        storage.register({ 'config.json' : StorageAccess.Text() });
        storage.accessAsText('config.json');
    });

    test('access directory', async () => {
        await expect(async ()=>await storage.accessAsText('layer1')).rejects.toThrow(DirectoryAccessError);
    });
});