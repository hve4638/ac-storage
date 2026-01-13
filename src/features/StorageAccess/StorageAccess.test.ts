import { JSONType, type ValidateJSONTree } from '@hve/json-accessor';
import StorageAccess from './StorageAccess';

/**
 * StorageAccess.JSON 제네릭 타입 검증 테스트
 *
 * 이 테스트는 컴파일 타임에 타입 검증이 올바르게 동작하는지 확인합니다.
 * IDE에서 타입 에러가 나타나면 실패, 에러가 없으면 성공입니다.
 */

// ============================================
// 1. 기본 타입 매핑 테스트
// ============================================

interface BasicSchema {
    str: string;
    num: number;
    bool: boolean;
}

const basicAccess = StorageAccess.JSON<BasicSchema>({
    str: JSONType.String(),
    num: JSONType.Number(),
    bool: JSONType.Bool(),
});

// ============================================
// 2. Nullable 타입 테스트
// ============================================

interface NullableSchema {
    name: string | null;
    age: number | null;
}

const nullableAccess = StorageAccess.JSON<NullableSchema>({
    name: JSONType.String().nullable(),
    age: JSONType.Number().nullable(),
});

// ============================================
// 3. Union 타입 테스트
// ============================================

interface UnionSchema {
    status: 'loading' | 'idle' | 'error';
    priority: 1 | 2 | 3;
}

const unionAccess = StorageAccess.JSON<UnionSchema>({
    status: JSONType.Union('loading', 'idle', 'error'),
    priority: JSONType.Union(1, 2, 3),
});

// ============================================
// 4. 배열 타입 테스트
// ============================================

interface ArraySchema {
    tags: string[];
    scores: number[];
}

const arrayAccess = StorageAccess.JSON<ArraySchema>({
    tags: JSONType.Array(JSONType.String()),
    scores: JSONType.Array(JSONType.Number()),
});

// ============================================
// 5. 중첩 객체 테스트
// ============================================

interface NestedSchema {
    user: {
        name: string;
        age: number;
    };
}

const nestedAccess = StorageAccess.JSON<NestedSchema>({
    user: {
        name: JSONType.String(),
        age: JSONType.Number(),
    },
});

// ============================================
// 6. unknown/any 타입 테스트
// ============================================

interface AnySchema {
    data: unknown;
    payload: any;
}

const anyAccess = StorageAccess.JSON<AnySchema>({
    data: JSONType.Any(),
    payload: JSONType.Any(),
});

// ============================================
// 7. 복합 스키마 테스트
// ============================================

interface ComplexSchema {
    id: string;
    count: number;
    active: boolean;
    tags: string[];
    status: 'draft' | 'published';
    metadata: {
        createdAt: string;
        updatedAt: string;
    };
    extra: unknown;
}

const complexAccess = StorageAccess.JSON<ComplexSchema>({
    id: JSONType.String(),
    count: JSONType.Number(),
    active: JSONType.Bool(),
    tags: JSONType.Array(JSONType.String()),
    status: JSONType.Union('draft', 'published'),
    metadata: {
        createdAt: JSONType.String(),
        updatedAt: JSONType.String(),
    },
    extra: JSONType.Any(),
});

// ============================================
// 8. 하위 호환성 테스트 (제네릭 없이 사용)
// ============================================

// 제네릭 없이 사용 - 기존 방식
const legacyAccess1 = StorageAccess.JSON();
const legacyAccess2 = StorageAccess.JSON({
    name: JSONType.String(),
    age: JSONType.Number(),
});

// JSONTree 직접 전달
const legacyAccess3 = StorageAccess.JSON({
    config: {
        enabled: JSONType.Bool(),
        options: JSONType.Array(),
    },
});

// ============================================
// 9. 실제 사용 시나리오 테스트
// ============================================

interface UserConfig {
    theme: 'light' | 'dark';
    language: string;
    notifications: {
        email: boolean;
        push: boolean;
    };
}

const userConfigAccess = StorageAccess.JSON<UserConfig>({
    theme: JSONType.Union('light', 'dark'),
    language: JSONType.String(),
    notifications: {
        email: JSONType.Bool(),
        push: JSONType.Bool(),
    },
});

interface AppState {
    version: string;
    lastOpened: string | null;
    recentFiles: string[];
    settings: {
        autoSave: boolean;
        interval: number;
    };
}

const appStateAccess = StorageAccess.JSON<AppState>({
    version: JSONType.String(),
    lastOpened: JSONType.String().nullable(),
    recentFiles: JSONType.Array(JSONType.String()),
    settings: {
        autoSave: JSONType.Bool(),
        interval: JSONType.Number(),
    },
});

// ============================================
// Jest 테스트 (런타임 - 항상 통과)
// ============================================

describe('StorageAccess.JSON generic type validation', () => {
    describe('Basic types', () => {
        it('should accept correct JSONType for string, number, boolean', () => {
            expect(basicAccess).toBeDefined();
            expect(basicAccess.value.accessType).toBe('json');
        });
    });

    describe('Nullable types', () => {
        it('should accept nullable JSONTypes', () => {
            expect(nullableAccess).toBeDefined();
        });
    });

    describe('Union types', () => {
        it('should accept Union JSONTypes for literal unions', () => {
            expect(unionAccess).toBeDefined();
        });
    });

    describe('Array types', () => {
        it('should accept Array JSONTypes', () => {
            expect(arrayAccess).toBeDefined();
        });
    });

    describe('Nested object types', () => {
        it('should accept nested structures', () => {
            expect(nestedAccess).toBeDefined();
        });
    });

    describe('Any/unknown types', () => {
        it('should accept Any JSONType for unknown/any', () => {
            expect(anyAccess).toBeDefined();
        });
    });

    describe('Complex schemas', () => {
        it('should accept complex nested schemas', () => {
            expect(complexAccess).toBeDefined();
        });
    });

    describe('Backward compatibility', () => {
        it('should work without generic parameter', () => {
            expect(legacyAccess1).toBeDefined();
            expect(legacyAccess2).toBeDefined();
            expect(legacyAccess3).toBeDefined();
        });
    });

    describe('Real-world scenarios', () => {
        it('should work with user config schema', () => {
            expect(userConfigAccess).toBeDefined();
        });

        it('should work with app state schema', () => {
            expect(appStateAccess).toBeDefined();
        });
    });
});
