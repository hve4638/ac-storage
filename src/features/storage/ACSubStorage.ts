import { IBinaryAccessor, IJSONAccessor, ITextAccessor } from 'features/accessors/types';

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

    getJSONAccessor(identifier:string):IJSONAccessor {
        return this.getAccessor(identifier, 'json') as IJSONAccessor;
    }
    getTextAccessor(identifier:string):ITextAccessor {
        return this.getAccessor(identifier, 'text') as ITextAccessor;
    }
    getBinaryAccessor(identifier:string):IBinaryAccessor {
        return this.getAccessor(identifier, 'binary') as IBinaryAccessor;
    }
    getAccessor(identifier:string, accessType:string):unknown {
        return this.#master.getAccessor(this.#prefix + ':' + identifier, accessType);
    }
    copyAccessor(oldIdentifier:string, newIdentifier:string) {
        this.copyAccessor(this.#prefix + ':' + oldIdentifier, this.#prefix + ':' + newIdentifier);
    }

    moveAccessor(oldIdentifier:string, newIdentifier:string) {
        this.moveAccessor(this.#prefix + ':' + oldIdentifier, this.#prefix + ':' + newIdentifier);
    }
    
    dropDir(identifier:string) {
        this.dropDir(this.#prefix + ':' + identifier);
    }

    drop(identifier:string) {
        this.drop(this.#prefix + ':' + identifier);
    }
    
    dropAll() {
        this.dropDir(this.#prefix);
    }

    commit(identifier:string='') {
        this.#master.commit(this.#prefix + ':' + identifier);
    }

    commitAll() {
        this.#master.commit(this.#prefix);
    }
}

export default ACSubStorage;