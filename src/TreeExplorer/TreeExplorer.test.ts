import TreeExplorer from './TreeExplorer';

const TREE = {
    a: '1',
    b: {
        a : '2',
        '*' : {
            a : '3',
            '*' : '0'
        }
    },
    '*' : {
        a : '-1',
    },
    '**/*' : '-2'
}

describe('TreeExplorer', () => {
    test('get', () => {
        const explorer = new TreeExplorer(TREE, ':');
        expect(explorer.get('a')).toBe('1');
        expect(explorer.get('a:a')).toBe(null);
        expect(explorer.get('b:a')).toBe('2');
        expect(explorer.get('b:b:a')).toBe('3');
        expect(explorer.get('b:b:b')).toBe('0');
        expect(explorer.get('c:a')).toBe('-1');
        expect(explorer.get('c:b')).toBe('-2');
    });
    test('walk', () => {
        const explorer = new TreeExplorer(TREE, ':');
        expect(explorer.walk('a')?.path).toEqual(['a']);
        expect(explorer.walk('b:a')?.path).toEqual(['b', 'a']);
        expect(explorer.walk('b:b:a')?.path).toEqual(['b', '*', 'a']);
        expect(explorer.walk('b:b:b')?.path).toEqual(['b', '*', '*']);
        expect(explorer.walk('c:a')?.path).toEqual(['*', 'a']);
        expect(explorer.walk('c:b')?.path).toEqual(['**/*']);
    });
});