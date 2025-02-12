import { Accesses, AccessType } from '../../features/StorageAccess'

import { AccessTree, StorageAccessControlEvent } from './types';
import { IAccessor } from '../accessors';
import { AccessDeniedError, DirectoryAccessError, NotRegisterError, StorageAccessError } from './errors';
import TreeExplorer from '../../features/TreeExplorer';

class StorageAccessControl {
    #events:StorageAccessControlEvent;
    #rawTree:AccessTree = {};
    private accessTree:TreeExplorer;

    constructor(events:StorageAccessControlEvent) {
        this.#events = events;
        this.accessTree = new TreeExplorer({}, ':', true);
    }

    register(tree:AccessTree) {
        this.#rawTree = tree;
        this.accessTree = new TreeExplorer(tree, ':', true);
    }
    
    access(identifier:string, accessType:AccessType):IAccessor {
        const walked = this.accessTree.walk(identifier);
        if (!walked) {
            throw new NotRegisterError(`'${identifier}' is not registered.`);
        }

        // 접근 권한 확인
        const resolvedAccess = this.validateAndResolveAccess(walked.value, accessType, identifier);
        
        
        // 실제 접근
        const splited = identifier.split(':');
        const length = walked.path.length;
        let acc = '';
        const addAcc = (id:string) => { acc = (acc === '' ? id : `${acc}:${id}`) };
        for (let i = 0; i < length-1; i++) {
            addAcc(splited[i]);

            this.#events.onAccessDir(acc);
        }
        addAcc(splited[length-1]);
        
        return this.#events.onAccess(acc, resolvedAccess);
    }

    release(identifier:string) {
        const walked = this.accessTree.walk(identifier);
        if (!walked) {
            throw new NotRegisterError(`'${identifier}' is not registered.`);
        }

        if (!this.checkAccessIsDirectory(walked.value)) {
            throw new DirectoryAccessError(`'${identifier}' is directory.`);
        }
        this.#events.onRelease(identifier);
    }

    releaseDir(identifier:string) {
        this.validateDirectoryPath(identifier);
        
        this.#events.onReleaseDir(identifier);
    }

    validateDirectoryPath(identifier:string) {
        const walked = this.accessTree.walk(identifier);
        if (!walked || !this.checkAccessIsDirectory(walked.value)) {
            throw new NotRegisterError(`'${identifier}' is not directory.`);
        }
    }

    private validateAndResolveAccess(access:Accesses, target:AccessType, identifier:string):Accesses {
        if (this.checkAccessIsDirectory(access)) {
            throw new DirectoryAccessError(`'${identifier}' is directory.`);
        }
        const resolved = this.resolveAccess(access, target);
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
    private resolveAccess(access:Accesses, target:AccessType):Accesses|null {
        if (access.accessType !== 'union') {
            if (access.accessType === target) {
                return access;
            }
            else {
                return null;
            }
        }
        else {
            const accessTypes:string[] = access.accesses.map((access) => access.accessType);

            for (const ac of access.accesses) {
                if (ac.accessType === target) {
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