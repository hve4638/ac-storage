# AC-Storage

## Install

```bash
pnpm add ac-storage
```

## Example

```ts
import { ACStorage, StorageAccess } from 'ac-storage';

const storage = new ACStorage('./store');
storage.register({
  'auth' : {
    'default.json' : StorageAccess.JSON(),
  },
  'cache' : {
    'last_access.txt' : StorageAccess.Text(),
  }
});

const authAC = await storage.accessAsJSON('auth:default.json');
authAC.setOne('id', 'user');

const lastAccessAC = await storage.accessAsText('cache:last_access.txt');
lastAccessAC.write('20250607');

await storage.commit();
```

## API

### ACStorage

Storage instance that manages file access with access control.

#### Constructor
```ts
new ACStorage(basePath: string, options?: {
  cacheName?: string;
  noCache?: boolean;
})
```

#### Methods

**`register(tree: AccessTree): void`**  
Register file access permissions. Must be called before accessing files.

### File Access Methods

**`create(identifier: string, accessType: string): Promise<Accessor>`**  
Create a new file. **Throws error if file already exists.**

**`createAsJSON(identifier: string): Promise<IJSONAccessor>`**  
Create a new JSON file.

**`createAsText(identifier: string): Promise<ITextAccessor>`**  
Create a new text file.

**`createAsBinary(identifier: string): Promise<IBinaryAccessor>`**  
Create a new binary file.

**`open(identifier: string, accessType: string): Promise<Accessor>`**  
Open an existing file. **Throws error if file does not exist.**

**`openAsJSON(identifier: string): Promise<IJSONAccessor>`**  
Open an existing JSON file.

**`openAsText(identifier: string): Promise<ITextAccessor>`**  
Open an existing text file.

**`openAsBinary(identifier: string): Promise<IBinaryAccessor>`**  
Open an existing binary file.

**`access(identifier: string, accessType: string): Promise<Accessor>`**  
Access a file - creates if missing, opens if exists (default behavior).

**`accessAsJSON(identifier: string): Promise<IJSONAccessor>`**  
Access a JSON file.

**`accessAsText(identifier: string): Promise<ITextAccessor>`**  
Access a text file.

**`accessAsBinary(identifier: string): Promise<IBinaryAccessor>`**  
Access a binary file.

#### Access Methods Comparison

| Method | Creates if Missing | Loads if Exists | Error if Missing | Error if Exists |
|--------|-------------------|-----------------|------------------|-----------------|
| `create()` | ✅ | ❌ | N/A | ✅ |
| `open()` | ❌ | ✅ | ✅ | N/A |
| `access()` | ✅ | ✅ | ❌ | ❌ |

**Example:**
```typescript
// Create only - throws if file already exists
const config = await storage.createAsJSON('config.json');

// Open only - throws if file doesn't exist  
const existing = await storage.openAsJSON('config.json');

// Access - creates if missing, loads if exists
const flexible = await storage.accessAsJSON('config.json');
```

### File Operations

**`copy(oldIdentifier: string, newIdentifier: string): Promise<void>`**  
Copy a file from old identifier to new identifier.

**`move(oldIdentifier: string, newIdentifier: string): Promise<void>`**  
Move a file from old identifier to new identifier.

### Memory Management

**`drop(identifier: string): Promise<void>`**  
Delete and unload a specific file from memory. **Does not commit changes.**

**`dropDir(identifier: string): Promise<void>`**  
Delete and unload all files under the specified directory. **Does not commit changes.**

**`dropAll(): Promise<void>`**  
Delete and unload all files. **Does not commit changes.**

**`release(identifier: string): Promise<void>`**  
Commit changes and unload a file from memory. **File remains on disk.**

**`releaseDir(identifier: string): Promise<void>`**  
Commit and unload all files under the specified directory. **Files remain on disk.**

**`releaseAll(): Promise<void>`**  
Commit and unload all files from memory. **Files remain on disk.**

**`commit(identifier?: string): Promise<void>`**  
Commit changes to the filesystem. If identifier is provided, commits that file and its dependencies.

**`commitAll(): Promise<void>`**  
Commit all changes to the filesystem.

### Operations Comparison

| Operation | Commits Changes | Removes from Memory | Deletes File |
|-----------|----------------|---------------------|--------------|
| `commit()` | ✅ | ❌ | ❌ |
| `release()` | ✅ | ✅ | ❌ |
| `drop()` | ❌ | ✅ | ✅ |

**Example:**
```typescript
// Commit only - save changes but keep in memory
await storage.commit('config.json');

// Release - save and unload from memory (file persists)
await storage.release('config.json');

// Drop - delete file and unload (changes lost)
await storage.drop('temp.json');
```

**`subStorage(identifier: string): IACSubStorage`**  
Create a sub-storage scoped to a specific directory prefix.

**`addAccessEvent(customId: string, event: AccessorEvent): void`**  
Register a custom accessor type for handling custom file formats.

**`addListener(event: 'access' | 'destroy', listener: Function): void`**  
Add event listeners for file access and destroy events.
