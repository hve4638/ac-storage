import { StorageError } from '../storage/errors';

export class StorageAccessError extends StorageError {
    constructor(message:string) {
        super(message);
        this.name = 'StorageAccessError';
    }
}

export class NotRegisterError extends StorageError {
    constructor(message:string) {
        super(message);
        this.name = 'NotRegisteredError';
    }
}

export class AccessDeniedError extends StorageError {
    constructor(message:string) {
        super(message);
        this.name = 'AccessDeniedError';
    }
}

export class DirectoryAccessError extends StorageError {
    constructor(message:string) {
        super(message);
        this.name = 'DirectoryAccessError';
    }
}

export class UncompatibleAccessorError extends StorageError {
    constructor(message:string) {
        super(message);
        this.name = 'UncompatibleError';
    }
}