export const JSONType = {
    null : 0,
    boolean : 0b0000_0001,
    string  : 0b0000_0010,
    number  : 0b0000_0100,
    array   : 0b0000_1000,
    object  : 0b0001_0000,
    any : 0b1111_1111,
} as const;
export type JSONType = number;

export type JSONTree = {
    [key:string]:JSONTree|JSONType;
}