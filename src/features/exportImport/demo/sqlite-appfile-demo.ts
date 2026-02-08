import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
    if (a.byteLength !== b.byteLength) return false;
    for (let i = 0; i < a.byteLength; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function main(): void {
    const tmpDir = path.resolve(process.cwd(), '.sisyphus/tmp/sqlite-appfile-demo');
    fs.mkdirSync(tmpDir, { recursive: true });

    const appfilePath = path.join(tmpDir, 'demo.appfile');
    if (fs.existsSync(appfilePath)) {
        fs.unlinkSync(appfilePath);
    }

    const require = createRequire(path.join(process.cwd(), 'package.json'));
    const sqliteAppfile = require('sqlite-appfile') as any;
    const AppFile = sqliteAppfile.AppFile as any;

    const app = AppFile.create(appfilePath);
    const appAny = app as any;

    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(appAny)).sort();
    console.log(`DEMO: methods=${JSON.stringify(methods)}`);

    const writeFileFn = (appAny.writeFile ?? appAny.write) as ((p: string, c: Uint8Array) => void) | undefined;
    const readFileFn = (appAny.readFile ?? appAny.read) as ((p: string) => Uint8Array | undefined) | undefined;
    const deleteFileFn = (appAny.deleteFile ?? appAny.delete) as ((p: string) => boolean) | undefined;
    const existsFn = appAny.exists as ((p: string) => boolean) | undefined;
    const writeTextFn = appAny.writeText as ((p: string, t: string) => void) | undefined;
    const writeJsonFn = appAny.writeJson as ((p: string, v: unknown) => void) | undefined;

    assert(typeof writeFileFn === 'function', 'No write function found (writeFile/write)');
    assert(typeof readFileFn === 'function', 'No read function found (readFile/read)');
    assert(typeof deleteFileFn === 'function', 'No delete function found (deleteFile/delete)');
    assert(typeof existsFn === 'function', 'No exists function found (exists)');

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const textPath = '/readme.txt';
    const jsonPath = '/config.json';
    const binPath = '/bin.dat';

    const textValue = 'Hello sqlite-appfile';
    if (typeof writeTextFn === 'function') {
        writeTextFn.call(appAny, textPath, textValue);
    } else {
        writeFileFn.call(appAny, textPath, encoder.encode(textValue));
    }
    const textBytes = readFileFn.call(appAny, textPath);
    assert(textBytes instanceof Uint8Array, 'Text read returned empty');
    assert(decoder.decode(textBytes) === textValue, 'Text round-trip mismatch');
    console.log('DEMO: text ok');

    const jsonValue = { version: '1.0.0', theme: 'light' };
    if (typeof writeJsonFn === 'function') {
        writeJsonFn.call(appAny, jsonPath, jsonValue);
    } else {
        writeFileFn.call(appAny, jsonPath, encoder.encode(JSON.stringify(jsonValue)));
    }
    const jsonBytes = readFileFn.call(appAny, jsonPath);
    assert(jsonBytes instanceof Uint8Array, 'JSON read returned empty');
    const jsonParsed = JSON.parse(decoder.decode(jsonBytes)) as typeof jsonValue;
    assert(jsonParsed.version === jsonValue.version && jsonParsed.theme === jsonValue.theme, 'JSON round-trip mismatch');
    console.log('DEMO: json ok');

    const binValue = new Uint8Array([0, 255, 1, 2, 3, 4, 5]);
    writeFileFn.call(appAny, binPath, binValue);
    const binBytes = readFileFn.call(appAny, binPath);
    assert(binBytes instanceof Uint8Array, 'Binary read returned empty');
    assert(equalBytes(binBytes, binValue), 'Binary round-trip mismatch');
    console.log('DEMO: bin ok');

    const deleted = deleteFileFn.call(appAny, textPath);
    assert(deleted === true, 'Delete returned false');
    assert(existsFn.call(appAny, textPath) === false, 'File still exists after delete');
    console.log('DEMO: delete ok');

    if (typeof appAny.close === 'function') {
        appAny.close();
    }
}

try {
    main();
} catch (err) {
    console.error('DEMO: failed');
    console.error(err);
    process.exitCode = 1;
}
