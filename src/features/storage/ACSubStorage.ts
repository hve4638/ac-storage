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

    access(identifier:string, accessType:string):unknown {
        return this.#master.access(this.#prefix + ':' + identifier, accessType);
    }
    accessAsJSON(identifier:string):IJSONAccessor {
        return this.getAccessor(identifier, 'json') as IJSONAccessor;
    }
    accessAsText(identifier:string):ITextAccessor {
        return this.getAccessor(identifier, 'text') as ITextAccessor;
    }
    accessAsBinary(identifier:string):IBinaryAccessor {
        return this.getAccessor(identifier, 'binary') as IBinaryAccessor;
    }
    copy(oldIdentifier:string, newIdentifier:string) {
        this.#master.copy(this.#prefix + ':' + oldIdentifier, this.#prefix + ':' + newIdentifier);
    }
    move(oldIdentifier:string, newIdentifier:string) {
        this.#master.move(this.#prefix + ':' + oldIdentifier, this.#prefix + ':' + newIdentifier);
    }


    /** @deprecated */
    getJSONAccessor(identifier:string):IJSONAccessor {
        return this.getAccessor(identifier, 'json') as IJSONAccessor;
    }
    /** @deprecated */
    getTextAccessor(identifier:string):ITextAccessor {
        return this.getAccessor(identifier, 'text') as ITextAccessor;
    }
    /** @deprecated */
    getBinaryAccessor(identifier:string):IBinaryAccessor {
        return this.getAccessor(identifier, 'binary') as IBinaryAccessor;
    }
    /** @deprecated */
    getAccessor(identifier:string, accessType:string):unknown {
        return this.#master.getAccessor(this.#prefix + ':' + identifier, accessType);
    }
    /** @deprecated */
    copyAccessor(oldIdentifier:string, newIdentifier:string) {
        this.#master.copyAccessor(this.#prefix + ':' + oldIdentifier, this.#prefix + ':' + newIdentifier);
    }
    /** @deprecated */
    moveAccessor(oldIdentifier:string, newIdentifier:string) {
        this.#master.moveAccessor(this.#prefix + ':' + oldIdentifier, this.#prefix + ':' + newIdentifier);
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