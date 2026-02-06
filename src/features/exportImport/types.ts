/**
 * Export/Import 기능을 위한 타입 정의
 */

/**
 * Export 옵션
 */
export interface ExportOptions {
    /** 기존 파일 덮어쓰기 허용 (default: false) */
    overwrite?: boolean;
    /** 내보내기 전 commit 수행 (default: true) */
    commitBeforeExport?: boolean;
    /** 하위 경로 포함 여부 (default: true) */
    recursive?: boolean;
}

/**
 * Import 옵션
 */
export interface ImportOptions {
    /** 기존 파일 덮어쓰기 허용 (default: false) */
    overwrite?: boolean;
    /** 충돌 시 동작 (default: 'error') */
    onConflict?: 'skip' | 'overwrite' | 'error';
    /** 가져오기 후 commit 수행 (default: true) */
    commitAfterImport?: boolean;
}

/**
 * Export 결과
 */
export interface ExportResult {
    /** 성공 여부 */
    success: boolean;
    /** 내보낸 파일 수 */
    exportedCount: number;
    /** 저장된 DB 파일 경로 */
    exportPath: string;
    /** 내보낸 identifier 목록 */
    identifiers: string[];
}

/**
 * Import 결과
 */
export interface ImportResult {
    /** 성공 여부 */
    success: boolean;
    /** 가져온 파일 수 */
    importedCount: number;
    /** 건너뛴 파일 수 */
    skippedCount: number;
    /** 가져온 identifier 목록 */
    identifiers: string[];
}

/**
 * SQLite DB에 저장되는 파일 레코드
 */
export interface FileRecord {
    /** identifier (예: 'auth:default.json') */
    identifier: string;
    /** access type ('json', 'text', 'binary', 'custom') */
    accessType: string;
    /** 파일 내용 (바이너리) */
    content: Buffer;
    /** custom accessor의 경우 id */
    customId?: string;
    /** 생성 시간 */
    createdAt?: string;
    /** 수정 시간 */
    updatedAt?: string;
}

/**
 * 메타데이터
 */
export interface ExportMetadata {
    /** 스키마 버전 */
    version: string;
    /** 내보낸 시간 */
    exportedAt: string;
    /** 내보낸 루트 identifier */
    rootIdentifier: string;
}

/** 현재 스키마 버전 */
export const SCHEMA_VERSION = '1.0';
