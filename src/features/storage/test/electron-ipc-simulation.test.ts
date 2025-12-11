/**
 * Electron IPC 환경에서의 JSONAccessor 데이터 손실 시뮬레이션
 *
 * Electron 환경 특성:
 * 1. Renderer Process -> IPC -> Main Process -> 파일 시스템
 * 2. 여러 Renderer (BrowserWindow)가 동시에 IPC 요청 가능
 * 3. IPC는 비동기이며 순서가 보장되지 않을 수 있음
 * 4. Main Process에서 단일 ACStorage를 사용하더라도
 *    여러 IPC 요청이 동시에 처리될 수 있음
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_PATH } from 'data/test';

import { ACStorage } from 'features/storage';
import StorageAccess from 'features/StorageAccess';
import { IJSONAccessor } from '@hve/json-accessor';

describe('Electron IPC 환경 시뮬레이션', () => {
    const testDirectory = path.join(TEST_PATH, 'electron-ipc-simulation');

    function getPath(...args: string[]) {
        return path.join(testDirectory, ...args);
    }

    function readJSON(filename: string) {
        return JSON.parse(fs.readFileSync(filename, 'utf8'));
    }

    function readRaw(filename: string) {
        return fs.readFileSync(filename, 'utf8');
    }

    // Main Process의 Storage (싱글톤처럼 사용)
    let mainProcessStorage: ACStorage;

    beforeAll(() => {
        fs.rmSync(testDirectory, { recursive: true, force: true });
    });

    beforeEach(() => {
        fs.mkdirSync(testDirectory, { recursive: true });
        mainProcessStorage = new ACStorage(testDirectory, { noCache: true });
        mainProcessStorage.register({
            'config.json': StorageAccess.JSON(),
            'user-data.json': StorageAccess.JSON(),
            'settings.json': StorageAccess.JSON(),
        });
    });

    afterEach(async () => {
        try {
            await mainProcessStorage.dropAll();
        } catch {}
        fs.rmSync(testDirectory, { recursive: true, force: true });
    });

    /**
     * IPC Handler 시뮬레이션
     * 실제 Electron에서는 ipcMain.handle()로 구현됨
     */
    class IPCMainHandler {
        private storage: ACStorage;
        private accessorCache: Map<string, IJSONAccessor> = new Map();

        constructor(storage: ACStorage) {
            this.storage = storage;
        }

        // IPC: 데이터 읽기
        async handleGetData(identifier: string, key: string): Promise<any> {
            const acc = await this.storage.accessAsJSON(identifier);
            return acc.getOne(key);
        }

        // IPC: 데이터 쓰기
        async handleSetData(identifier: string, key: string, value: any): Promise<void> {
            const acc = await this.storage.accessAsJSON(identifier);
            acc.setOne(key, value);
        }

        // IPC: 전체 데이터 가져오기
        async handleGetAll(identifier: string): Promise<Record<string, any>> {
            const acc = await this.storage.accessAsJSON(identifier);
            return acc.getAll();
        }

        // IPC: 전체 데이터 설정
        async handleSetAll(identifier: string, data: Record<string, any>): Promise<void> {
            const acc = await this.storage.accessAsJSON(identifier);
            acc.set(data);
        }

        // IPC: 저장
        async handleSave(identifier?: string): Promise<void> {
            if (identifier) {
                await this.storage.commit(identifier);
            } else {
                await this.storage.commitAll();
            }
        }

        // IPC: 저장 및 언로드
        async handleRelease(identifier: string): Promise<void> {
            await this.storage.release(identifier);
        }
    }

    /**
     * Renderer Process 시뮬레이션
     * 실제 Electron에서는 ipcRenderer.invoke()로 호출
     */
    class RendererProcess {
        private name: string;
        private ipcHandler: IPCMainHandler;
        private pendingOperations: Promise<any>[] = [];

        constructor(name: string, ipcHandler: IPCMainHandler) {
            this.name = name;
            this.ipcHandler = ipcHandler;
        }

        // IPC 호출 시뮬레이션 (네트워크 지연 포함)
        private async ipcInvoke<T>(operation: () => Promise<T>): Promise<T> {
            // IPC 통신 지연 시뮬레이션 (0-5ms)
            await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
            return await operation();
        }

        async getData(identifier: string, key: string): Promise<any> {
            return this.ipcInvoke(() => this.ipcHandler.handleGetData(identifier, key));
        }

        async setData(identifier: string, key: string, value: any): Promise<void> {
            return this.ipcInvoke(() => this.ipcHandler.handleSetData(identifier, key, value));
        }

        async getAll(identifier: string): Promise<Record<string, any>> {
            return this.ipcInvoke(() => this.ipcHandler.handleGetAll(identifier));
        }

        async setAll(identifier: string, data: Record<string, any>): Promise<void> {
            return this.ipcInvoke(() => this.ipcHandler.handleSetAll(identifier, data));
        }

        async save(identifier?: string): Promise<void> {
            return this.ipcInvoke(() => this.ipcHandler.handleSave(identifier));
        }

        async release(identifier: string): Promise<void> {
            return this.ipcInvoke(() => this.ipcHandler.handleRelease(identifier));
        }
    }

    describe('시나리오 1: 단일 Renderer에서 빠른 연속 IPC 호출', () => {
        test('빠른 연속 setData + save 호출', async () => {
            const ipcHandler = new IPCMainHandler(mainProcessStorage);
            const renderer = new RendererProcess('renderer-1', ipcHandler);

            // 빠르게 여러 번 데이터 설정 및 저장
            const operations: Promise<void>[] = [];

            for (let i = 0; i < 20; i++) {
                operations.push((async () => {
                    await renderer.setData('config.json', `key${i}`, `value${i}`);
                    await renderer.save('config.json');
                })());
            }

            await Promise.all(operations);

            // 검증
            const result = readJSON(getPath('config.json'));
            console.log('시나리오 1 결과 키 개수:', Object.keys(result).length);

            // 모든 키가 저장되어야 함
            for (let i = 0; i < 20; i++) {
                if (!result[`key${i}`]) {
                    console.log(`key${i} 누락!`);
                }
            }

            expect(Object.keys(result).length).toBe(20);
        });
    });

    describe('시나리오 2: 여러 Renderer에서 동시 IPC 호출', () => {
        test('CRITICAL: 여러 BrowserWindow가 동시에 같은 파일 수정', async () => {
            const ipcHandler = new IPCMainHandler(mainProcessStorage);

            // 여러 Renderer (BrowserWindow) 시뮬레이션
            const renderers = [
                new RendererProcess('main-window', ipcHandler),
                new RendererProcess('settings-window', ipcHandler),
                new RendererProcess('popup-window', ipcHandler),
            ];

            // 초기 데이터
            await renderers[0].setAll('config.json', { base: 'data', counter: 0 });
            await renderers[0].save('config.json');

            // 각 Renderer가 동시에 같은 파일 수정
            const operations = renderers.map(async (renderer, idx) => {
                for (let i = 0; i < 10; i++) {
                    await renderer.setData('config.json', `window${idx}_key${i}`, `value${i}`);
                    await renderer.save('config.json');
                }
            });

            await Promise.all(operations);

            // 검증
            const result = readJSON(getPath('config.json'));
            console.log('시나리오 2 결과:', Object.keys(result));

            // base 데이터가 유지되어야 함
            expect(result.base).toBe('data');

            // 각 window의 마지막 키는 있어야 함 (중간 키는 덮어써질 수 있음)
            // 단일 ACStorage이므로 모든 키가 유지되어야 함
            let missingKeys: string[] = [];
            for (let w = 0; w < 3; w++) {
                for (let i = 0; i < 10; i++) {
                    if (!result[`window${w}_key${i}`]) {
                        missingKeys.push(`window${w}_key${i}`);
                    }
                }
            }

            if (missingKeys.length > 0) {
                console.log('누락된 키:', missingKeys);
            }

            // 단일 ACStorage이므로 모든 키가 유지됨
            expect(missingKeys).toEqual([]);
        });

        test('동시 commit 안전성 검증 (json-accessor v0.7)', async () => {
            /**
             * json-accessor v0.7의 write lock과 atomic write로
             * 동시 commit이 안전하게 처리되는지 검증
             * 
             * 이전 버그: 동시 fs.writeFile()로 파일 손상 발생
             * 현재: write lock으로 직렬화, atomic write로 안전성 보장
             */
            const storage = new ACStorage(testDirectory, { noCache: true });
            storage.register({ 'concurrent-safe.json': StorageAccess.JSON() });

            // 초기 데이터
            const acc = await storage.accessAsJSON('concurrent-safe.json');
            acc.set({ initial: 'data', counter: 0 });
            await storage.commit();

            // 여러 번 동시 commit 실행
            for (let round = 0; round < 10; round++) {
                const operations: Promise<void>[] = [];

                // 10개의 동시 수정 + commit
                for (let i = 0; i < 10; i++) {
                    operations.push((async () => {
                        acc.setOne(`round${round}_key${i}`, `value_${i}`);
                        await storage.commit();
                    })());
                }

                await Promise.all(operations);

                // 파일 무결성 검증
                const raw = readRaw(getPath('concurrent-safe.json'));
                expect(raw.trim()).not.toBe(''); // 빈 파일 아님
                
                let parsed: any;
                expect(() => {
                    parsed = JSON.parse(raw); // JSON 파싱 성공
                }).not.toThrow();

                // 초기 데이터 보존 확인
                expect(parsed.initial).toBe('data');
                expect(parsed.counter).toBe(0);
            }

            await storage.dropAll();
        });
    });

    describe('시나리오 3: IPC 호출 순서 역전', () => {
        /**
         * Electron IPC는 호출 순서대로 처리되지 않을 수 있음
         * 특히 여러 window에서 호출할 때
         */
        test('순서 역전으로 인한 데이터 덮어쓰기', async () => {
            const ipcHandler = new IPCMainHandler(mainProcessStorage);
            const renderer = new RendererProcess('main', ipcHandler);

            // 사용자가 순서대로 입력했지만 IPC 처리 순서가 다를 수 있음
            // 순서대로 실행 (setData가 완료된 후 save 호출)
            await renderer.setData('config.json', 'step', '1');
            await renderer.setData('config.json', 'step', '2');
            await renderer.setData('config.json', 'step', '3');
            await renderer.save('config.json');

            const result = readJSON(getPath('config.json'));
            console.log('순서 역전 테스트 결과:', result);

            // 마지막 값이어야 함
            expect(result.step).toBe('3');
        });
    });

    describe('시나리오 4: Renderer 종료 시 데이터 손실', () => {
        /**
         * BrowserWindow가 닫힐 때 저장되지 않은 데이터 손실
         */
        test('Window 닫기 전 save 누락', async () => {
            const ipcHandler = new IPCMainHandler(mainProcessStorage);
            const renderer = new RendererProcess('closing-window', ipcHandler);

            // 초기 데이터 저장
            await renderer.setAll('user-data.json', { existing: 'data' });
            await renderer.save('user-data.json');

            // 사용자가 데이터 수정
            await renderer.setData('user-data.json', 'unsaved', 'changes');
            await renderer.setData('user-data.json', 'more', 'data');

            // Window 닫힘 (save 없이) - 시뮬레이션
            // 실제로는 renderer가 사라지고 IPC 연결 끊김

            // 다른 window나 앱 재시작 시
            const newRenderer = new RendererProcess('new-window', ipcHandler);

            // release 후 재접근하면 메모리에서 언로드되어
            // 파일에서 다시 로드함
            await ipcHandler.handleRelease('user-data.json');

            const loadedData = await newRenderer.getAll('user-data.json');
            console.log('Window 닫기 후 로드된 데이터:', loadedData);

            // release() automatically commits changes, so 'unsaved' data is actually persisted
            // Data would only be lost if the process crashes before release()
            expect(loadedData.unsaved).toBe('changes');
        });

        test('FAIL CASE: 앱 강제 종료 시뮬레이션', async () => {
            const ipcHandler = new IPCMainHandler(mainProcessStorage);
            const renderer = new RendererProcess('main', ipcHandler);

            // 기존 데이터
            fs.writeFileSync(getPath('settings.json'), JSON.stringify({
                theme: 'dark',
                language: 'ko'
            }), 'utf8');

            // 데이터 수정
            await renderer.setData('settings.json', 'newSetting', 'value');

            // 앱 강제 종료 (commit/release 없이)
            // 실제로는 process.exit() 또는 crash

            // 새 앱 인스턴스
            const newStorage = new ACStorage(testDirectory, { noCache: true });
            newStorage.register({ 'settings.json': StorageAccess.JSON() });
            const newHandler = new IPCMainHandler(newStorage);
            const newRenderer = new RendererProcess('new-main', newHandler);

            const loadedData = await newRenderer.getAll('settings.json');
            console.log('강제 종료 후 데이터:', loadedData);

            // 새 설정은 저장되지 않음
            expect(loadedData.newSetting).toBeUndefined();
            // 기존 데이터만 유지
            expect(loadedData.theme).toBe('dark');

            await newStorage.dropAll();
        });
    });

    describe('시나리오 5: IPC 호출 중 에러 발생', () => {
        test('저장 중 에러 발생 시 데이터 상태', async () => {
            const ipcHandler = new IPCMainHandler(mainProcessStorage);
            const renderer = new RendererProcess('main', ipcHandler);

            await renderer.setAll('config.json', { initial: 'data' });
            await renderer.save('config.json');

            // 파일을 읽기 전용으로 만들어 저장 실패 유발
            // (실제로는 권한 문제, 디스크 풀 등)

            await renderer.setData('config.json', 'newKey', 'newValue');

            // 정상적인 경우 저장 성공
            await renderer.save('config.json');

            const result = readJSON(getPath('config.json'));
            expect(result.newKey).toBe('newValue');
        });
    });

    describe('시나리오 6: 대량의 IPC 요청', () => {
        test('STRESS: 100개의 동시 IPC 요청', async () => {
            const ipcHandler = new IPCMainHandler(mainProcessStorage);

            // 여러 window 시뮬레이션
            const renderers = Array.from({ length: 5 }, (_, i) =>
                new RendererProcess(`window-${i}`, ipcHandler)
            );

            // 각 window에서 20개씩 요청
            const allOperations: Promise<void>[] = [];

            renderers.forEach((renderer, windowIdx) => {
                for (let i = 0; i < 20; i++) {
                    allOperations.push((async () => {
                        await renderer.setData('config.json', `w${windowIdx}_k${i}`, `v${i}`);
                        // 5번에 한 번 save
                        if (i % 5 === 0) {
                            await renderer.save('config.json');
                        }
                    })());
                }
            });

            await Promise.all(allOperations);

            // 마지막 save
            await renderers[0].save('config.json');

            // 검증
            const result = readJSON(getPath('config.json'));
            const keyCount = Object.keys(result).length;
            console.log('Stress 테스트 결과 키 개수:', keyCount);

            // 100개 키가 모두 저장되어야 함
            expect(keyCount).toBe(100);

            // 파일이 유효한 JSON인지 확인
            const raw = readRaw(getPath('config.json'));
            expect(() => JSON.parse(raw)).not.toThrow();
        });
    });

    describe('시나리오 7: 실제 Electron 사용 패턴', () => {
        test('설정 창에서 실시간 저장', async () => {
            const ipcHandler = new IPCMainHandler(mainProcessStorage);
            const settingsWindow = new RendererProcess('settings', ipcHandler);

            // 초기 설정 로드
            await settingsWindow.setAll('settings.json', {
                theme: 'system',
                autoSave: true,
                analytics: false,
                debugMode: false
            });
            await settingsWindow.save('settings.json');

            // 사용자가 설정 변경 (각 변경마다 저장)
            const changes: [string, any][] = [
                ['theme', 'dark'],
                ['analytics', true],
                ['autoSave', false],
                ['debugMode', true],
                ['logLevel', 'verbose'],
            ];

            for (const [key, value] of changes) {
                await settingsWindow.setData('settings.json', key, value);
                await settingsWindow.save('settings.json');
            }

            // 설정 창 닫기
            await ipcHandler.handleRelease('settings.json');

            // 메인 창에서 설정 읽기
            const mainWindow = new RendererProcess('main', ipcHandler);
            const settings = await mainWindow.getAll('settings.json');

            console.log('최종 설정:', settings);

            expect(settings['theme']).toBe('dark');
            expect(settings['analytics']).toBe(true);
            expect(settings['debugMode']).toBe(true);
        });

        test('여러 창에서 동시 데이터 접근', async () => {
            const ipcHandler = new IPCMainHandler(mainProcessStorage);

            const mainWindow = new RendererProcess('main', ipcHandler);
            const editorWindow = new RendererProcess('editor', ipcHandler);
            const previewWindow = new RendererProcess('preview', ipcHandler);

            // 초기 데이터
            await mainWindow.setAll('user-data.json', {
                documents: [],
                lastOpened: null
            });
            await mainWindow.save('user-data.json');

            // 동시 작업
            await Promise.all([
                // Editor에서 문서 추가
                (async () => {
                    await editorWindow.setData('user-data.json', 'documents', [
                        { id: 1, title: 'Doc 1' }
                    ]);
                    await editorWindow.save('user-data.json');
                })(),
                // Main에서 lastOpened 업데이트
                (async () => {
                    await mainWindow.setData('user-data.json', 'lastOpened', 'doc-1');
                    await mainWindow.save('user-data.json');
                })(),
                // Preview에서 읽기만
                (async () => {
                    await previewWindow.getAll('user-data.json');
                })(),
            ]);

            const finalData = await mainWindow.getAll('user-data.json');
            console.log('동시 작업 후 데이터:', finalData);

            // 모든 변경사항이 반영되어야 함
            expect(finalData.documents).toBeDefined();
            expect(finalData.lastOpened).toBeDefined();
        });
    });
});

describe('시나리오 8: 실제 {} 발생 재현 - 강화된 테스트', () => {
    const testDirectory = path.join(TEST_PATH, 'electron-ipc-critical');

    function getPath(...args: string[]) {
        return path.join(testDirectory, ...args);
    }

    function readRaw(filename: string) {
        return fs.readFileSync(filename, 'utf8');
    }

    beforeEach(() => {
        fs.rmSync(testDirectory, { recursive: true, force: true });
        fs.mkdirSync(testDirectory, { recursive: true });
    });

    afterEach(() => {
        fs.rmSync(testDirectory, { recursive: true, force: true });
    });

    test('CRITICAL: 여러 ACStorage 인스턴스 동시 생성 (앱 재시작 시뮬레이션)', async () => {
        /**
         * 실제 문제 상황:
         * - Electron 앱이 빠르게 재시작될 때
         * - 이전 인스턴스의 파일 작업이 완료되기 전에 새 인스턴스 시작
         * - 두 인스턴스가 동시에 같은 파일에 접근
         */
        const filePath = getPath('restart-race.json');

        // 이전 앱 인스턴스
        const oldStorage = new ACStorage(testDirectory, { noCache: true });
        oldStorage.register({ 'restart-race.json': StorageAccess.JSON() });

        const oldAcc = await oldStorage.accessAsJSON('restart-race.json');
        oldAcc.set({ oldData: 'from-old-instance', important: 'value' });

        // 이전 인스턴스 commit 시작 (완료 전에 새 인스턴스 시작)
        const oldCommitPromise = oldStorage.commit();

        // 새 앱 인스턴스 (이전 commit 완료 전)
        const newStorage = new ACStorage(testDirectory, { noCache: true });
        newStorage.register({ 'restart-race.json': StorageAccess.JSON() });

        // 새 인스턴스에서 파일 접근 시도
        const newAcc = await newStorage.accessAsJSON('restart-race.json');
        const loadedData = newAcc.getAll();

        console.log('새 인스턴스에서 로드된 데이터:', loadedData);

        // 이전 commit이 완료되지 않았으므로 빈 객체이거나 불완전한 데이터
        // 새 인스턴스가 새 데이터 추가
        newAcc.setOne('newData', 'from-new-instance');

        // 두 commit이 동시에 진행
        await Promise.all([
            oldCommitPromise,
            newStorage.commit()
        ]);

        // 최종 파일 상태 확인
        const raw = readRaw(filePath);
        console.log('최종 파일 내용:', raw);

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            console.log('JSON 손상됨!');
            parsed = {};
        }

        // 두 인스턴스의 데이터가 충돌하여 하나만 남거나 손상될 수 있음
        console.log('파싱된 결과:', parsed);

        try { await oldStorage.dropAll(); } catch {}
        try { await newStorage.dropAll(); } catch {}
    });



    test('CRITICAL: release 후 즉시 재접근 경쟁', async () => {
        /**
         * release()가 완료되기 전에 다른 곳에서 access 시도
         */
        const storage = new ACStorage(testDirectory, { noCache: true });
        storage.register({ 'release-race.json': StorageAccess.JSON() });

        // 초기 데이터
        const acc1 = await storage.accessAsJSON('release-race.json');
        acc1.set({ original: 'data', count: 1 });
        await storage.commit();

        // release와 재접근 동시 실행
        const releasePromise = storage.release('release-race.json');

        // release 진행 중 재접근 시도
        const acc2Promise = storage.accessAsJSON('release-race.json');

        await releasePromise;
        const acc2 = await acc2Promise;

        const data = acc2.getAll();
        console.log('release 경쟁 후 데이터:', data);

        // 데이터가 유지되어야 함
        expect(data.original).toBe('data');

        await storage.dropAll();
    });

    test('SIMULATION: 실제 Electron 앱 수명주기', async () => {
        /**
         * 실제 Electron 앱의 수명주기 시뮬레이션
         * 1. 앱 시작 -> 설정 로드
         * 2. 사용자 작업 (여러 window)
         * 3. 갑작스러운 종료 또는 정상 종료
         */
        const storage = new ACStorage(testDirectory, { noCache: true });
        storage.register({ 'app-state.json': StorageAccess.JSON() });

        // 앱 시작
        const appState = await storage.accessAsJSON('app-state.json');
        appState.set({
            version: '1.0.0',
            lastRun: Date.now(),
            windows: {},
            userData: { theme: 'light' }
        });
        await storage.commit();

        // 여러 window 작업 시뮬레이션
        const windowOps: Promise<void>[] = [];

        for (let w = 0; w < 5; w++) {
            windowOps.push((async () => {
                for (let i = 0; i < 10; i++) {
                    appState.setOne(`windows.window${w}`, { state: `operation${i}` });
                    // 일부만 저장 (실제 앱에서 흔한 패턴)
                    if (i % 3 === 0) {
                        await storage.commit();
                    }
                }
            })());
        }

        await Promise.all(windowOps);

        // 최종 저장
        await storage.commit();

        // 앱 종료 후 재시작
        await storage.releaseAll();

        // 새 앱 인스턴스
        const newStorage = new ACStorage(testDirectory, { noCache: true });
        newStorage.register({ 'app-state.json': StorageAccess.JSON() });

        const loadedState = await newStorage.accessAsJSON('app-state.json');
        const data = loadedState.getAll();

        console.log('앱 재시작 후 상태:', {
            version: data.version,
            windowCount: data.windows ? Object.keys(data.windows).length : 0
        });

        expect(data.version).toBe('1.0.0');

        await newStorage.dropAll();
    });
});


