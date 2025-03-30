export interface IAccessorManager<AC=unknown> {
    accessor:AC;
    dependent : Set<string>;
    dependency : Set<string>;

    create():Promise<void>;
    load():Promise<void>;
    exists():Promise<boolean>;
    move(newACM:IAccessorManager<AC>):Promise<void>;
    copy(newACM:IAccessorManager<AC>):Promise<void>;
    isCompatible(other:IAccessorManager):boolean;
    drop():Promise<void>;
    commit():Promise<void>;
    isDropped():boolean;
}
