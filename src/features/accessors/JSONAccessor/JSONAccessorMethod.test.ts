import MemJSONAccessor from './MemJSONAccessor';
import { JSONType } from 'types/json';


describe('JSONAccessor : method', () => {
    let accessor:MemJSONAccessor;
    
    beforeEach(() => {
        accessor = new MemJSONAccessor({
            box1 : {
                name : JSONType.string,
                id : JSONType.string,
                no : JSONType.number,
                addition : {
                    x : JSONType.number,
                    y : JSONType.number,
                }
            },
            array : JSONType.array,
            layer1 : {
                array : JSONType.array,
            }
        });
    });

    test('exists', () => {
        const accessPath = ['box1','box1.name','box1.id','box1.addition','box1.addition.x'];
        const expectExist = (expected:boolean[]) => {
            const actual = accessor.exists(accessPath);
            expect(actual).toEqual(expected);
        }

        expectExist([false, false, false, false, false]);

        accessor.setOne('box1.name', 'test');
        expectExist([true, true, false, false, false]);
        
        accessor.setOne('box1.addition.x', 0);
        expectExist([true, true, false, true, true]);
        
        accessor.removeOne('box1.addition.x');
        expectExist([true, true, false, true, false]);

        accessor.removeOne('box1.addition');
        expectExist([true, true, false, false, false]);

        accessor.removeOne('box1');
        expectExist([false, false, false, false, false]);
    });

    test('array', () => {
        expect(accessor.getOne('array')).toEqual(undefined);

        accessor.pushOneToArray('array', 1);
        expect(accessor.getOne('array')).toEqual([1]);

        accessor.pushToArray([['array', 2]]);
        expect(accessor.getOne('array')).toEqual([1,2]);

        accessor.pushToArray({ array : 3 });
        expect(accessor.getOne('array')).toEqual([1,2,3]);
        
        accessor.set({ array : [4,5,6] });
        expect(accessor.getOne('array')).toEqual([4,5,6]);
    });
    
    test('array - object', () => {
        const a = 1;
        const b = 2;
        const c = 3;
        const d = 4;
        const e = 5;
        const f = 6;
        expect(accessor.getOne('array')).toEqual(undefined);

        accessor.pushOneToArray('array', a);
        expect(accessor.getOne('array')).toEqual([a]);

        accessor.pushToArray([['array', b]]);
        expect(accessor.getOne('array')).toEqual([a,b]);

        accessor.pushToArray({ array : c });
        expect(accessor.getOne('array')).toEqual([a,b,c]);
        
        accessor.set({ array : [d,e,f] });
        expect(accessor.getOne('array')).toEqual([d,e,f]);
    });

    test('nested array', () => {
        const target = 'layer1.array';
        expect(accessor.getOne(target)).toEqual(undefined);

        accessor.pushOneToArray(target, 1);
        expect(accessor.getOne(target)).toEqual([1]);

        accessor.pushToArray([[target, 2]]);
        expect(accessor.getOne(target)).toEqual([1,2]);

        accessor.pushToArray({ layer1 : { array : 3 } });
        expect(accessor.getOne(target)).toEqual([1,2,3]);
        
        accessor.set({ layer1 : { array : [4,5,6] } });
        expect(accessor.getOne(target)).toEqual([4,5,6]);
    });

    test('object in array', () => {
        const val = (x:any)=>({ value : x });
        const target = 'layer1.array';
        expect(accessor.getOne(target)).toEqual(undefined);

        accessor.pushOneToArray(target, val(1));
        expect(accessor.getOne(target)).toEqual([val(1)]);

        accessor.pushToArray([[target, val(2)]]);
        expect(accessor.getOne(target)).toEqual([val(1), val(2)]);

        accessor.pushToArray({ layer1 : { array : val(3) } });
        expect(accessor.getOne(target)).toEqual([val(1), val(2), val(3)]);
        
        accessor.set({ layer1 : { array : [val(4), val(5), val(6)] } });
        expect(accessor.getOne(target)).toEqual([val(4), val(5), val(6)]);
    });
});