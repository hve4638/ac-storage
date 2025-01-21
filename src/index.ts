export type { default as IStorage } from './IStorage';
export type { IAccessor, IBinaryAccessor, IJSONAccessor, ITextAccessor } from './accessor/types';
export type { AccessTree } from './access-control';
export { StorageAccess } from './access-control';
export { default as FSStorage } from './FSStorage';
export { default as MemStorage } from './MemStorage';
export { StorageError } from './errors';

