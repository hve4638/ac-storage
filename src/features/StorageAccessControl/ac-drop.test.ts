import StorageAccess from "features/StorageAccess";
import StorageAccessControl from "features/StorageAccessControl";


describe('StorageAccessControl Drop Test', () => {
    test('Drop Accessor', () => {
        const eventLog:string[] = [];
        const ac = new StorageAccessControl({
            onAccess: (identifier, accessType) => {
                return {} as any;
            },
            onAccessDir: (identifier) => {},
            onRelease: (identifier) => {},
            onReleaseDir: (identifier) => {},
        });
        
        const accessor = storage.getAccessor('layer1:item1', 'json');
        const accessor = storage.getAccessor('layer1:layer2', 'json');
        expect(accessor).not.toBeNull();

        storage.dropAccessor('test');
        expect(storage.getAccessor('test')).toBeNull();
    });
});