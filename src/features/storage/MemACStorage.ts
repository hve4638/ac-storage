import { BinaryAccessorManager, CustomAccessorManager, DirectoryAccessorManager, IAccessorManager, JSONAccessorManager, TextAccessorManager } from 'features/accessors';
import { Accesses } from 'features/StorageAccess';
import StorageAccessControl from 'features/StorageAccessControl';
import { StorageError } from './errors';
import ACStorage from './ACStorage';

class MemACStorage extends ACStorage {
    constructor() {
        super('', { noCache: true });
    }

    override async getOrCreateAccessorFromAccess(
        identifier: string,
        sa: Accesses,
        mode: 'create' | 'open' | 'access'
    ): Promise<IAccessorManager<unknown>> {
        this.eventListeners.access?.(identifier, sa);

        let item = this.accessors.get(identifier);
        if (item != undefined && !item.isDropped()) {
            if (mode === 'create') {
                throw new StorageError(`File '${identifier}' already exists in memory`);
            }
            return item;
        }
        
        let acm:IAccessorManager<unknown>;
        switch(sa.accessType) {
            case 'directory':
                acm = DirectoryAccessorManager.fromMemory(sa.tree);
                break;
            case 'json':
                acm = JSONAccessorManager.fromMemory(sa.structure);
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
                const ac = await event.init(null as any, ...sa.args);
                acm = CustomAccessorManager.from(ac, {
                    customId: sa.id,
                    event,
                    actualPath: null as any,
                    customArgs: sa.args,
                });
                break;
            default:
                throw new StorageError('Logic Error : Invalid access type');
                break;
        }

        const exists = await acm.exists();

        if (mode === 'create') {
            if (exists) {
                throw new StorageError(`File '${identifier}' already exists in memory`);
            }
            await acm.create();
        } else if (mode === 'open') {
            if (!exists) {
                throw new StorageError(`File '${identifier}' does not exist`);
            }
            await acm.load();
        } else {
            if (!exists) await acm.create();
            else await acm.load();
        }
        
        this.accessCache[identifier] = sa.accessType !== 'custom' ? sa.accessType : sa.id;
        this.accessors.set(identifier, acm);
        return acm;
    }

    override initAccessControl() {
        const onAccess = async (identifier:string, sa:Accesses) => {
            return await this.getOrCreateAccessorFromAccess(identifier, sa, 'access');
        }
        const onDestroy = async (identifier:string) => {
            const accessor = this.accessors.get(identifier);
            if (!accessor) return;

            for (const child of accessor.dependent) {
                await onDestroy(child);
            }
            if (identifier === '') return;
            this.eventListeners.destroy?.(identifier);

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
            onDestroy,
            onChainDependency,
        });
    }

    override async release(identifier:string) {
        await this.commit(identifier);
        await this.#unloadFromMemory(identifier);
    }

    override async releaseDir(identifier:string) {
        if (identifier === '') {
            throw new StorageError('Cannot release the root directory. use releaseAll() instead.');
        }
        
        await this.commit(identifier);
        await this.#unloadFromMemory(identifier);
    }

    override async releaseAll() {
        await this.commitAll();
        await this.#unloadFromMemory('');
    }

    async #unloadFromMemory(identifier:string) {
        const accessor = this.accessors.get(identifier);
        if (!accessor) return;

        for (const child of accessor.dependent) {
            await this.#unloadFromMemory(child);
        }

        if (identifier !== '') {
            delete this.accessCache[identifier];
            this.accessors.delete(identifier);
        }
    }
}

export default MemACStorage;