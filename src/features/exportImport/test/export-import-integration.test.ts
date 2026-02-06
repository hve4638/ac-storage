import * as fs from 'node:fs';
import * as path from 'node:path';
import { ACStorage } from 'features/storage';
import StorageAccess from 'features/StorageAccess';

const TEST_DIR = path.join(__dirname, '.test-export-import');
const STORAGE_DIR = path.join(TEST_DIR, 'storage');
const BACKUP_DIR = path.join(TEST_DIR, 'backup');

describe('Export/Import Integration', () => {
    beforeEach(() => {
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true });
        }
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    });

    afterEach(() => {
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true });
        }
    });

    describe('exportTo', () => {
        it('should export a single file', async () => {
            const storage = new ACStorage(STORAGE_DIR);
            storage.register({
                'config.json': StorageAccess.JSON(),
            });

            const config = await storage.accessAsJSON('config.json');
            config.setOne('key', 'value');
            await storage.commit();

            const exportPath = path.join(BACKUP_DIR, 'config-backup.db');
            const result = await storage.exportTo('config.json', exportPath);

            expect(result.success).toBe(true);
            expect(result.exportedCount).toBe(1);
            expect(result.identifiers).toContain('config.json');
            expect(fs.existsSync(exportPath)).toBe(true);
        });

        it('should export a directory recursively', async () => {
            const storage = new ACStorage(STORAGE_DIR);
            storage.register({
                'auth': {
                    'user.json': StorageAccess.JSON(),
                    'token.json': StorageAccess.JSON(),
                },
            });

            const user = await storage.accessAsJSON('auth:user.json');
            user.setOne('id', 'user123');
            
            const token = await storage.accessAsJSON('auth:token.json');
            token.setOne('access', 'abc123');
            
            await storage.commit();

            const exportPath = path.join(BACKUP_DIR, 'auth-backup.db');
            const result = await storage.exportTo('auth', exportPath, { recursive: true });

            expect(result.success).toBe(true);
            expect(result.exportedCount).toBe(2);
            expect(result.identifiers).toContain('auth:user.json');
            expect(result.identifiers).toContain('auth:token.json');
        });

        it('should throw if export path already exists without overwrite', async () => {
            const storage = new ACStorage(STORAGE_DIR);
            storage.register({
                'config.json': StorageAccess.JSON(),
            });

            await storage.accessAsJSON('config.json');
            await storage.commit();

            const exportPath = path.join(BACKUP_DIR, 'existing.db');
            fs.writeFileSync(exportPath, '');

            await expect(storage.exportTo('config.json', exportPath)).rejects.toThrow('already exists');
        });

        it('should overwrite existing file with overwrite option', async () => {
            const storage = new ACStorage(STORAGE_DIR);
            storage.register({
                'config.json': StorageAccess.JSON(),
            });

            const config = await storage.accessAsJSON('config.json');
            config.setOne('key', 'value');
            await storage.commit();

            const exportPath = path.join(BACKUP_DIR, 'existing.db');
            fs.writeFileSync(exportPath, 'old content');

            const result = await storage.exportTo('config.json', exportPath, { overwrite: true });

            expect(result.success).toBe(true);
        });
    });

    describe('importFrom', () => {
        it('should import files from a backup', async () => {
            const storage1 = new ACStorage(STORAGE_DIR);
            storage1.register({
                'auth': {
                    'user.json': StorageAccess.JSON(),
                },
            });

            const user = await storage1.accessAsJSON('auth:user.json');
            user.setOne('id', 'originalUser');
            await storage1.commit();

            const exportPath = path.join(BACKUP_DIR, 'backup.db');
            await storage1.exportTo('auth', exportPath);

            const storage2Dir = path.join(TEST_DIR, 'storage2');
            fs.mkdirSync(storage2Dir, { recursive: true });
            
            const storage2 = new ACStorage(storage2Dir);
            storage2.register({
                'restored': {
                    'user.json': StorageAccess.JSON(),
                },
            });

            const result = await storage2.importFrom(exportPath, 'restored');

            expect(result.success).toBe(true);
            expect(result.importedCount).toBe(1);
            
            const restoredUser = await storage2.accessAsJSON('restored:user.json');
            expect(restoredUser.getOne('id')).toBe('originalUser');
        });

        it('should skip conflicting files with skip option', async () => {
            const storage = new ACStorage(STORAGE_DIR);
            storage.register({
                'config.json': StorageAccess.JSON(),
                'restored': {
                    'config.json': StorageAccess.JSON(),
                },
            });

            const config = await storage.accessAsJSON('config.json');
            config.setOne('version', '1');
            await storage.commit();

            const exportPath = path.join(BACKUP_DIR, 'backup.db');
            await storage.exportTo('config.json', exportPath);

            const restoredConfig = await storage.accessAsJSON('restored:config.json');
            restoredConfig.setOne('version', '2');
            await storage.commit();

            const result = await storage.importFrom(exportPath, 'restored', { onConflict: 'skip' });

            expect(result.success).toBe(true);
            expect(result.skippedCount).toBe(1);
            expect(result.importedCount).toBe(0);

            const checkConfig = await storage.accessAsJSON('restored:config.json');
            expect(checkConfig.getOne('version')).toBe('2');
        });

        it('should overwrite conflicting files with overwrite option', async () => {
            const storage = new ACStorage(STORAGE_DIR);
            storage.register({
                'config.json': StorageAccess.JSON(),
                'restored': {
                    'config.json': StorageAccess.JSON(),
                },
            });

            const config = await storage.accessAsJSON('config.json');
            config.setOne('version', '1');
            await storage.commit();

            const exportPath = path.join(BACKUP_DIR, 'backup.db');
            await storage.exportTo('config.json', exportPath);

            await storage.releaseAll();

            const restoredConfig = await storage.accessAsJSON('restored:config.json');
            restoredConfig.setOne('version', '2');
            await storage.commit();
            await storage.releaseAll();

            const result = await storage.importFrom(exportPath, 'restored', { onConflict: 'overwrite' });

            expect(result.success).toBe(true);
            expect(result.importedCount).toBe(1);
            expect(result.skippedCount).toBe(0);

            const checkConfig = await storage.accessAsJSON('restored:config.json');
            expect(checkConfig.getOne('version')).toBe('1');
        });

        it('should throw on conflict with error option', async () => {
            const storage = new ACStorage(STORAGE_DIR);
            storage.register({
                'config.json': StorageAccess.JSON(),
                'restored': {
                    'config.json': StorageAccess.JSON(),
                },
            });

            const config = await storage.accessAsJSON('config.json');
            config.setOne('version', '1');
            await storage.commit();

            const exportPath = path.join(BACKUP_DIR, 'backup.db');
            await storage.exportTo('config.json', exportPath);

            const restoredConfig = await storage.accessAsJSON('restored:config.json');
            restoredConfig.setOne('version', '2');
            await storage.commit();

            await expect(
                storage.importFrom(exportPath, 'restored', { onConflict: 'error' })
            ).rejects.toThrow('conflict');
        });
    });

    describe('round-trip', () => {
        it('should preserve data through export and import cycle', async () => {
            const storage = new ACStorage(STORAGE_DIR);
            storage.register({
                'data': {
                    'users.json': StorageAccess.JSON(),
                    'settings.txt': StorageAccess.Text(),
                },
            });

            const users = await storage.accessAsJSON('data:users.json');
            users.setOne('admin', { name: 'Admin', role: 'admin' });
            users.setOne('guest', { name: 'Guest', role: 'guest' });
            
            const settings = await storage.accessAsText('data:settings.txt');
            settings.write('theme=dark\nlang=en');
            
            await storage.commit();

            const exportPath = path.join(BACKUP_DIR, 'full-backup.db');
            await storage.exportTo('data', exportPath);

            await storage.dropAll();

            const storage2Dir = path.join(TEST_DIR, 'storage2');
            fs.mkdirSync(storage2Dir, { recursive: true });
            
            const storage2 = new ACStorage(storage2Dir);
            storage2.register({
                'restored': {
                    'users.json': StorageAccess.JSON(),
                    'settings.txt': StorageAccess.Text(),
                },
            });

            await storage2.importFrom(exportPath, 'restored');

            const restoredUsers = await storage2.accessAsJSON('restored:users.json');
            expect(restoredUsers.getOne('admin')).toEqual({ name: 'Admin', role: 'admin' });
            expect(restoredUsers.getOne('guest')).toEqual({ name: 'Guest', role: 'guest' });
            
            const restoredSettings = await storage2.accessAsText('restored:settings.txt');
            expect(await restoredSettings.read()).toBe('theme=dark\nlang=en');
        });
    });
});
