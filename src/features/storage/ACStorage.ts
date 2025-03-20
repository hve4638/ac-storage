import * as fs from 'node:fs';
import * as path from 'node:path';
import { AccessorEvent } from 'types';

import { IAccessorManager, BinaryAccessorManager, JSONAccessorManager, TextAccessorManager, CustomAccessorManager, ICustomAccessor } from 'features/accessors';
import StorageAccessControl, { AccessTree } from 'features/StorageAccessControl';
import StorageAccess, { Accesses, AccessType } from 'features/StorageAccess';
import { IBinaryAccessor, IJSONAccessor, ITextAccessor } from 'features/accessors/types';
import {
    DirectoryAccessorManager,
    RootAccessorManager,
} from 'features/accessors';

import ACSubStorage from './ACSubStorage';
import { StorageError } from './errors';
import { IACStorage, IACSubStorage } from './types';

interface ACStorageOption {
    cacheName?:string;
    noCache?:boolean;
}

class ACStorage implements IACStorage {
    protected eventListeners:{
        access?: Function,
        access_dir?: Function,
        release?: Function,
        release_dir?: Function,
    } = {};

    protected cachePath:string;
    protected noCache:boolean;
    protected cacheName:string;
    
    protected basePath: string;
    protected customAccessEvents: Record<string, AccessorEvent<unknown>> = {};
    protected accessors:Map<string, IAccessorManager<unknown>> = new Map();

    protected accessControl:StorageAccessControl;
    protected accessCache:Record<string, string> = {};

    constructor(basePath:string, option:ACStorageOption={}) {
        this.basePath = basePath;
        this.accessControl = this.initAccessControl();
        
        this.noCache = option.noCache ?? false;
        this.cacheName = option.cacheName ?? '.acstorage';

        this.cachePath = path.join(this.basePath, '.acstorage');
        
        this.accessors.set('', RootAccessorManager.fromFS());

        if (!this.noCache) this.loadCache();
    }

    protected loadCache() {
        try {
            const cacheData = fs.readFileSync(this.cachePath, 'utf8');

            this.accessCache = JSON.parse(cacheData);
        }
        catch {
            ;
        }
    }

    protected saveCache() {
        const cacheData = JSON.stringify(this.accessCache, null, 4);

        fs.writeFileSync(this.cachePath, cacheData, 'utf8');
    }

    protected initAccessControl():StorageAccessControl {
        const onAccess = (identifier:string, sa:Accesses) => {
            const targetPath = path.join(this.basePath, identifier.replaceAll(':', '/'));
            this.eventListeners.access?.(identifier, sa);

            let item = this.accessors.get(identifier);
            if (item != undefined && !item.isDropped()) {
                return item;
            }
            
            let acm:IAccessorManager<unknown>;
            switch(sa.accessType) {
                case 'directory':
                    acm = DirectoryAccessorManager.fromFS(targetPath, sa.tree);
                    break;
                case 'json':
                    acm = JSONAccessorManager.fromFS(targetPath, sa.structure);
                    break;
                case 'binary':
                    acm = BinaryAccessorManager.fromFS(targetPath);
                    break;
                case 'text':
                    acm = TextAccessorManager.fromFS(targetPath);
                    break;
                case 'custom':
                    const event = this.customAccessEvents[sa.id];
                    if (!event) {
                        throw new StorageError('Invalid access type');
                    }
                    const ac = event.init(targetPath, ...sa.args);
                    acm = CustomAccessorManager.from(ac, {
                        customId: sa.id,
                        event,
                        actualPath: targetPath,
                        customArgs: sa.args,
                    });
                    break;
                default:
                    // 기본 타입 이외에는 custom 타입으로 wrap되기 때문에 이 경우가 발생하지 않음
                    throw new StorageError('Invalid access type');
                    break;
            }
            if (!acm.exists()) acm.create();
            else acm.load();
            
            this.accessCache[identifier] = sa.accessType !== 'custom' ? sa.accessType : sa.id;
            this.accessors.set(identifier, acm);
            return acm;
        }
        const onRelease = (identifier:string) => {
            const accessor = this.accessors.get(identifier);
            if (!accessor) return;

            for (const child of accessor.dependent) {
                onRelease(child);
            }
            if (identifier === '') return;
            this.eventListeners.release?.(identifier);

            if (!accessor.isDropped()) accessor.drop();

            delete this.accessCache[identifier];
            this.accessors.delete(identifier);
        };
        const onChainDependency = (dependentId:string, dependencyId:string) => {
            const dependent = this.accessors.get(dependentId);

            if (dependent) {
                dependent.dependent.add(dependencyId);
            }
        }
        
        return new StorageAccessControl({
            onAccess,
            onRelease,
            onChainDependency,
        });
    }

    addListener(event: 'release'|'access', listener: Function): void {
        switch(event) {
            case 'access':
                this.eventListeners.access = listener;
                break;
            case 'release':
                this.eventListeners.release = listener;
                break;
        }
    }

    register(tree:AccessTree) {
        this.accessControl.register(tree);
    }

    addAccessEvent<T extends string, AC>(customId:(T extends AccessType ? never : T), event:AccessorEvent<AC>) {
        this.customAccessEvents[customId] = event as AccessorEvent<unknown>;
    }

    subStorage(identifier:string):IACSubStorage {
        const accessType = this.accessControl.getAccessType(identifier);
        if (accessType.length !== 1 && accessType[0] !== 'directory') {
            throw new StorageError(`Cannot infer the access type of ${identifier}`);
        }

        return new ACSubStorage(this, identifier);
    }

    access(identifier:string, accessType:string):unknown {
        return this.accessControl.access(identifier, accessType);
    }
    accessAsJSON(identifier:string):IJSONAccessor {
        return this.access(identifier, 'json') as IJSONAccessor;
    }
    accessAsText(identifier:string):ITextAccessor {
        return this.access(identifier, 'text') as ITextAccessor;
    }
    accessAsBinary(identifier:string):IBinaryAccessor {
        return this.access(identifier, 'binary') as IBinaryAccessor;
    }
    copy(oldIdentifier:string, newIdentifier:string) {
        const accessType = this.validateAndGetAccessTypePair(oldIdentifier, newIdentifier);

        this.accessControl.copy(oldIdentifier, newIdentifier, accessType);
    }
    move(oldIdentifier:string, newIdentifier:string) {
        const accessType = this.validateAndGetAccessTypePair(oldIdentifier, newIdentifier);
        
        this.accessControl.move(oldIdentifier, newIdentifier, accessType);
    }

    /**
     * @deprecated use access() instead
     */
    getAccessor(identifier:string, accessType:string):unknown {
        return this.accessControl.access(identifier, accessType);
    }
    /**
     * @deprecated use accessAsJSON() instead
     */
    getJSONAccessor(identifier:string):IJSONAccessor {
        return this.getAccessor(identifier, 'json') as IJSONAccessor;
    }
    /**
     * @deprecated use accessAsText() instead
     */
    getTextAccessor(identifier:string):ITextAccessor {
        return this.getAccessor(identifier, 'text') as ITextAccessor;
    }
    /**
     * @deprecated use accessAsBinary() instead
     */
    getBinaryAccessor(identifier:string):IBinaryAccessor {
        return this.getAccessor(identifier, 'binary') as IBinaryAccessor;
    }
    /**
     * @deprecated use copy() instead
     */
    copyAccessor(oldIdentifier:string, newIdentifier:string) {
        const accessType = this.validateAndGetAccessTypePair(oldIdentifier, newIdentifier);

        this.accessControl.copy(oldIdentifier, newIdentifier, accessType);
    }
    moveAccessor(oldIdentifier:string, newIdentifier:string) {
        const accessType = this.validateAndGetAccessTypePair(oldIdentifier, newIdentifier);
        
        this.accessControl.move(oldIdentifier, newIdentifier, accessType);
    }
    
    protected validateAndGetAccessTypePair(oldIdentifier:string, newIdentifier:string) {
        /*
            accessControl에서 작업 수행 전, cache를 통한 검증을 진행

            1. oldIdentifier에 대한 accessType이 캐시에 존재하는 경우
                - noCahce 설정이 false 라면 예외 발생
                - noCache 설정이 true 라면 accessControl에서 직접 확인
                    - accessType이 1개가 아니라면 예외 발생
            2. oldIdentifier, newIdentifier의 accessType을 비교
                - newIdentifier의 accessType이 존재하지 않다면 진행
                    - 실제로 accessor가 적절한지는 AccessControl에서 검증
            3. accessControl에게 copy 요청
                - oldIdentifier의 accessor를 newIdentifier로 복사
        */
        const oldAT:string = this.accessCache[oldIdentifier];
        const newAT = this.accessCache[newIdentifier];

        if (oldAT == null) {
            if (this.noCache) {
                const atCandidates = this.accessControl.getAccessType(oldIdentifier);

                if (atCandidates.length !== 1) {
                    throw new StorageError(`Cannot infer the access type of ${oldIdentifier}`);
                }
                return atCandidates[0];
            }
            else {
                throw new StorageError(`The accessor for '${oldIdentifier}' is not initialized.`);
            }
        }
        else if (newAT != null && oldAT !== newAT) {
            throw new StorageError(`The accessors '${oldIdentifier}'(${oldAT}) and '${newIdentifier}'(${newAT}) are not compatible.`);            
        }

        return oldAT;
    }

    dropDir(identifier:string) {
        if (identifier === '') {
            throw new StorageError('Cannot drop the root directory. use dropAll() instead.');
        }
        
        this.accessControl.releaseDir(identifier);
    }

    drop(identifier:string) {
        this.accessControl.release(identifier);
    }
    
    dropAll() {
        this.accessControl.releaseDir('');
    }

    commit(identifier:string='') {
        this.#commitRecursive(identifier);
        
        if (!this.noCache) this.saveCache();
    }

    commitAll() {
        this.#commitRecursive('');

        if (!this.noCache) this.saveCache();     
    }

    #commitRecursive(identifier:string) {
        const accessor = this.accessors.get(identifier);
        if (!accessor) return;

        for (const childIdentifier of accessor.dependent) {
            this.#commitRecursive(childIdentifier);
        }

        if (!accessor.isDropped()) accessor.commit();
    }
}

export default ACStorage;