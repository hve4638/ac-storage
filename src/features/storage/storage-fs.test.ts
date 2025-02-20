import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from 'data/test';

import { ACStorage } from 'features/storage';
import StorageAccess from 'features/StorageAccess';
import { JSONType } from 'types/json';

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

// ACStorage가 파일시스템과 연동되는지 테스트
describe('ACStorage FS Test', () => {
    const testDirectory = path.join(TEST_PATH, 'storage-fs');
    let storage:ACStorage;

    function getPath(...args:string[]) {
        return path.join(testDirectory, ...args);
    }
    
    beforeAll(() => {
        fs.rmSync(testDirectory, { recursive: true, force: true });
    });
    beforeEach(() => {
        fs.mkdirSync(testDirectory, { recursive: true });
        storage = new ACStorage(testDirectory);
    });
    afterEach(() => {
        fs.rmSync(testDirectory, { recursive: true });
        storage.dropAll();
    });
    
    test('파일 ACStorage FS 연동', () => {
        const configPath = getPath('config.json');
        const dataPath = getPath('data.txt');
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
        storage.drop('config.json');
        verifyState({ config: false, data: true }, 6);
        
        // 6. 저장소 삭제
        storage.drop('data.txt');
        verifyState({ config: false, data: false }, 7);
    });

    test('디렉토리 ACStorage FS 연동', () => {
        const baseDirPath = getPath('base');
        const dataPath = getPath('base', 'data.txt');
        const configPath = getPath('base', 'config.json');
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
        storage.drop('base:config.json');
        verifyState({ base : true, config: false, data: true }, 4);
    });

    test('파일 수동 이동', ()=>{
        const prevPath = getPath('prev.json');
        const nextPath = getPath('next.json');
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
    });
    
    test('파일 이동', ()=>{
        const prevPath = getPath('prev.json');
        const nextPath = getPath('next.json');
        
        // 0. 초기 상태
        expect(isFile(prevPath)).toBeFalsy();
        expect(isFile(nextPath)).toBeFalsy();

        // 1. 저장소 등록
        storage.register({
            '*' : StorageAccess.JSON({ value : JSONType.number }),
        });
        
        // 2. 저장소 생성
        let prev = storage.getJSONAccessor('prev.json');
        prev.setOne('value', 1);
        storage.commit();

        expect(isFile(prevPath)).toBeTruthy();
        expect(isFile(nextPath)).toBeFalsy();

        // 3. 새 저장소 생성 및 이동
        storage.moveAccessor('prev.json', 'next.json');
        storage.commit();

        expect(isFile(prevPath)).toBeFalsy();
        expect(isFile(nextPath)).toBeTruthy();

        // 4. 내용 확인
        const nextAC = storage.getJSONAccessor('next.json');
        expect(nextAC.getAll()).toEqual({ value : 1 });
    });
    
    test('파일 복사', ()=>{
        const prevPath = getPath('prev.json');
        const nextPath = getPath('next.json');
        
        // 0. 초기 상태
        expect(isFile(prevPath)).toBeFalsy();
        expect(isFile(nextPath)).toBeFalsy();

        // 1. 저장소 등록
        storage.register({
            '*' : StorageAccess.JSON({ value : JSONType.number }),
        });
        
        // 2. 저장소 생성
        let prev = storage.getJSONAccessor('prev.json');
        prev.setOne('value', 1);
        storage.commit();

        expect(isFile(prevPath)).toBeTruthy();
        expect(isFile(nextPath)).toBeFalsy();

        // 3. 새 저장소 생성 및 이동
        storage.copyAccessor('prev.json', 'next.json');
        storage.commit();

        expect(isFile(prevPath)).toBeTruthy();
        expect(isFile(nextPath)).toBeTruthy();

        // 4. 내용 확인
        const nextAC = storage.getJSONAccessor('next.json');
        expect(nextAC.getAll()).toEqual({ value : 1 });
    });
    
    test('디렉토리 이동', ()=>{
        const prevPath = getPath('prev/index.json');
        const nextPath = getPath('next/index.json');
        
        // 0. 초기 상태
        expect(isFile(prevPath)).toBeFalsy();
        expect(isFile(nextPath)).toBeFalsy();

        // 1. 저장소 등록
        storage.register({
            'prev' : {
                '*' : StorageAccess.JSON({ value : JSONType.number }),
            },
            'next' : {
                '*' : StorageAccess.JSON({ value : JSONType.number }),
            },
        });
        
        // 2. 저장소 생성
        let prev = storage.getJSONAccessor('prev:index.json');
        prev.setOne('value', 1);
        storage.commit();

        expect(isFile(prevPath)).toBeTruthy();
        expect(isFile(nextPath)).toBeFalsy();

        // 3. 새 저장소 생성 및 이동
        storage.moveAccessor('prev', 'next');

        expect(isFile(prevPath)).toBeFalsy();
        expect(isFile(nextPath)).toBeTruthy();

        // 4. 내용 확인
        const nextAC = storage.getJSONAccessor('next:index.json');
        expect(nextAC.getAll()).toEqual({ value : 1 });
    });
    
    test('디렉토리 복사', ()=>{
        const prevPath = getPath('prev/index.json');
        const nextPath = getPath('next/index.json');
        
        // 0. 초기 상태
        expect(isFile(prevPath)).toBeFalsy();
        expect(isFile(nextPath)).toBeFalsy();

        // 1. 저장소 등록
        storage.register({
            'prev' : {
                '*' : StorageAccess.JSON({ value : JSONType.number }),
            },
            'next' : {
                '*' : StorageAccess.JSON({ value : JSONType.number }),
            },
        });
        
        // 2. 저장소 생성
        let prev = storage.getJSONAccessor('prev:index.json');
        prev.setOne('value', 1);
        storage.commit();

        expect(isFile(prevPath)).toBeTruthy();
        expect(isFile(nextPath)).toBeFalsy();

        // 3. 새 저장소 생성 및 복사
        storage.copyAccessor('prev', 'next');

        expect(isFile(prevPath)).toBeTruthy();
        expect(isFile(nextPath)).toBeTruthy();

        // 4. 내용 확인
        const nextAC = storage.getJSONAccessor('next:index.json');
        expect(nextAC.getAll()).toEqual({ value : 1 });
    });
});