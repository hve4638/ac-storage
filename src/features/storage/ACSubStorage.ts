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

    async create(identifier:string, accessType:string):Promise<unknown> {
        return await this.#master.create(this.#prefix + ':' + identifier, accessType);
    }
    async createAsJSON(identifier:string):Promise<IJSONAccessor> {
        return await this.create(identifier, 'json') as IJSONAccessor;
    }
    async createAsText(identifier:string):Promise<ITextAccessor> {
        return await this.create(identifier, 'text') as ITextAccessor;
    }
    async createAsBinary(identifier:string):Promise<IBinaryAccessor> {
        return await this.create(identifier, 'binary') as IBinaryAccessor;
    }

    async open(identifier:string, accessType:string):Promise<unknown> {
        return await this.#master.open(this.#prefix + ':' + identifier, accessType);
    }
    async openAsJSON(identifier:string):Promise<IJSONAccessor> {
        return await this.open(identifier, 'json') as IJSONAccessor;
    }
    async openAsText(identifier:string):Promise<ITextAccessor> {
        return await this.open(identifier, 'text') as ITextAccessor;
    }
    async openAsBinary(identifier:string):Promise<IBinaryAccessor> {
        return await this.open(identifier, 'binary') as IBinaryAccessor;
    }

    async copy(oldIdentifier:string, newIdentifier:string) {
        await this.#master.copy(this.#prefix + ':' + oldIdentifier, this.#prefix + ':' + newIdentifier);
    }
    async move(oldIdentifier:string, newIdentifier:string) {
        await this.#master.move(this.#prefix + ':' + oldIdentifier, this.#prefix + ':' + newIdentifier);
    }

    async dropDir(identifier:string) {
        await this.#master.dropDir(this.#prefix + ':' + identifier);
    }

    async drop(identifier:string) {
        await this.#master.drop(this.#prefix + ':' + identifier);
    }
    
    async dropAll() {
        await this.#master.dropDir(this.#prefix);
    }

    async release(identifier:string) {
        await this.#master.release(this.#prefix + ':' + identifier);
    }

    async releaseDir(identifier:string) {
        await this.#master.releaseDir(this.#prefix + ':' + identifier);
    }

    async releaseAll() {
        await this.#master.releaseDir(this.#prefix);
    }

    async commit(identifier:string='') {
        await this.#master.commit(this.#prefix + ':' + identifier);
    }

    async commitAll() {
        await this.#master.commit(this.#prefix);
    }
}

export default ACSubStorage;