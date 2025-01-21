import { IAccessor, MemTextAccessor, MemBinaryAccessor, MemJSONAccessor } from './accessor';
import StorageAccessControl, { StorageAccess } from './access-control';
import { StorageError } from './errors';
import FSStorage from './FSStorage';

class MemStorage extends FSStorage {
    constructor() {
        super('');
    }

    override initAccessControl() {
        return new StorageAccessControl({
            onAccess: (identifier:string, accessType:StorageAccess) => {
                let item = this.accessors.get(identifier);
                if (item != undefined && !item.dropped) {
                    return item;
                }

                let accessor:IAccessor;
                switch(accessType) {
                    case StorageAccess.JSON:
                        accessor = new MemJSONAccessor();
                        break;
                    case StorageAccess.BINARY:
                        accessor = new MemBinaryAccessor();
                        break;
                    case StorageAccess.TEXT:
                        accessor = new MemTextAccessor();
                        break;
                    default:
                        throw new StorageError('MemStorage does not support custom accessor');
                }
                this.accessors.set(identifier, accessor);
                return accessor;
            },
            onAccessDir: (identifier) => {
                
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
                const childPrefix = `${identifier}:`;
                const childIds = Array.from(this.accessors.keys()).filter((key)=>key.startsWith(childPrefix));
                childIds.forEach((id) => this.accessors.delete(id));
            },
        });
    }
}

export default MemStorage;