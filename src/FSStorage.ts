import * as fs from 'node:fs';
import * as path from 'node:path';
import { IAccessor, BinaryAccessor, JSONAccessor, TextAccessor } from './accessor';
import StorageAccessControl, { AccessTree, StorageAccess } from './access-control';
import { StorageError } from './errors';
import IStorage from './IStorage';
import { IBinaryAccessor, IJSONAccessor, ITextAccessor } from './accessor/types';

type AccessorEvent = {
    create: (actualPath:string)=>IAccessor;
}

class FSStorage implements IStorage {
    protected basePath: string;
    protected customAccessorEvent: Map<number, AccessorEvent> = new Map();
    protected accessors:Map<string, IAccessor> = new Map();

    protected accessControl:StorageAccessControl;
    protected aliases:Map<string, string> = new Map();

    constructor(basePath:string) {
        this.basePath = basePath;
        this.accessControl = this.initAccessControl();
    }

    protected initAccessControl():StorageAccessControl {
        return new StorageAccessControl({
            onAccess: (identifier:string, accessType:StorageAccess) => {
                const targetPath = path.join(this.basePath, identifier.replaceAll(':', '/'));

                let item = this.accessors.get(identifier);
                if (item != undefined && !item.dropped) {
                    return item;
                }

                let accessor:IAccessor;
                switch(accessType) {
                    case StorageAccess.JSON:
                        accessor = new JSONAccessor(targetPath);
                        break;
                    case StorageAccess.BINARY:
                        accessor = new BinaryAccessor(targetPath);
                        break;
                    case StorageAccess.TEXT:
                        accessor = new TextAccessor(targetPath);
                        break;
                    default:
                        const event = this.customAccessorEvent.get(accessType);
                        if (!event) {
                            throw new StorageError('Invalid access type');
                        }
                        accessor = event.create(targetPath);
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

    setAlias(alias:string, identifier:string) {
        this.aliases.set(alias, identifier);
    }

    deleteAlias(alias:string) {
        this.aliases.delete(alias);
    }

    addAccessorEvent(event:AccessorEvent) {
        const customType = this.accessControl.addAccessType();
        this.customAccessorEvent.set(customType, event);

        return customType;
    }

    getJSONAccessor(identifier:string):IJSONAccessor {
        return this.getAccessor(identifier, StorageAccess.JSON) as IJSONAccessor;
    }
    getTextAccessor(identifier:string):ITextAccessor {
        return this.getAccessor(identifier, StorageAccess.TEXT) as ITextAccessor;
    }
    getBinaryAccessor(identifier:string):IBinaryAccessor {
        return this.getAccessor(identifier, StorageAccess.BINARY) as IBinaryAccessor;
    }
    getAccessor(identifier:string, accessType:number):IAccessor {
        if (this.aliases.has(identifier)) {
            identifier = this.aliases.get(identifier)!;
        }
        return this.accessControl.access(identifier, accessType) as IAccessor;
    }

    dropDir(identifier:string) {
        if (this.accessControl.getRegisterBit(identifier) !== StorageAccess.DIR) {
            throw new StorageError(`FSStorage '${identifier}' is not a directory`);
        }

        const child = `${identifier}:`;
        const childIdentifiers = Array.from(this.accessors.keys()).filter((key)=>key.startsWith(child));
        childIdentifiers.forEach((id) => this.dropAccessor(id));
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