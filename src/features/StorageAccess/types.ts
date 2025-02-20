import { JSONTree } from 'types/json';

export type AccessType = 'nothing' | 'text' | 'binary' | 'json' | 'custom' | 'union' | 'directory';

export type BasicAccess = {
    accessType : 'nothing' | 'text' | 'binary'
};
export type JSONAccess = {
    accessType : 'json',
    structure : JSONTree|null
}
export type CustomAccess = {
    accessType : 'custom',
    id : string,
    args : unknown[]
}
export type UnionAccess = {
    accessType : 'union',
    accesses : Accesses[]
}
export type DirectoryAccess = {
    accessType : 'directory',
}

export type NonUnionAccesses = BasicAccess | JSONAccess | CustomAccess;
export type Accesses = NonUnionAccesses | UnionAccess | DirectoryAccess;

