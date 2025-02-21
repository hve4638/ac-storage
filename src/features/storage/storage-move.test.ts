import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from 'data/test';

import { ACStorage } from 'features/storage';
import StorageAccess from 'features/StorageAccess';
import { JSONType } from 'types/json';


// ACStorage가 파일시스템과 연동되는지 테스트
describe('ACStorage Accessor 복사/이동 테스트', () => {
    const testDirectory = path.join(TEST_PATH, 'storage-move');
    let storage:ACStorage;

    const TREE = {
        'json1' : {
            '*' : StorageAccess.JSON({ value : JSONType.number }),
        },
        'json2' : {
            '*' : StorageAccess.JSON({ value : JSONType.number }),
        },
        'text1' : {
            '*' : StorageAccess.Text(),
        },
        'text2' : {
            '*' : StorageAccess.Text(),
        },
    }
    const passTestcases = [
        ['json', 'json1:index.json', 'json2:index.json'],
        ['json', 'json1:item1.json', 'json2:item2.json'],
        ['text', 'text1:item1.txt', 'text2:item2.txt'],
    ];
    const failTestcases = [
        ['json', 'json1:index.json', 'text1:index.txt'],
    ];
    
    beforeAll(() => {
        fs.rmSync(testDirectory, { recursive: true, force: true });
    });
    beforeEach(() => {
        fs.mkdirSync(testDirectory, { recursive: true });
        storage = new ACStorage(testDirectory);
        storage.register(TREE);
    });
    afterEach(() => {
        fs.rmSync(testDirectory, { recursive: true });
        storage.dropAll();
    });

    for (const [ac, oldIdentifier, newIdentifier] of passTestcases) {
        test(`copy (${oldIdentifier} -> ${newIdentifier})`, () => {
            storage.getAccessor(oldIdentifier, ac);
            storage.copyAccessor(oldIdentifier, newIdentifier);
        });
    }

    for (const [ac, oldIdentifier, newIdentifier] of failTestcases) {
        test(`copy (${oldIdentifier} -> ${newIdentifier})`, () => {
            storage.getAccessor(oldIdentifier, ac);
            expect(() => storage.copyAccessor(oldIdentifier, newIdentifier)).toThrow();
        });
    }
});