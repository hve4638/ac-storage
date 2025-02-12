import { JSONTree } from 'types/json';
import JSONAccessor from './JSONAccessor';

class MemJSONAccessor extends JSONAccessor {
    constructor(tree:JSONTree|null=null) {
        super('', tree);
    }

    override readFile() {
        // nothing to do
    }
    override writeFile() {
        // nothing to do
    }
    override removeFile() {
        // nothing to do
    }
}

export default MemJSONAccessor;