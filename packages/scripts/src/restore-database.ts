#!/usr/bin/env node
/**
 * Database Restore Script
 *
 * Restores PostgreSQL database from a backup file.
 *
 * Usage:
 *   npm run restore:db -- backup_file.dump
 *   npx tsx src/restore-database.ts backups/daily_backup_xxx.dump
 *
 * Options:
 *   --list     List available backups
 *   --dry-run  Show what would be restored without actually restoring
 *
 * WARNING: This will overwrite the current database!
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import 'dotenv/config';

const execAsync = promisify(exec);

// Configuration
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
const DATABASE_URL = process.env.DATABASE_URL;

interface BackupFile {
  path: string;
  name: string;
  size: number;
  timestamp: Date;
}

/**
 * List available backups
 */
async function listBackups(): Promise<BackupFile[]> {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles: BackupFile[] = [];

    for (const file of files) {
      if (file.endsWith('.dump') || file.endsWith('.sql') || file.endsWith('.sql.gz')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);

        backupFiles.push({
          path: filePath,
          name: file,
          size: stats.size,
          timestamp: stats.mtime,
        });
      }
    }

    return backupFiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    console.error('Error reading backup directory:', error);
    return [];
  }
}

/**
 * Display available backups
 */
async function showBackupList(): Promise<void> {
  console.log('📦 Available Backups:\n');

  const backups = await listBackups();

  if (backups.length === 0) {
    console.log('   No backups found in:', BACKUP_DIR);
    return;
  }

  console.log('   #  | Name                                   | Size      | Date');
  console.log('   ----|----------------------------------------|-----------|-------------------');

  backups.forEach((backup, index) => {
    const sizeMB = (backup.size / (1024 * 1024)).toFixed(2);
    const date = backup.timestamp.toISOString().split('T')[0];
    const time = backup.timestamp.toTimeString().split(' ')[0];
    console.log(`   ${String(index + 1).padStart(2)} | ${backup.name.padEnd(38)} | ${sizeMB.padStart(7)} MB | ${date} ${time}`);
  });

  console.log('\n   Usage: npm run restore:db -- <backup_name>');
}

/**
 * Confirm destructive operation
 */
async function confirmRestore(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('⚠️  WARNING: This will OVERWRITE the current database!\n   Type "yes" to continue: ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Restore database from backup file
 */
async function restoreDatabase(backupPath: string, dryRun: boolean = false): Promise<void> {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Verify backup file exists
  try {
    await fs.access(backupPath);
  } catch {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  console.log(`🔄 Restoring database from: ${path.basename(backupPath)}`);

  if (dryRun) {
    console.log('   [DRY RUN] Would restore database from this backup');
    return;
  }

  // Confirm before proceeding
  const confirmed = await confirmRestore();
  if (!confirmed) {
    console.log('❌ Restore cancelled');
    return;
  }

  let command: string;

  if (backupPath.endsWith('.dump')) {
    // Custom format backup (pg_restore)
    command = `pg_restore --clean --if-exists --no-owner --no-acl -d "${DATABASE_URL}" "${backupPath}"`;
  } else if (backupPath.endsWith('.sql.gz')) {
    // Compressed SQL backup
    command = `gunzip -c "${backupPath}" | psql "${DATABASE_URL}"`;
  } else {
    // Plain SQL backup
    command = `psql "${DATABASE_URL}" -f "${backupPath}"`;
  }

  console.log('   Restoring...');

  try {
    const { stdout, stderr } = await execAsync(command, { shell: '/bin/bash' });

    if (stderr && !stderr.includes('NOTICE')) {
      console.log('   Warnings:', stderr);
    }

    console.log('✅ Database restored successfully');

    // Verify by counting tables
    console.log('\n   Verifying restore...');
    const verifyCommand = `psql "${DATABASE_URL}" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"`;
    const { stdout: verifyOut } = await execAsync(verifyCommand);
    console.log('   Tables in database:', verifyOut.trim().split('\n').slice(-2, -1)[0]?.trim() || 'unknown');

  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  // Handle --list option
  if (args.includes('--list') || args.includes('-l')) {
    await showBackupList();
    return;
  }

  // Handle --help option
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Database Restore Script');
    console.log('');
    console.log('Usage:');
    console.log('  npm run restore:db -- <backup_file>    Restore from backup');
    console.log('  npm run restore:db -- --list           List available backups');
    console.log('  npm run restore:db -- <file> --dry-run Preview restore');
    console.log('');
    console.log('Options:');
    console.log('  --list, -l     List available backups');
    console.log('  --dry-run      Preview without restoring');
    console.log('  --help, -h     Show this help');
    return;
  }

  // Check for backup file argument
  const dryRun = args.includes('--dry-run');
  const backupArg = args.find((arg) => !arg.startsWith('--'));

  if (!backupArg) {
    console.log('❌ Error: No backup file specified\n');
    await showBackupList();
    process.exit(1);
  }

  // Resolve backup path
  let backupPath = backupArg;
  if (!path.isAbsolute(backupArg)) {
    // Check if it's a number (index from list)
    const index = parseInt(backupArg, 10);
    if (!isNaN(index)) {
      const backups = await listBackups();
      if (index > 0 && index <= backups.length) {
        backupPath = backups[index - 1].path;
      } else {
        console.log(`❌ Invalid backup number: ${index}`);
        process.exit(1);
      }
    } else if (!backupArg.includes('/')) {
      // Just filename, prepend backup directory
      backupPath = path.join(BACKUP_DIR, backupArg);
    }
  }

  try {
    await restoreDatabase(backupPath, dryRun);
  } catch (error) {
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { restoreDatabase, listBackups };
