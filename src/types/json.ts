export const JSONType = {
    null : 0,
    boolean : 1 << 0,
    string : 1 << 1,
    number : 1 << 2,
    array : 1 << 3,
    object : 1 << 4,
    any : 0b1111_1111,
} as const;
export type JSONType = number;

export type JSONTree = {
    [key:string]:JSONTree|JSONType;
}