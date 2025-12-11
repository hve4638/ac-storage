import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from 'data/test';

import { ACStorage } from 'features/storage';
import StorageAccess from 'features/StorageAccess';
import { JSONType } from '@hve/json-accessor';

type AC = [string, string];
type COPY_OR_MOVE_TEST_STRUCT = {
    before : AC[],
    copy: [string, string],
}

// ACStorage가 파일시스템과 연동되는지 테스트
describe('ACStorage Accessor 복사/이동 테스트', () => {
    const testDirectory = path.join(TEST_PATH, 'storage-move');
    let storage:ACStorage;

    const TREE = {
        'json1' : {
            '*' : StorageAccess.JSON({ value : JSONType.Number() }),
        },
        'json2' : {
            '*' : StorageAccess.JSON({ value : JSONType.Number() }),
        },
        'text1' : {
            '*' : StorageAccess.Text(),
        },
        'text2' : {
            '*' : StorageAccess.Text(),
        },
        '*' : {
            'index.json' : StorageAccess.JSON({ value : JSONType.Number() }),
        }
    }
    const passTestcases:COPY_OR_MOVE_TEST_STRUCT[] = [
        {
            before : [['json1:index.json', 'json']],
            copy : ['json1:index.json', 'json2:index.json'],
        },
        {
            before : [['json1:item1.json', 'json']],
            copy : ['json1:item1.json', 'json2:item2.json'],
        },
        {
            before : [['text1:item1.txt', 'text']],
            copy : ['text1:item1.txt', 'text2:item2.txt'],
        },
        {
            before : [['text1:item1.txt', 'text']],
            copy : ['text1:item1.txt', 'text2:item2.txt'],
        },
        {
            before : [['dir1:index.json', 'json']],
            copy : ['dir1', 'dir2'],
        },
    ];
    const failTestcases:COPY_OR_MOVE_TEST_STRUCT[] = [
        {
            before : [['json1:index.json', 'json']],
            copy : ['json1:index.json', 'text1:index.txt'],
        },
    ];
    
    beforeAll(() => {
        fs.rmSync(testDirectory, { recursive: true, force: true });
    });
    beforeEach(() => {
        fs.mkdirSync(testDirectory, { recursive: true });
        storage = new ACStorage(testDirectory);
        storage.register(TREE);
    });
    afterEach(async () => {
        await storage.dropAll();
        fs.rmSync(testDirectory, { recursive: true, force: true });
    });

    for (const { before, copy } of passTestcases) {
        test(`copy (${copy[0]} -> ${copy[1]})`, async () => {
            for(const [identifier, ac] of before) {
                await storage.access(identifier, ac);
            }
            await storage.copy(copy[0], copy[1]);
        });
    }

    for (const { before, copy } of failTestcases) {
        test(`copy (${copy[0]} -> ${copy[1]})`, async () => {
            for(const [identifier, ac] of before) {
                await storage.access(identifier, ac);
            }
            await expect(storage.copy(copy[0], copy[1])).rejects.toThrow();
        });
    }
    

});