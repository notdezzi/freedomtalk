#!/usr/bin/env node
/**
 * Database Backup Script
 * 
 * Creates compressed PostgreSQL backups using pg_dump with custom format.
 * Implements retention policy: 7 daily backups, 4 weekly backups.
 * 
 * Usage:
 *   npm run backup:db
 *   node dist/backup-database.js
 * 
 * Cron job example (daily at 2 AM):
 *   0 2 * * * cd /path/to/freedomtalk && npm run backup:db >> /var/log/freedomtalk-backup.log 2>&1
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import 'dotenv/config';

const execAsync = promisify(exec);

// Configuration
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
const DATABASE_URL = process.env.DATABASE_URL;
const DAILY_RETENTION = 7; // Keep 7 daily backups
const WEEKLY_RETENTION = 4; // Keep 4 weekly backups

interface BackupFile {
  path: string;
  name: string;
  timestamp: Date;
  isWeekly: boolean;
}

/**
 * Create a database backup using pg_dump
 */
async function createBackup(): Promise<string> {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Ensure backup directory exists
  await fs.mkdir(BACKUP_DIR, { recursive: true });

  // Generate backup filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dayOfWeek = new Date().getDay();
  const isWeekly = dayOfWeek === 0; // Sunday backups are weekly
  const prefix = isWeekly ? 'weekly' : 'daily';
  const filename = `${prefix}_backup_${timestamp}.dump`;
  const backupPath = path.join(BACKUP_DIR, filename);

  console.log(`📦 Creating ${prefix} backup: ${filename}`);

  // Run pg_dump with custom format (-Fc) for compression
  const command = `pg_dump "${DATABASE_URL}" -Fc -f "${backupPath}"`;
  
  try {
    await execAsync(command);
    console.log(`✅ Backup created successfully: ${backupPath}`);
    
    // Get file size
    const stats = await fs.stat(backupPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`   Size: ${sizeMB} MB`);
    
    return backupPath;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

/**
 * Get all backup files from the backup directory
 */
async function getBackupFiles(): Promise<BackupFile[]> {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles: BackupFile[] = [];

    for (const file of files) {
      if (file.endsWith('.dump')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        const isWeekly = file.startsWith('weekly_');
        
        backupFiles.push({
          path: filePath,
          name: file,
          timestamp: stats.mtime,
          isWeekly,
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
 * Apply retention policy to backup files
 */
async function applyRetentionPolicy(): Promise<void> {
  console.log('🧹 Applying retention policy...');
  
  const backupFiles = await getBackupFiles();
  const dailyBackups = backupFiles.filter(f => !f.isWeekly);
  const weeklyBackups = backupFiles.filter(f => f.isWeekly);

  // Remove old daily backups (keep only DAILY_RETENTION)
  const dailyToDelete = dailyBackups.slice(DAILY_RETENTION);
  for (const backup of dailyToDelete) {
    console.log(`   Deleting old daily backup: ${backup.name}`);
    await fs.unlink(backup.path);
  }

  // Remove old weekly backups (keep only WEEKLY_RETENTION)
  const weeklyToDelete = weeklyBackups.slice(WEEKLY_RETENTION);
  for (const backup of weeklyToDelete) {
    console.log(`   Deleting old weekly backup: ${backup.name}`);
    await fs.unlink(backup.path);
  }

  const deletedCount = dailyToDelete.length + weeklyToDelete.length;
  if (deletedCount > 0) {
    console.log(`✅ Deleted ${deletedCount} old backup(s)`);
  } else {
    console.log('✅ No old backups to delete');
  }

  // Show current backup status
  const remainingBackups = await getBackupFiles();
  const remainingDaily = remainingBackups.filter(f => !f.isWeekly).length;
  const remainingWeekly = remainingBackups.filter(f => f.isWeekly).length;
  console.log(`📊 Current backups: ${remainingDaily} daily, ${remainingWeekly} weekly`);
}

/**
 * Main backup function
 */
async function main() {
  console.log('🚀 Starting database backup...');
  console.log(`   Backup directory: ${BACKUP_DIR}`);
  console.log(`   Retention policy: ${DAILY_RETENTION} daily, ${WEEKLY_RETENTION} weekly`);
  console.log('');

  try {
    // Create backup
    await createBackup();
    console.log('');

    // Apply retention policy
    await applyRetentionPolicy();
    console.log('');

    console.log('✅ Backup process completed successfully');
  } catch (error) {
    console.error('❌ Backup process failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { createBackup, applyRetentionPolicy };

