import { BinaryAccessorManager, IAccessor, IAccessorManager, JSONAccessorManager, TextAccessorManager } from 'features/accessors';
import { Accesses } from 'features/StorageAccess';
import StorageAccessControl from 'features/StorageAccessControl';
import { StorageError } from './errors';
import ACStorage from './ACStorage';

class MemACStorage extends ACStorage {
    constructor() {
        super('');
    }

    override initAccessControl() {
        return new StorageAccessControl({
            onAccess: (identifier:string, sa:Accesses) => {
                let item = this.accessors.get(identifier);
                if (item != undefined && !item.isDropped()) {
                    return item;
                }

                let acm:IAccessorManager<IAccessor>;
                switch(sa.accessType) {
                    case 'json':
                        acm = JSONAccessorManager.fromMemory();
                        break;
                    case 'binary':
                        acm = BinaryAccessorManager.fromMemory();
                        break;
                    case 'text':
                        acm = TextAccessorManager.fromMemory();
                        break;
                    default:
                        throw new StorageError('MemStorage does not support custom accessor');
                }
                this.accessors.set(identifier, acm);
                return acm;
            },
            onAccessDir: (identifier) => {
                
            },
            onRelease: (identifier) => {
                const accessor = this.accessors.get(identifier);
                if (accessor) {
                    if (!accessor.isDropped()) {
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
            onChainDependency: (dependentId, dependencyId) => {
                const dependent = this.accessors.get(dependentId);

                if (dependent) {
                    dependent.dependent.add(dependencyId);
                }
            },
        });
    }
}

export default MemACStorage;