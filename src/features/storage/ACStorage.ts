import * as fs from 'node:fs';
import * as path from 'node:path';
import { AccessorEvent } from 'types';

import { IAccessor, IAccessorManager, BinaryAccessorManager, JSONAccessorManager, TextAccessorManager, CustomAccessorManager, ICustomAccessor } from 'features/accessors';
import StorageAccessControl, { AccessTree } from 'features/StorageAccessControl';
import StorageAccess, { Accesses, AccessType } from 'features/StorageAccess';
import { IBinaryAccessor, IJSONAccessor, ITextAccessor } from 'features/accessors/types';

import { StorageError } from './errors';
import IACStorage from './IACStorage';
import DirectoryAccessorManager from 'features/accessors/DirectoryAccessor/DirectoryAccessorManager';

class ACStorage implements IACStorage {
    protected cachePath:string;
    protected noCache:boolean;

    protected basePath: string;
    protected customAccessEvents: Record<string, AccessorEvent<ICustomAccessor>> = {};
    protected accessors:Map<string, IAccessorManager<IAccessor>> = new Map();

    protected accessControl:StorageAccessControl;

    protected accessCache:Record<string, string> = {};

    constructor(basePath:string, noCache:boolean=false) {
        this.basePath = basePath;
        this.accessControl = this.initAccessControl();
        this.cachePath = path.join(this.basePath, '.acstorage');
        this.noCache = noCache;

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
        const releaseAccessor = (identifier:string) => {
            const accessor = this.accessors.get(identifier);
            if (!accessor) return;

            for (const child of accessor.dependent) {
                releaseAccessor(child);
            }

            if (!accessor.isDropped()) accessor.drop();

            delete this.accessCache[identifier];
            this.accessors.delete(identifier);
        }

        return new StorageAccessControl({
            onAccess: (identifier:string, sa:Accesses) => {
                const targetPath = path.join(this.basePath, identifier.replaceAll(':', '/'));

                let item = this.accessors.get(identifier);
                if (item != undefined && !item.isDropped()) {
                    return item;
                }

                let acm:IAccessorManager<IAccessor>;
                switch(sa.accessType) {
                    case 'json':
                        acm = JSONAccessorManager.fromFS(targetPath);
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
                        const ac = event.create(targetPath, ...sa.args);
                        acm = CustomAccessorManager.from(ac, sa.id, event);
                        break;
                    default:
                        // 기본 타입 이외에는 custom 타입으로 wrap되기 때문에 이 경우가 발생하지 않음
                        throw new StorageError('Invalid access type');
                        break;
                }
                this.accessCache[identifier] = sa.accessType !== 'custom' ? sa.accessType : sa.id;
                this.accessors.set(identifier, acm);
                return acm;
            },
            onAccessDir: (identifier, tree) => {
                const targetPath = identifier.replaceAll(':', '/');
                const dirPath = path.join(this.basePath, targetPath);

                const acm = DirectoryAccessorManager.fromFS(dirPath, tree);
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }
            },
            onRelease: (identifier) => {
                const accessor = this.accessors.get(identifier);
                if (accessor) {
                    if (!accessor.isDropped()) {
                        accessor.drop();
                    }
                    delete this.accessCache[identifier];
                    this.accessors.delete(identifier);
                }
            },
            onReleaseDir: (identifier) => {
                const accessor = this.accessors.get(identifier);
                if (accessor) {
                    if (!accessor.isDropped()) {
                        accessor.drop();
                    }
                    delete this.accessCache[identifier];
                    this.accessors.delete(identifier);
                }
            },
            onChainDependency: (dependentId, dependencyId) => {
                const dependent = this.accessors.get(dependentId);

                if (dependent) {
                    dependent.dependent.add(dependencyId);
                }
            }
        });
    }

    register(tree:AccessTree) {
        this.accessControl.register(tree);
    }

    addAccessEvent<T extends string>(customId:(T extends AccessType ? never : T), event:AccessorEvent<ICustomAccessor>) {
        this.customAccessEvents[customId] = event;
    }

    getJSONAccessor(identifier:string):IJSONAccessor {
        return this.getAccessor(identifier, 'json') as IJSONAccessor;
    }
    getTextAccessor(identifier:string):ITextAccessor {
        return this.getAccessor(identifier, 'text') as ITextAccessor;
    }
    getBinaryAccessor(identifier:string):IBinaryAccessor {
        return this.getAccessor(identifier, 'binary') as IBinaryAccessor;
    }
    getAccessor(identifier:string, accessType:string):IAccessor {
        return this.accessControl.access(identifier, accessType) as IAccessor;
    }

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
        this.accessControl.validateDirectoryPath(identifier);
        
        const child = `${identifier}:`;
        const childIdentifiers = Array.from(this.accessors.keys()).filter((key)=>key.startsWith(child));
        childIdentifiers.forEach((id) => this.dropAccessor(id));
        
        this.accessControl.releaseDir(identifier);
    }

    dropAccessor(identifier:string) {
        const acm = this.accessors.get(identifier)
        if (acm && !acm.isDropped()) {
            acm.drop();
        }
    }
    
    dropAllAccessor() {
        this.accessors.forEach((asm) => {
            if (!asm.isDropped()) {
                asm.drop();
            }
        });
    }

    commit() {
        for (const accessor of this.accessors.values()) {
            if (accessor.isDropped()) continue;

            accessor.commit();
        }
        
        if (!this.noCache) this.saveCache();
    }
}

export default ACStorage;