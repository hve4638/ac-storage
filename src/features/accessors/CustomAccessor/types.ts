export type ICustomAccessor = {
    createData?():void;
    loadData?():void;
    hasExistingData?():boolean;

    commit():void;
    drop():void;
    isDropped():boolean;
}