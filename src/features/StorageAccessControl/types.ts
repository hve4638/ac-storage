import { IAccessor } from "../accessors";
import StorageAccess, { Accesses } from '../../features/StorageAccess'

export type AccessTree = {
    [key:string]:AccessTree|StorageAccess;
    '*'? : AccessTree|StorageAccess,
    '**/*'? : StorageAccess,
    ''? : never,
    ':'? : never,
}

export type StorageAccessControlEvent = {
    onAccess:(identifier:string, accessType:Accesses)=>IAccessor,
    onAccessDir:(identifier:string)=>void,
    onRelease:(identifier:string)=>void,
    onReleaseDir:(identifier:string)=>void,
}