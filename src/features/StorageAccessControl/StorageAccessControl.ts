import { IAccessorManager } from 'features/accessors'
import { Accesses, AccessType } from 'features/StorageAccess'
import TreeExplorer from 'features/TreeExplorer';

import { AccessTree, StorageAccessControlEvent } from './types';

import { AccessDeniedError, DirectoryAccessError, NotRegisterError, StorageAccessError } from './errors';

class StorageAccessControl {
    #events:StorageAccessControlEvent;
    #rawTree:AccessTree = {};
    private accessTree:TreeExplorer;

    constructor(events:StorageAccessControlEvent) {
        this.#events = events;
        this.accessTree = TreeExplorer.from({}, ':', true);
    }

    register(tree:AccessTree) {
        this.#rawTree = tree;
        this.accessTree = TreeExplorer.from(tree, ':', true);
    }

    copy(oldIdentifier:string, newIdentifier:string, accessType:string) {
        const oldACM = this.#getAccessorManager(oldIdentifier, accessType, true);
        const newACM = this.#getAccessorManager(newIdentifier, accessType, true);

        oldACM.copy(newACM);
    }

    move(oldIdentifier:string, newIdentifier:string, accessType:string) {
        const oldACM = this.#getAccessorManager(oldIdentifier, accessType, true);
        const newACM = this.#getAccessorManager(newIdentifier, accessType, true);
        
        oldACM.move(newACM);
    }
    
    access(identifier:string, accessType:string):unknown {
        const acm = this.#getAccessorManager(identifier, accessType);
        
        return acm.accessor;
    }

    #getAccessorManager(identifier:string, accessType:string, allowDirectory:boolean=false):IAccessorManager<unknown> {
        const walked = this.accessTree.walk(identifier);
        if (!walked) {
            throw new NotRegisterError(`'${identifier}' is not registered.`);
        }

        if (!allowDirectory && this.checkAccessIsDirectory(walked.value)) {
            throw new DirectoryAccessError(`'${identifier}' is directory.`);
        }
        // 접근 권한 확인
        const resolvedAccess = this.validateAndResolveAccess(walked.value, accessType, identifier);
        
        // 실제 접근
        const splited = identifier.split(':');
        const length = walked.path.length;

        let prevACC = '';
        let acc = '';
        const addAcc = (id:string) => {
            prevACC = acc;
            acc = (acc === '' ? id : `${acc}:${id}`);
        };
        const chainDependency = () => {
            this.#events.onChainDependency(prevACC, acc);
        }
        let subtree = this.#rawTree;
        for (let i = 0; i < length-1; i++) {
            addAcc(splited[i]);
            subtree = subtree[splited[i]] as AccessTree;
            
            this.#events.onAccess(acc, {
                accessType : 'directory',
                tree : subtree
            });
            chainDependency();
        }
        addAcc(splited[length-1]);

        const ac = this.#events.onAccess(acc, resolvedAccess);
        chainDependency();
        
        return ac;
    }

    release(identifier:string) {
        const walked = this.accessTree.walk(identifier);
        if (!walked) {
            throw new NotRegisterError(`'${identifier}' is not registered.`);
        }

        if (this.checkAccessIsDirectory(walked.value)) {
            throw new DirectoryAccessError(`> '${identifier}' is directory.`);
        }
        this.#events.onRelease(identifier);
    }

    releaseDir(identifier:string) {
        this.validateDirectoryPath(identifier);
        
        this.#events.onRelease(identifier);
    }

    getAccessType(identifier:string):string[] {
        const getAT = (access:Accesses):string => {
            return (
                access.accessType === 'custom'
                ? access.id
                : access.accessType
            )
        }
        const access:Accesses|null = this.accessTree.get(identifier);

        if (access == null) {
            return [];
        }
        else if (this.checkAccessIsDirectory(access)) {
            return ['directory'];
        }
        else {
            if (access.accessType === 'union') {
                return access.accesses.map((ac)=>getAT(ac));
            }
            else {
                return [getAT(access)];
            }
        }
    }

    validateDirectoryPath(identifier:string) {
        const walked = this.accessTree.walk(identifier);
        if (!walked || !this.checkAccessIsDirectory(walked.value)) {
            throw new NotRegisterError(`'${identifier}' is not directory.`);
        }
    }

    private validateAndResolveAccess(access:Accesses, targetAccessType:string, identifier:string):Accesses {
        const resolved = this.resolveAccess(access, targetAccessType);
        if (!resolved) {
            throw new AccessDeniedError(`'${identifier}' is not accessible. '${access.accessType}'`);
        }
        return resolved;
    }

    /**
     * target이 Access와 일치 시 Access 반환, 아닐 시 null 반환
     * 
     * UnionAccess의 경우, target에 해당하는 Access를 찾아 반환
     */
    private resolveAccess(access:Accesses, targetAccessType:string):Accesses|null {
        if (!('accessType' in access)) {
            return {
                accessType : 'directory',
                tree : access as AccessTree
            }
        }
        else if (access.accessType !== 'union') {
            if (access.accessType === targetAccessType) {
                return access;
            }
            else if (access.accessType === 'custom' && access.id === targetAccessType) {
                return access;
            }
            else {
                return null;
            }
        }
        else {
            for (const ac of access.accesses) {
                if (ac.accessType === targetAccessType) {
                    return ac;
                }
                else if (ac.accessType === 'custom' && ac.id === targetAccessType) {
                    return ac;
                }
            }
            return null;
        }

        return null;
    }
    private checkAccessIsDirectory(access:Accesses) {
        return !('accessType' in access);
    }
}

export default StorageAccessControl;