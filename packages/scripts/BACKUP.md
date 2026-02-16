# Database Backup and Restore

This document describes the database backup and restore procedures for FreedomTalk.

## Backup Script

The backup script (`backup-database.ts`) creates compressed PostgreSQL backups using `pg_dump` with custom format.

### Features

- **Compressed backups**: Uses PostgreSQL custom format (`-Fc`) for efficient compression
- **Retention policy**: Automatically maintains 7 daily backups and 4 weekly backups
- **Weekly backups**: Sunday backups are marked as weekly and retained longer
- **Automatic cleanup**: Old backups are automatically deleted based on retention policy

### Configuration

Configure the backup script using environment variables:

```bash
# Backup directory (default: ./backups)
BACKUP_DIR=/path/to/backups

# Database connection string (required)
DATABASE_URL=postgresql://user:password@localhost:5432/freedomtalk
```

### Manual Backup

To create a backup manually:

```bash
cd packages/scripts
npm run backup:db
```

### Automated Backups with Cron

To set up automated daily backups, add a cron job:

```bash
# Edit crontab
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * cd /path/to/freedomtalk/packages/scripts && npm run backup:db >> /var/log/freedomtalk-backup.log 2>&1
```

### Backup File Naming

Backup files are named with the following pattern:

- **Daily backups**: `daily_backup_YYYY-MM-DDTHH-MM-SS-mmmZ.dump`
- **Weekly backups**: `weekly_backup_YYYY-MM-DDTHH-MM-SS-mmmZ.dump`

## Restore Procedures

### Restore from Backup

To restore a database from a backup file:

```bash
# 1. Stop the application
docker-compose stop api

# 2. Drop the existing database (WARNING: This will delete all data!)
psql -h localhost -U postgres -c "DROP DATABASE freedomtalk;"

# 3. Create a new database
psql -h localhost -U postgres -c "CREATE DATABASE freedomtalk;"

# 4. Restore from backup
pg_restore -h localhost -U postgres -d freedomtalk /path/to/backup.dump

# 5. Restart the application
docker-compose start api
```

### Restore Specific Tables

To restore only specific tables:

```bash
# List tables in backup
pg_restore -l /path/to/backup.dump

# Restore specific tables
pg_restore -h localhost -U postgres -d freedomtalk -t users -t user_profiles /path/to/backup.dump
```

### Restore to a Different Database

To restore to a different database (e.g., for testing):

```bash
# Create test database
psql -h localhost -U postgres -c "CREATE DATABASE freedomtalk_test;"

# Restore to test database
pg_restore -h localhost -U postgres -d freedomtalk_test /path/to/backup.dump
```

## Backup Verification

To verify a backup file is valid:

```bash
# List contents of backup
pg_restore -l /path/to/backup.dump

# Check for errors
pg_restore --list /path/to/backup.dump 2>&1 | grep -i error
```

## Backup Storage Recommendations

### Local Development

- Store backups in `./backups` directory (default)
- Ensure backups are excluded from version control (`.gitignore`)

### Production

- Store backups on a separate disk/volume from the database
- Consider off-site backup storage (S3, Google Cloud Storage, etc.)
- Encrypt backups containing sensitive data
- Test restore procedures regularly
- Monitor backup success/failure and set up alerts

### Backup Retention

The script implements the following retention policy:

- **Daily backups**: 7 days (Monday-Saturday backups)
- **Weekly backups**: 4 weeks (Sunday backups)

This provides:
- 7 days of daily restore points
- 4 weeks of weekly restore points
- Total of ~11 restore points at any time

## Troubleshooting

### pg_dump not found

Ensure PostgreSQL client tools are installed:

```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Check installation
pg_dump --version
```

### Permission denied

Ensure the backup directory is writable:

```bash
mkdir -p backups
chmod 755 backups
```

### Database connection failed

Verify the DATABASE_URL is correct and the database is accessible:

```bash
psql "$DATABASE_URL" -c "SELECT version();"
```

## Security Considerations

- **Protect backup files**: Backups contain sensitive data and should be protected
- **Encrypt backups**: Consider encrypting backups at rest
- **Secure credentials**: Never commit DATABASE_URL or backup credentials to version control
- **Access control**: Limit access to backup files to authorized personnel only
- **Audit logs**: Monitor backup and restore operations

