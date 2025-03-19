import { BinaryAccessorManager, CustomAccessorManager, DirectoryAccessorManager, IAccessorManager, JSONAccessorManager, TextAccessorManager } from 'features/accessors';
import { Accesses } from 'features/StorageAccess';
import StorageAccessControl from 'features/StorageAccessControl';
import { StorageError } from './errors';
import ACStorage from './ACStorage';

class MemACStorage extends ACStorage {
    constructor() {
        super('', { noCache: true });
    }

    override initAccessControl() {
        const onAccess = (identifier:string, sa:Accesses) => {
            this.eventListeners.access?.(identifier, sa);

            let item = this.accessors.get(identifier);
            if (item != undefined && !item.isDropped()) {
                return item;
            }
            
            let acm:IAccessorManager<unknown>;
            switch(sa.accessType) {
                case 'directory':
                    acm = DirectoryAccessorManager.fromMemory(sa.tree);
                    break;
                case 'json':
                    acm = JSONAccessorManager.fromMemory();
                    break;
                case 'binary':
                    acm = BinaryAccessorManager.fromMemory();
                    break;
                case 'text':
                    acm = TextAccessorManager.fromMemory();
                    break;
                case 'custom':
                    const event = this.customAccessEvents[sa.id];
                    if (!event) {
                        throw new StorageError('Invalid access type');
                    }
                    const ac = event.init(null as any, ...sa.args);
                    acm = CustomAccessorManager.from(ac, {
                        customId: sa.id,
                        event,
                        actualPath: null as any,
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
        };

        return new StorageAccessControl({
            onAccess,
            onRelease,
            onChainDependency,
        });
    }
}

export default MemACStorage;