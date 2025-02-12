type Tree = {
    [key:string]:Tree|any;
}

type TreeResult = {
    value:any;
    path:string[]
}

class TreeExplorer {
    #tree:Tree;
    #splitChar:string;
    #allowWildcard:boolean;

    constructor(tree:Tree, splitChar:string='.', allowWildcard:boolean = true) {
        this.#tree = JSON.parse(JSON.stringify(tree));
        this.#splitChar = splitChar;
        this.#allowWildcard = allowWildcard;
    }

    get(path:string) {
        const keys = path.split(this.#splitChar);
        return this.#find(keys, this.#tree)?.value ?? null;
    }

    walk(path:string):TreeResult|null {
        const keys = path.split(this.#splitChar);
        return this.#find(keys, this.#tree);
    }

    #find(keys:string[], tree:Tree):null|TreeResult {
        if (keys.length === 0) {
            return {
                value : tree,
                path : []
            } as TreeResult;
        }
        if (typeof tree !== 'object') {
            return null;
        }

        const key = keys.splice(0, 1)[0];
        if (key in tree) {
            const result = this.#find(keys, tree[key]);
            if (result) {
                return { value : result.value, path : [key, ...result.path] };
            }
        }
        else if (this.#allowWildcard) {
            if ('*' in tree) {
                const result = this.#find(keys, tree['*']);
                if (result) {
                    return { value : result.value, path : ['*', ...result.path] };
                }
            }
            
            if ('**/*' in tree) {
                return {
                    value : tree['**/*'],
                    path : ['**/*']
                } as TreeResult;
            }
        }

        return null;
    }
}

export default TreeExplorer;