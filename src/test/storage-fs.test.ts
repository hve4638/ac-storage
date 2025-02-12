import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from '../test-utils';

import { FSStorage } from '../features/storage';
import StorageAccess from '../features/StorageAccess';

function isFile(filename:string) {
    if (!fs.existsSync(filename)) {
        return false;
    }

    const stat = fs.statSync(filename);
    return stat.isFile();
}
function isDir(dirname:string) {
    if (!fs.existsSync(dirname)) {
        return false;
    }

    const stat = fs.statSync(dirname);
    return stat.isDirectory();
}
function read(filename:string) {
    return fs.readFileSync(filename, 'utf8');
}
function readAsJSON(filename:string) {
    return JSON.parse(read(filename));
}

describe('FSStorage FS Test', () => {
    const testDirectory = path.join(TEST_PATH, 'storage-fs');
    let storage:FSStorage;
    
    beforeAll(() => {
    });
    beforeEach(() => {
        fs.mkdirSync(testDirectory, { recursive: true });
        storage = new FSStorage(testDirectory);
    });
    afterEach(() => {
        fs.rmSync(testDirectory, { recursive: true });
        storage.dropAllAccessor();
    });
    
    test('파일 FSStorage FS 연동', () => {
        const configPath = path.join(testDirectory, 'config.json');
        const dataPath = path.join(testDirectory, 'data.txt');
        const verifyState = (expected: { config: boolean, data: boolean }, comment:any='') => {
            const actual = {
                __comment: comment,
                config : isFile(configPath),
                data : isFile(dataPath)
            }
            expect(actual).toEqual({
                __comment: comment,
                ...expected
            });
        };
        
        // 0. 초기 상태
        verifyState({ config: false, data: false }, 0);

        // 1. 저장소 등록
        storage.register({
            'config.json' : StorageAccess.JSON(),
            'data.txt' : StorageAccess.Text(),
        });
        verifyState({ config: false, data: false }, 1);

        // 2. JSONAccesor 접근
        storage.getJSONAccessor('config.json');
        storage.commit();
        verifyState({ config: true, data: false }, 3);

        // 4. TextAccessor 접근
        storage.getTextAccessor('data.txt');
        storage.commit();
        verifyState({ config: true, data: true }, 4);

        // 5. 저장소 삭제
        storage.dropAccessor('config.json');
        verifyState({ config: false, data: true }, 6);
        
        // 6. 저장소 삭제
        storage.dropAccessor('data.txt');
        verifyState({ config: false, data: false }, 7);
    });

    test('디렉토리 FSStorage FS 연동', () => {
        const baseDirPath = path.join(testDirectory, 'base');
        const dataPath = path.join(testDirectory, 'base', 'data.txt');
        const configPath = path.join(testDirectory, 'base', 'config.json');
        const verifyState = (expected: { base: boolean, data: boolean, config: boolean }, comment:any='') => {
            const actual = {
                __comment: comment,
                base : isDir(baseDirPath),
                data : isFile(dataPath),
                config : isFile(configPath),
            };
            expect(actual).toEqual({
                __comment: comment,
                ...expected
            });
        };
        
        // 0. 초기 상태
        verifyState({ base : false, config: false, data: false }, 0);

        // 1. 저장소 등록
        storage.register({
            'base' : {
                '*' : StorageAccess.Union(
                    StorageAccess.JSON(),
                    StorageAccess.Text(),
                ),
            },
        });
        verifyState({ base : false, config: false, data: false }, 1);

        // 2. 접근
        storage.getJSONAccessor('base:config.json');
        storage.commit();
        verifyState({ base : true, config: true, data: false }, 2);
        
        // 3. 접근
        storage.getTextAccessor('base:data.txt');
        storage.commit();
        verifyState({ base : true, config: true, data: true }, 3);

        // 4. 단일 접근자 삭제 (즉시 파일시스템 반영)
        storage.dropAccessor('base:config.json');
        verifyState({ base : true, config: false, data: true }, 4);
    });

    test('파일 이동', ()=>{
        const prevPath = path.join(testDirectory, 'prev.json');
        const nextPath = path.join(testDirectory, 'next.json');
        const data = {
            a : 1,
            b : 2,
            c : 3,
        }
        
        // 0. 초기 상태
        expect(isFile(prevPath)).toBeFalsy();
        expect(isFile(nextPath)).toBeFalsy();

        // 1. 저장소 등록
        storage.register({
            '*' : StorageAccess.JSON(),
        });
        
        // 2. 저장소 생성
        let prev = storage.getJSONAccessor('prev.json');
        prev.set(data);
        prev.commit();

        expect(isFile(prevPath)).toBeTruthy();
        expect(isFile(nextPath)).toBeFalsy();

        // 3. 새 저장소 생성 및 이동
        let next = storage.getJSONAccessor('next.json');
        next.set(prev.getAll());
        prev.drop();
        next.commit();

        expect(isFile(prevPath)).toBeFalsy();
        expect(isFile(nextPath)).toBeTruthy();

        expect(next.getAll()).toEqual(data);
    })
});