import StorageAccess from 'features/StorageAccess';
import StorageAccessControl, { AccessTree } from 'features/StorageAccessControl';
import { AccessDeniedError, DirectoryAccessError, NotRegisterError } from './errors';

describe('StorageAccessControl Test', () => {
    test('access', () => {
        const accesses:string[] = [];
        const ac = new StorageAccessControl({
            onAccess: (identifier, accessType) => {
                accesses.push(identifier);
                return {} as any;
            },
            onAccessDir: (identifier) => {
                accesses.push(identifier);
            },
            onRelease: (identifier) => {},
            onReleaseDir: (identifier) => {},
            onChainDependency: (idDependBy, idDependTo) => {}
        });

        ac.register({
            'config.json' : StorageAccess.JSON(),
            'data.txt' : StorageAccess.Text(),
        })
        
        ac.access('config.json', 'json');
        expect(accesses).toEqual([ 'config.json', ]);
        
        accesses.length = 0;
        ac.access('data.txt', 'text');
        expect(accesses).toEqual([ 'data.txt' ]);

        
        // 등록되지 않은 파일
        expect(()=>ac.access('cache.json', 'text')).toThrow(NotRegisterError);

        // 잘못된 접근 타입
        expect(()=>ac.access('config.json', 'text')).toThrow(AccessDeniedError);
    });

    test('access dir', ()=>{
        const accesses:string[] = [];
        const accessesDir:[string, AccessTree][] = [];
        const ac = new StorageAccessControl({
            onAccess: (identifier, accessType) => {
                accesses.push(identifier);
                return {} as any;
            },
            onAccessDir: (identifier, tree) => {
                accessesDir.push([identifier, tree]);
            },
            onRelease: (identifier) => {},
            onReleaseDir: (identifier) => {},
            onChainDependency(idDependBy, idDependTo) {},
        });

        const fullTree = {
            'base' : {
                'config.json' : StorageAccess.JSON(),
            },
            'layer1' : {
                'layer2' : {
                    'data.txt' : StorageAccess.Text()
                }
            }
        }
        ac.register(fullTree);
        
        ac.access('base:config.json', 'json');
        expect(accesses).toEqual([ 'base:config.json' ]);
        expect(accessesDir).toEqual([ ['base', fullTree['base']] ]);
        
        accesses.length = 0;
        accessesDir.length = 0;
        ac.access('layer1:layer2:data.txt', 'text');
        expect(accesses).toEqual([ 'layer1:layer2:data.txt' ]);
        expect(accessesDir).toEqual([
            ['layer1', fullTree['layer1']],
            ['layer1:layer2', fullTree['layer1']['layer2']],
        ]);
        
        expect(()=>ac.access('base', 'text')).toThrow(DirectoryAccessError);
        expect(()=>ac.access('layer1', 'text')).toThrow(DirectoryAccessError);
        expect(()=>ac.access('layer1:layer2', 'text')).toThrow(DirectoryAccessError);
    });

    
    test('dependency', ()=>{
        const dependency:{from:string, to:string}[] = [];
        const ac = new StorageAccessControl({
            onAccess: (identifier, accessType) => { return {} as any;},
            onAccessDir: (identifier, tree) => {},
            onRelease: (identifier) => {},
            onReleaseDir: (identifier) => {},
            onChainDependency(idDependBy, idDependTo) {
                dependency.push({from:idDependBy, to:idDependTo});
            },
        });

        const dep = (from:string, to:string) => ({from, to});

        const fullTree = {
            'base' : {
                'config.json' : StorageAccess.JSON(),
            },
            'layer1' : {
                'layer2' : {
                    'data.txt' : StorageAccess.Text()
                }
            }
        }
        ac.register(fullTree);
        
        ac.access('base:config.json', 'json');
        expect(dependency).toEqual([dep('base', 'base:config.json')]);
        dependency.length = 0;

        ac.access('layer1:layer2:data.txt', 'text');
        expect(dependency).toEqual([
            dep('layer1', 'layer1:layer2'),
            dep('layer1:layer2', 'layer1:layer2:data.txt')
        ]);
    });
});