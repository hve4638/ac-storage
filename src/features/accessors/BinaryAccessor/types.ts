
export interface IBinaryAccessor {
    hasExistingData():boolean;

    read():Promise<Buffer>;
    write(buffer:Buffer):Promise<void>;
    writeBase64(data:string):Promise<void>;
    readBase64():Promise<string>;
    
    commit():Promise<void>;
    drop():Promise<void>;
    get dropped():boolean;
}