export interface IDirectoryAccessor {
    create():void;
    exists():boolean;
    copy(other:IDirectoryAccessor):void;
    move(other:IDirectoryAccessor):void;
    drop():void;
}