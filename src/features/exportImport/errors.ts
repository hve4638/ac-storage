/**
 * Export/Import 관련 에러 클래스
 */

/**
 * Export/Import 기본 에러
 */
export class ExportImportError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ExportImportError';
    }
}

/**
 * Export 관련 에러
 */
export class ExportError extends ExportImportError {
    constructor(message: string, public identifier?: string) {
        super(message);
        this.name = 'ExportError';
    }
}

/**
 * Import 관련 에러
 */
export class ImportError extends ExportImportError {
    constructor(message: string, public identifier?: string) {
        super(message);
        this.name = 'ImportError';
    }
}

/**
 * 스키마 버전 불일치 에러
 */
export class SchemaVersionError extends ImportError {
    constructor(expected: string, actual: string) {
        super(`Schema version mismatch: expected ${expected}, got ${actual}`);
        this.name = 'SchemaVersionError';
    }
}

/**
 * 파일 충돌 에러
 */
export class ConflictError extends ImportError {
    constructor(identifier: string) {
        super(`File conflict: '${identifier}' already exists`, identifier);
        this.name = 'ConflictError';
    }
}

/**
 * DB 파일 손상 에러
 */
export class CorruptedDBError extends ImportError {
    constructor(message: string = 'Database file is corrupted or invalid') {
        super(message);
        this.name = 'CorruptedDBError';
    }
}
