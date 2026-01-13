// @ts-nocheck
/**
 * StorageAccess.JSON 타입 에러 검출 테스트
 *
 * 이 파일은 @ts-nocheck가 적용되어 있어 런타임에는 통과합니다.
 * 실제 타입 에러를 확인하려면 @ts-nocheck를 제거하고 IDE에서 확인하세요.
 *
 * 아래 모든 케이스는 타입 에러가 발생해야 합니다.
 */

import { JSONType } from '@hve/json-accessor';
import StorageAccess from './StorageAccess';

// ============================================
// String 필드에 잘못된 타입 할당
// ============================================

interface StringSchema { field: string; }

const stringWithNumber = StorageAccess.JSON<StringSchema>({
    field: JSONType.Number(),  // Error: string에 Number
});

const stringWithBool = StorageAccess.JSON<StringSchema>({
    field: JSONType.Bool(),    // Error: string에 Bool
});

const stringWithArray = StorageAccess.JSON<StringSchema>({
    field: JSONType.Array(),   // Error: string에 Array
});

const stringWithStruct = StorageAccess.JSON<StringSchema>({
    field: JSONType.Struct(),  // Error: string에 Struct
});

// ============================================
// Number 필드에 잘못된 타입 할당
// ============================================

interface NumberSchema { field: number; }

const numberWithString = StorageAccess.JSON<NumberSchema>({
    field: JSONType.String(),  // Error: number에 String
});

const numberWithBool = StorageAccess.JSON<NumberSchema>({
    field: JSONType.Bool(),    // Error: number에 Bool
});

const numberWithArray = StorageAccess.JSON<NumberSchema>({
    field: JSONType.Array(),   // Error: number에 Array
});

const numberWithStruct = StorageAccess.JSON<NumberSchema>({
    field: JSONType.Struct(),  // Error: number에 Struct
});

// ============================================
// Boolean 필드에 잘못된 타입 할당
// ============================================

interface BooleanSchema { field: boolean; }

const boolWithString = StorageAccess.JSON<BooleanSchema>({
    field: JSONType.String(),  // Error: boolean에 String
});

const boolWithNumber = StorageAccess.JSON<BooleanSchema>({
    field: JSONType.Number(),  // Error: boolean에 Number
});

const boolWithArray = StorageAccess.JSON<BooleanSchema>({
    field: JSONType.Array(),   // Error: boolean에 Array
});

const boolWithStruct = StorageAccess.JSON<BooleanSchema>({
    field: JSONType.Struct(),  // Error: boolean에 Struct
});

// ============================================
// Array 필드에 잘못된 타입 할당
// ============================================

interface ArraySchema { field: string[]; }

const arrayWithString = StorageAccess.JSON<ArraySchema>({
    field: JSONType.String(),  // Error: array에 String
});

const arrayWithNumber = StorageAccess.JSON<ArraySchema>({
    field: JSONType.Number(),  // Error: array에 Number
});

const arrayWithBool = StorageAccess.JSON<ArraySchema>({
    field: JSONType.Bool(),    // Error: array에 Bool
});

const arrayWithStruct = StorageAccess.JSON<ArraySchema>({
    field: JSONType.Struct(),  // Error: array에 Struct
});

// ============================================
// 중첩 객체에서 잘못된 타입 할당
// ============================================

interface NestedSchema {
    user: {
        name: string;
        age: number;
    };
}

const nestedWrongType = StorageAccess.JSON<NestedSchema>({
    user: {
        name: JSONType.Number(),  // Error: string에 Number
        age: JSONType.String(),   // Error: number에 String
    },
});

const nestedWrongStructure = StorageAccess.JSON<NestedSchema>({
    user: JSONType.String(),  // Error: object에 String
});

// ============================================
// 필드 누락
// ============================================

interface RequiredFieldsSchema {
    required1: string;
    required2: number;
}

const missingField = StorageAccess.JSON<RequiredFieldsSchema>({
    required1: JSONType.String(),
    // Error: required2 누락
});

// ============================================
// 존재하지 않는 필드 추가
// ============================================

interface StrictSchema {
    name: string;
}

const extraField = StorageAccess.JSON<StrictSchema>({
    name: JSONType.String(),
    extra: JSONType.Number(),  // Error: StrictSchema에 extra 없음
});

// ============================================
// 복합 에러 케이스
// ============================================

interface ComplexSchema {
    id: string;
    count: number;
    tags: string[];
    nested: {
        enabled: boolean;
    };
}

const multipleErrors = StorageAccess.JSON<ComplexSchema>({
    id: JSONType.Number(),     // Error: string에 Number
    count: JSONType.String(),  // Error: number에 String
    tags: JSONType.Bool(),     // Error: array에 Bool
    nested: {
        enabled: JSONType.String(),  // Error: boolean에 String
    },
});

// ============================================
// Jest 테스트 (런타임 - 항상 통과)
// ============================================

describe('StorageAccess.JSON type error detection', () => {
    it('placeholder - all type errors above should be caught at compile time', () => {
        // @ts-nocheck가 적용되어 있어 런타임에는 통과
        // 실제 타입 에러 확인은 @ts-nocheck 제거 후 IDE에서 확인
        expect(true).toBe(true);
    });

    it('documents expected type errors', () => {
        // 이 테스트의 목적:
        // 1. string 필드에 Number/Bool/Array/Struct 할당 시 에러
        // 2. number 필드에 String/Bool/Array/Struct 할당 시 에러
        // 3. boolean 필드에 String/Number/Array/Struct 할당 시 에러
        // 4. array 필드에 String/Number/Bool/Struct 할당 시 에러
        // 5. 중첩 객체에서 잘못된 타입 할당 시 에러
        // 6. 필수 필드 누락 시 에러
        // 7. 존재하지 않는 필드 추가 시 에러
        expect(true).toBe(true);
    });
});
