#!/usr/bin/env node
import 'dotenv/config';
declare function createBackup(): Promise<string>;
declare function applyRetentionPolicy(): Promise<void>;
export { createBackup, applyRetentionPolicy };
//# sourceMappingURL=backup-database.d.ts.map