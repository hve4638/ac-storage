import { JSONTree, JSONType } from "types/json";
import JSONAccessorManager from "./JSONAccessorManager";

describe('JSONAccessor', () => {
    const trulyTestcases:[JSONTree|undefined, JSONTree|undefined][] = [
        [{}, {}],
        [undefined, undefined],
        [{a : JSONType.string}, {a : JSONType.string}],
        [{a : {}}, {a : {}}],
        [{a : { a : JSONType.string }}, {a : { a : JSONType.string }}],
        [{a : { a : JSONType.array }}, {a : { a : JSONType.array }}],
    ];
    const falselyTestcases:[JSONTree|undefined, JSONTree|undefined][] = [
        [{}, undefined],
        [{}, {a : JSONType.string}],
        [{a : JSONType.string}, {b : JSONType.string}],
        [{a : JSONType.string}, {a : JSONType.number}],
        [{a : {}}, {a : { a : JSONType.string }}],
        [{a : { a : JSONType.string }}, {a : { a : JSONType.number }}],
    ];

    trulyTestcases.forEach(([a, b], index) => {
        test(`isCompatible : true (${index})`, () => {
            const one = JSONAccessorManager.fromMemory(a);
            const other = JSONAccessorManager.fromMemory(b);
            
            expect(one.isCompatible(other)).toBe(true);
        });
    });

    falselyTestcases.forEach(([a, b], index) => {
        test(`isCompatible : false (${index})`, () => {
            const one = JSONAccessorManager.fromMemory(a);
            const other = JSONAccessorManager.fromMemory(b);
            
            expect(one.isCompatible(other)).toBe(false);
        });
    });
});