import { IAccessor, MemTextAccessor, MemBinaryAccessor, MemJSONAccessor } from '../../features/accessors';
import { Accesses } from '../../features/StorageAccess';
import StorageAccessControl from '../../features/StorageAccessControl';
import { StorageError } from './errors';
import FSStorage from './FSStorage';


class MemStorage extends FSStorage {
    constructor() {
        super('');
    }

    override initAccessControl() {
        return new StorageAccessControl({
            onAccess: (identifier:string, sa:Accesses) => {
                let item = this.accessors.get(identifier);
                if (item != undefined && !item.dropped) {
                    return item;
                }

                let accessor:IAccessor;
                switch(sa.accessType) {
                    case 'json':
                        accessor = new MemJSONAccessor();
                        break;
                    case 'binary':
                        accessor = new MemBinaryAccessor();
                        break;
                    case 'text':
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