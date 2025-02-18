import { IAccessor, IAccessorManager } from 'features/accessors';
import StorageAccess, { Accesses } from '../../features/StorageAccess'

export type AccessTree = {
    [key:string] :AccessTree|Accesses|undefined;
    '*'? : AccessTree|Accesses,
    '**/*'? : Accesses,
    ''? : never,
    ':'? : never,
}

export type StorageAccessControlEvent = {
    onAccess:(identifier:string, accessType:Accesses)=>IAccessorManager<IAccessor>,
    onAccessDir:(identifier:string, tree:AccessTree)=>void,
    onRelease:(identifier:string)=>void,
    onReleaseDir:(identifier:string)=>void,
    onChainDependency:(idDependBy:string, idDependTo:string)=>void,
}