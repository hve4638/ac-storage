import * as fs from 'node:fs';
import * as path from 'node:path';

import { IAccessor, BinaryAccessor, JSONAccessor, TextAccessor } from '../../features/accessors';
import StorageAccessControl, { AccessTree } from '../../features/StorageAccessControl';
import StorageAccess, { Accesses, AccessType } from '../../features/StorageAccess';
import { IBinaryAccessor, IJSONAccessor, ITextAccessor } from '../../features/accessors/types';

import { StorageError } from './errors';
import IStorage from './IStorage';

type AccessorEvent = {
    create: (actualPath:string, ...args:any[])=>IAccessor;
}

class FSStorage implements IStorage {
    protected basePath: string;
    protected customAccessEvents: Record<string, AccessorEvent> = {};
    protected accessors:Map<string, IAccessor> = new Map();

    protected accessControl:StorageAccessControl;
    protected aliases:Map<string, string> = new Map();

    constructor(basePath:string) {
        this.basePath = basePath;
        this.accessControl = this.initAccessControl();
    }

    protected initAccessControl():StorageAccessControl {
        return new StorageAccessControl({
            onAccess: (identifier:string, sa:Accesses) => {
                const targetPath = path.join(this.basePath, identifier.replaceAll(':', '/'));

                let item = this.accessors.get(identifier);
                if (item != undefined && !item.dropped) {
                    return item;
                }

                let accessor:IAccessor;
                switch(sa.accessType) {
                    case 'json':
                        accessor = new JSONAccessor(targetPath);
                        break;
                    case 'binary':
                        accessor = new BinaryAccessor(targetPath);
                        break;
                    case 'text':
                        accessor = new TextAccessor(targetPath);
                        break;
                    case 'custom':
                        const event = this.customAccessEvents[sa.id];
                        if (!event) {
                            throw new StorageError('Invalid access type');
                        }
                        accessor = event.create(targetPath, ...sa.args);
                        break;
                    default:
                        // 일반적으로 도달해서는 안됨
                        throw new StorageError('Invalid access type');
                        break;
                }
                this.accessors.set(identifier, accessor);
                return accessor;
            },
            onAccessDir: (identifier) => {
                const targetPath = identifier.replaceAll(':', '/');

                const dirPath = path.join(this.basePath, targetPath);
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }
            },
            onRelease: (identifier) => {
                const accessor = this.accessors.get(identifier);
                if (accessor) {
                    if (!accessor.dropped) {
                        accessor.drop();
                    }
                    this.accessors.delete(identifier);
                }
            },
            onReleaseDir: (identifier) => {
                const targetPath = identifier.replaceAll(':', '/');

                const dirPath = path.join(this.basePath, targetPath);
                if (fs.existsSync(dirPath)) {
                    fs.rmSync(dirPath, { recursive: true });
                }

                const childPrefix = `${identifier}:`;
                const childIds = Array.from(this.accessors.keys()).filter((key)=>key.startsWith(childPrefix));
                childIds.forEach((id) => this.accessors.delete(id));
            },
        });
    }

    register(tree:AccessTree) {
        this.accessControl.register(tree);
    }

    addAccessEvent(customId:string, event:AccessorEvent) {
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
    getAccessor(identifier:string, accessType:AccessType):IAccessor {
        if (this.aliases.has(identifier)) {
            identifier = this.aliases.get(identifier)!;
        }
        return this.accessControl.access(identifier, accessType) as IAccessor;
    }

    dropDir(identifier:string) {
        this.accessControl.validateDirectoryPath(identifier);
        
        const child = `${identifier}:`;
        const childIdentifiers = Array.from(this.accessors.keys()).filter((key)=>key.startsWith(child));
        childIdentifiers.forEach((id) => this.dropAccessor(id));
        
        this.accessControl.releaseDir(identifier);
    }

    dropAccessor(identifier:string) {
        const accessor = this.accessors.get(identifier)
        if (accessor && !accessor.dropped) {
            accessor.drop();
        }
    }
    
    dropAllAccessor() {
        this.accessors.forEach((accessor) => {
            if (!accessor.dropped) {
                accessor.drop();
            }
        });
    }

    commit() {
        for (const accessor of this.accessors.values()) {
            if (accessor.dropped) continue;

            accessor.commit();
        }
    }
}

export default FSStorage;