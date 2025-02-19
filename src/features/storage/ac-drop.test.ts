import StorageAccess from "features/StorageAccess";
import MemACStorage from "./MemACStorage";
import IACStorage from "./IACStorage";
import path from "path";
import { TEST_PATH } from "data/test";
import ACStorage from "./ACStorage";

describe('Accessor Drop', () => {
    const testDirectory = path.join(TEST_PATH, 'ac-drop');
    let storage:IACStorage;

    const TREE = {
        'layer1' : {
            'layer2' : {
                '*' : StorageAccess.Custom('test')
            },
            '*' : StorageAccess.Custom('test'),
        }
    }

    beforeEach(() => {
        storage = new ACStorage(testDirectory);
        storage.register(TREE);
    });

    test('drop', () => { 
        const dropLog:string[] = [];

        storage.addAccessEvent('test', {
            create: (actual:string) => {
                return {
                    commit() {

                    },
                    drop() {
                        dropLog.push(actual);
                    },
                    isDropped() {
                        return false;
                    }
                };
            },
        });

        storage.getAccessor('layer1:item1', 'test');
        storage.getAccessor('layer1:layer2:item2', 'test');
        storage.getAccessor('layer1:layer2:item3', 'test');
        
        storage.dropDir('layer1:layer2');
        expect(dropLog).toEqual(['layer1:layer2:item2', 'layer1:layer2:item3']);
    });
});