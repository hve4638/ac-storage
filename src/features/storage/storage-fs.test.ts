import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from 'data/test';

import { ACStorage } from 'features/storage';
import StorageAccess from 'features/StorageAccess';
import { JSONType } from '@hve/json-accessor';

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
    
    beforeAll(async () => {
        fs.rmSync(testDirectory, { recursive: true, force: true });
    });
    beforeEach(async () => {
        fs.mkdirSync(testDirectory, { recursive: true });
        storage = new ACStorage(testDirectory);
    });
    afterEach(async () => {
        fs.rmSync(testDirectory, { recursive: true });
        await storage.dropAll();
    });
    
    test('파일 ACStorage FS 연동', async () => {
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
        await storage.accessAsJSON('config.json');
        await storage.commit();
        verifyState({ config: true, data: false }, 2);

        // 4. TextAccessor 접근
        await storage.accessAsText('data.txt');
        await storage.commit();
        verifyState({ config: true, data: true }, 3);

        // 5. 저장소 삭제
        await storage.drop('config.json');
        verifyState({ config: false, data: true }, 4);
        
        // 6. 저장소 삭제
        await storage.drop('data.txt');
        verifyState({ config: false, data: false }, 5);
    });

    test('디렉토리 ACStorage FS 연동', async () => {
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
        await storage.accessAsJSON('base:config.json');
        await storage.commit();
        verifyState({ base : true, config: true, data: false }, 2);
        
        // 3. 접근
        await storage.accessAsText('base:data.txt');
        await storage.commit();
        verifyState({ base : true, config: true, data: true }, 3);

        // 4. 단일 접근자 삭제 (즉시 파일시스템 반영)
        await storage.drop('base:config.json');
        verifyState({ base : true, config: false, data: true }, 4);
    });

    test('파일 수동 이동', async ()=>{
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
        let prev = await storage.accessAsJSON('prev.json');
        prev.set(data);
        await prev.save();

        expect(isFile(prevPath)).toBeTruthy();
        expect(isFile(nextPath)).toBeFalsy();

        // 3. 새 저장소 생성 및 이동
        let next = await storage.accessAsJSON('next.json');
        next.set(prev.getAll());
        await prev.drop();
        await next.save();

        expect(isFile(prevPath)).toBeFalsy();
        expect(isFile(nextPath)).toBeTruthy();

        expect(next.getAll()).toEqual(data);
    });
    
    test('파일 이동', async ()=>{
        const prevPath = getPath('prev.json');
        const nextPath = getPath('next.json');
        
        // 0. 초기 상태
        expect(isFile(prevPath)).toBeFalsy();
        expect(isFile(nextPath)).toBeFalsy();

        // 1. 저장소 등록
        storage.register({
            '*' : StorageAccess.JSON({ value : JSONType.Number() }),
        });
        
        // 2. 저장소 생성
        let prev = await storage.accessAsJSON('prev.json');
        prev.setOne('value', 1);
        await storage.commit();

        expect(isFile(prevPath)).toBeTruthy();
        expect(isFile(nextPath)).toBeFalsy();

        // 3. 새 저장소 생성 및 이동
        await storage.move('prev.json', 'next.json');
        await storage.commit();

        expect(isFile(prevPath)).toBeFalsy();
        expect(isFile(nextPath)).toBeTruthy();

        // 4. 내용 확인
        const nextAC = await storage.accessAsJSON('next.json');
        expect(nextAC.getAll()).toEqual({ value : 1 });
    });
    
    test('파일 복사', async ()=>{
        const prevPath = getPath('prev.json');
        const nextPath = getPath('next.json');
        
        // 0. 초기 상태
        expect(isFile(prevPath)).toBeFalsy();
        expect(isFile(nextPath)).toBeFalsy();

        // 1. 저장소 등록
        storage.register({
            '*' : StorageAccess.JSON({ value : JSONType.Number() }),
        });
        
        // 2. 저장소 생성
        let prev = await storage.accessAsJSON('prev.json');
        prev.setOne('value', 1);
        await storage.commit();

        expect(isFile(prevPath)).toBeTruthy();
        expect(isFile(nextPath)).toBeFalsy();

        // 3. 새 저장소 생성 및 이동
        await storage.copy('prev.json', 'next.json');
        await storage.commit();

        expect(isFile(prevPath)).toBeTruthy();
        expect(isFile(nextPath)).toBeTruthy();

        // 4. 내용 확인
        const nextAC = await storage.accessAsJSON('next.json');
        expect(nextAC.getAll()).toEqual({ value : 1 });
    });
    
    test('디렉토리 이동', async ()=>{
        const prevPath = getPath('prev/index.json');
        const nextPath = getPath('next/index.json');
        
        // 0. 초기 상태
        expect(isFile(prevPath)).toBeFalsy();
        expect(isFile(nextPath)).toBeFalsy();

        // 1. 저장소 등록
        storage.register({
            'prev' : {
                '*' : StorageAccess.JSON({ value : JSONType.Number() }),
            },
            'next' : {
                '*' : StorageAccess.JSON({ value : JSONType.Number() }),
            },
        });
        
        // 2. 저장소 생성
        let prevAC = await storage.accessAsJSON('prev:index.json');
        prevAC.setOne('value', 1);
        await storage.commit();

        expect(isFile(prevPath)).toBeTruthy();
        expect(isFile(nextPath)).toBeFalsy();
        expect(prevAC.getAll()).toEqual({ value : 1 });

        // 3. 새 저장소 생성 및 이동
        await storage.move('prev', 'next');

        expect(isFile(prevPath)).toBeFalsy();
        expect(isFile(nextPath)).toBeTruthy();

        // 4. 내용 확인
        const nextAC = await storage.accessAsJSON('next:index.json');
        expect(nextAC.getAll()).toEqual({ value : 1 });
    });
    
    test('디렉토리 복사', async ()=>{
        const prevPath = getPath('prev/index.json');
        const nextPath = getPath('next/index.json');
        
        // 0. 초기 상태
        expect(isFile(prevPath)).toBeFalsy();
        expect(isFile(nextPath)).toBeFalsy();

        // 1. 저장소 등록
        storage.register({
            'prev' : {
                '*' : StorageAccess.JSON({ value : JSONType.Number() }),
            },
            'next' : {
                '*' : StorageAccess.JSON({ value : JSONType.Number() }),
            },
        });
        
        // 2. 저장소 생성
        let prev = await storage.accessAsJSON('prev:index.json');
        prev.setOne('value', 1);
        await storage.commit();

        expect(isFile(prevPath)).toBeTruthy();
        expect(isFile(nextPath)).toBeFalsy();

        // 3. 새 저장소 생성 및 복사
        await storage.copy('prev', 'next');

        expect(isFile(prevPath)).toBeTruthy();
        expect(isFile(nextPath)).toBeTruthy();

        // 4. 내용 확인
        const nextAC = await storage.accessAsJSON('next:index.json');
        expect(nextAC.getAll()).toEqual({ value : 1 });
    });

    test('SubStorage 복사', async ()=>{
        const prevPath = getPath('layer1/prev.json');
        const nextPath = getPath('layer1/next.json');
        
        // 0. 초기 상태
        expect(isFile(prevPath)).toBeFalsy();
        expect(isFile(nextPath)).toBeFalsy();

        // 1. 저장소 등록
        storage.register({
            'layer1' : {
                '*' : StorageAccess.JSON({ value : JSONType.Number() }),
            },
        });
        
        // 2. 저장소 생성
        let substorage = storage.subStorage('layer1');
        let prev = await substorage.accessAsJSON('prev.json');
        prev.setOne('value', 1);
        await storage.commit();

        expect(isFile(prevPath)).toBeTruthy();
        expect(isFile(nextPath)).toBeFalsy();

        // 3. 새 저장소 생성 및 복사
        await substorage.copy('prev.json', 'next.json');
        await substorage.commitAll();

        expect(isFile(prevPath)).toBeTruthy();
        expect(isFile(nextPath)).toBeTruthy();

        // 4. 내용 확인
        const nextAC = await storage.accessAsJSON('layer1:next.json');
        expect(nextAC.getAll()).toEqual({ value : 1 });
    });
});