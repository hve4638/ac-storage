# AC-Storage

## Install

```bash
npm install ac-storage
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

