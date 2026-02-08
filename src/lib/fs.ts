import { closeSync, openSync, writeSync } from 'node:fs';
import { open } from 'node:fs/promises';

type WriteData = string | Uint8Array;

interface IWritableFileHandle {
    writeFile(data: WriteData): Promise<void>;
    close(): Promise<void>;
}

export async function writeFile(filePath: string, data: WriteData): Promise<void> {
    const handle = await open(filePath, 'w');
    const writableHandle = handle as unknown as IWritableFileHandle;
    try {
        await writableHandle.writeFile(data);
    } finally {
        await writableHandle.close();
    }
}

export function writeFileSync(filePath: string, data: WriteData, encoding: BufferEncoding = 'utf8'): void {
    const fd = openSync(filePath, 'w');
    try {
        if (typeof data === 'string') {
            writeSync(fd, data, null, encoding);
        } else {
            writeSync(fd, data, 0, data.byteLength, 0);
        }
    } finally {
        closeSync(fd);
    }
}
