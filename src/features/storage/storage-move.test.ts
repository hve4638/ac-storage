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
describe('ACStorage Accessor 복사/이동 테스트', () => {
    const testDirectory = path.join(TEST_PATH, 'storage-move');
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
    
    test('디렉토리 이동/복사 실패', ()=>{
        storage.register({
            'prev' : {
                '*' : StorageAccess.JSON({ value : JSONType.number }),
            },
            'next' : {
                '*' : StorageAccess.Text(),
            },
        });
        
        let prev = storage.getJSONAccessor('prev:index.json');
        prev.setOne('value', 1);
        
        // 3. 새 저장소 이동 실패
        expect(()=>storage.moveAccessor('prev', 'next')).toThrow();
        expect(()=>storage.copyAccessor('prev', 'next')).toThrow();
    });
});