import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import { terser } from 'rollup-plugin-terser';

export default [
    {
        input: 'src/index.ts',
        output: [
            {
                file: 'dist/bundle.cjs',
                format: 'cjs',
                sourcemap: true,
            },
            {
                file: 'dist/bundle.mjs',
                format: 'es',
                sourcemap: true,
            },
        ],
        external: ['sqlite-appfile', 'node:sqlite'],
        plugins: [
            resolve(), // Node.js 모듈 해석
            commonjs(), // 필요시 CommonJS 변환
            json(),
            typescript({ tsconfig: './tsconfig.json' }), // TypeScript 변환
            // terser(), // 코드 압축 (필요시 활성화)
        ],
    },
    {
        input: 'src/index.ts', // 또는 .d.ts 합친 엔트리
        output: {
            file: 'dist/index.d.ts',
            format: 'es',
        },
        plugins: [
            dts({
                compilerOptions: {
                    "baseUrl": "./",
                    "paths": {
                      "@/*": ["src/*"],
                      "types": ["src/types/index"],
                      "types/*": ["src/types/*"],
                      "errors": ["src/errors/index"],
                      "features/*": ["src/features/*"],
                      "data/*": ["src/data/*"],
                      "utils": ["src/utils/index"],
                      "utils/*": ["src/uitls/*"]
                    }
                },
            }),
        ],
    }
];
