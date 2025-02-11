import { JSONTree } from './json';

export type BasicStorageAccessType = {
    accessType : 'nothing' | 'text' | 'binary'
};
export type JSONStorageAccessType = {
    accessType : 'json',
    structure : JSONTree|null
}
export type CustomStorageAccessType = {
    accessType : 'custom',
    id : string,
    args : unknown[]
}
export type UnionStorageAccessType = {
    accessType : 'union',
    accesses : NonUnionStorageAccessType[]
}

export type NonUnionStorageAccessType = BasicStorageAccessType | JSONStorageAccessType | CustomStorageAccessType;
export type StorageAccessType = NonUnionStorageAccessType | UnionStorageAccessType;
