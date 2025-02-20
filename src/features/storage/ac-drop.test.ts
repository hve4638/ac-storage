import StorageAccess from 'features/StorageAccess';
import MemACStorage from './MemACStorage';
import { IACStorage } from './types';
import path from 'path';
import { TEST_PATH } from 'data/test';
import ACStorage from './ACStorage';

describe('Accessor Drop', () => {
    const testDirectory = path.join(TEST_PATH, 'ac-drop');
    let storage:IACStorage;

    beforeEach(() => {
        storage = new ACStorage(testDirectory);
        storage.register({
            'layer1' : {
                'layer2' : {
                    'layer3' : {
                        '*' : StorageAccess.Text()
                    },
                    '*' : StorageAccess.Text()
                },
                '*' : StorageAccess.Text(),
            },
            '*' : StorageAccess.Text(),
        });
    });

    afterEach(() => {
        storage.dropAll();
    });

    test('drop', () => { 
        const dropLog:string[] = [];

        storage.addListener('release', (identifier:string) => {
            dropLog.push(identifier);
        });

        storage.getAccessor('layer1:layer2:item1', 'text');
        storage.getAccessor('layer1:layer2:item2', 'text');
        storage.getAccessor('layer1:layer2:item3', 'text');
        
        storage.dropDir('layer1:layer2');
        expect(dropLog).toEqual([
            'layer1:layer2:item1',
            'layer1:layer2:item2',
            'layer1:layer2:item3',
            'layer1:layer2',
        ]);
    });

    
    test('drop2', () => { 
        const accessLog:string[] = [];
        const dropLog:string[] = [];
        storage.addListener('access', (identifier:string) => {
            accessLog.push(identifier);
        });
        storage.addListener('release', (identifier:string) => {
            dropLog.push(identifier);
        });

        storage.getAccessor('layer1:layer2:item2', 'text');
        storage.getAccessor('layer1:layer2:item3', 'text');
        
        storage.dropDir('layer1');
        expect(accessLog).toEqual([
            'layer1',
            'layer1:layer2',
            'layer1:layer2:item2',
            'layer1',
            'layer1:layer2',
            'layer1:layer2:item3',
        ]);
        expect(dropLog).toEqual([
            'layer1:layer2:item2',
            'layer1:layer2:item3',
            'layer1:layer2',
            'layer1',
        ]);
    });

    test('dropAll', () => {
        const accessLog:string[] = [];
        const dropLog:string[] = [];
        storage.addListener('access', (identifier:string) => {
            accessLog.push(identifier);
        });
        storage.addListener('release', (identifier:string) => {
            dropLog.push(identifier);
        });

        storage.getAccessor('item1', 'text');
        storage.getAccessor('layer1:item2', 'text');
        storage.getAccessor('layer1:layer2:item3', 'text');
        storage.getAccessor('layer1:layer2:item4', 'text');
        storage.commit();
        
        storage.dropAll();
        expect(accessLog).toEqual([
            'item1',
            'layer1',
            'layer1:item2',
            'layer1',
            'layer1:layer2',
            'layer1:layer2:item3',
            'layer1',
            'layer1:layer2',
            'layer1:layer2:item4',
        ]);
        expect(dropLog).toEqual([
            'item1',
            'layer1:item2',
            'layer1:layer2:item3',
            'layer1:layer2:item4',
            'layer1:layer2',
            'layer1',
        ]);
    });
});