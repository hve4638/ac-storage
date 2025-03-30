export interface ITextAccessor {
    hasExistingData():Promise<boolean>;
    
    write(contents:string):Promise<void>;
    append(contents:string):Promise<void>;
    read():Promise<string>;
    
    save():Promise<void>;
    drop():Promise<void>;
    get dropped():boolean;
}
