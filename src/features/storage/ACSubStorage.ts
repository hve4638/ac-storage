import { IBinaryAccessor, IJSONAccessor, ITextAccessor } from '@/features/accessors';

import { IACSubStorage } from './types';

class ACSubStorage implements IACSubStorage {
    #master:IACSubStorage;
    #prefix:string;

    constructor(master:IACSubStorage, prefix:string) {
        this.#master = master;
        this.#prefix = prefix;
    }
    
    subStorage(identifier:string):IACSubStorage {
        return this.#master.subStorage(this.#prefix + ':' + identifier);
    }

    async access(identifier:string, accessType:string):Promise<unknown> {
        return await this.#master.access(this.#prefix + ':' + identifier, accessType);
    }
    async accessAsJSON(identifier:string):Promise<IJSONAccessor> {
        return await this.access(identifier, 'json') as IJSONAccessor;
    }
    async accessAsText(identifier:string):Promise<ITextAccessor> {
        return await this.access(identifier, 'text') as ITextAccessor;
    }
    async accessAsBinary(identifier:string):Promise<IBinaryAccessor> {
        return await this.access(identifier, 'binary') as IBinaryAccessor;
    }
    async copy(oldIdentifier:string, newIdentifier:string) {
        await this.#master.copy(this.#prefix + ':' + oldIdentifier, this.#prefix + ':' + newIdentifier);
    }
    async move(oldIdentifier:string, newIdentifier:string) {
        await this.#master.move(this.#prefix + ':' + oldIdentifier, this.#prefix + ':' + newIdentifier);
    }

    async dropDir(identifier:string) {
        await this.dropDir(this.#prefix + ':' + identifier);
    }

    async drop(identifier:string) {
        await this.drop(this.#prefix + ':' + identifier);
    }
    
    async dropAll() {
        await this.dropDir(this.#prefix);
    }

    async commit(identifier:string='') {
        await this.#master.commit(this.#prefix + ':' + identifier);
    }

    async commitAll() {
        await this.#master.commit(this.#prefix);
    }
}

export default ACSubStorage;