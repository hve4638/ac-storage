export interface IDirectoryAccessor {
    create():void;
    exists():boolean;
    drop():void;
}