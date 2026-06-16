# Supabase PostgreSQL Backup, Restore, and Verification Manual

This document outlines the backup, restoration, and verification processes for the JabWeMet Supabase PostgreSQL database. It establishes standard operational guidelines and defines a monthly backup restore drill checklist.

---

## 1. Automated Daily Backups (Managed by Supabase)
Supabase automatically takes daily backups of your database:
- **Retention**: 7 days for the Free tier, 30 days for Pro/Enterprise.
- **Location**: Supabase Dashboard -> Project Settings -> Database -> Backups.
- **Process**: Daily snapshots are automated and restorable directly from the dashboard UI to a point-in-time (PITR) if Pro plan is active.

---

## 2. Manual Logical Backups (`pg_dump`)
To take manual logical backups of your schema and data (ideal for version control, local development syncs, or offline archives):

### command:
```bash
pg_dump -h aws-1-ap-south-1.pooler.supabase.com -p 5432 -U postgres.tfhjqoswtyaqsfdfizkb -d postgres -F c -b -v -f "./backups/jabwemet_backup_$(date +%F).dump"
```
*Note: Make sure to replace `postgres.tfhjqoswtyaqsfdfizkb` with your database username if it changes. The command prompts you for your database password.*

---

## 3. Database Restoration Procedure (`pg_restore`)
If Supabase data is deleted or corrupted, follow these steps to restore:

### Step 1: Terminate active connections
Restoring requires exclusive access. Run this query in Supabase SQL editor to terminate other connections:
```sql
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'postgres' AND pid <> pg_backend_pid();
```

### Step 2: Run restoration command
```bash
pg_restore -h aws-1-ap-south-1.pooler.supabase.com -p 5432 -U postgres.tfhjqoswtyaqsfdfizkb -d postgres -v --clean --no-acl --no-owner "./backups/your_backup_file.dump"
```
- `--clean`: Drops database objects before recreating them.
- `--no-acl`: Skip restoration of access privileges.
- `--no-owner`: Skip setting ownership of objects to match original database.

---

## 4. Backup Verification & Monthly Restore Drill Checklist
A backup is only as good as its ability to be restored. Follow this drill **on the 1st of every month** to verify backup integrity.

### Drill Procedure:
1. **Download Backup**: Generate a fresh backup file from production using the `pg_dump` command.
2. **Spin Up Verification Environment**: Use a local Docker container to simulate a clean restore target:
   ```bash
   docker run --name pg-restore-test -e POSTGRES_PASSWORD=restoretest -p 5439:5432 -d postgres:16
   ```
3. **Restore Backup to Verification Target**:
   ```bash
   pg_restore -h localhost -p 5439 -U postgres -d postgres -v --clean --no-acl --no-owner "./backups/jabwemet_backup_latest.dump"
   ```
4. **Run Verification Audits**:
   Execute verification checks to ensure data matches expected state:
   - Verify table counts (e.g. `User`, `Profile`, `Post`, `Comment`, `Reel`).
   - Run local development server pointing to port 5439 to verify schema compatibility.
5. **Teardown Target**:
   ```bash
   docker rm -f pg-restore-test
   ```

### Monthly Restore Verification Checklist:
- [ ] Backup file generated successfully without errors.
- [ ] Local Docker target container is running PostgreSQL version matching production.
- [ ] `pg_restore` completed with exit code 0.
- [ ] Total user records match production counts (`SELECT COUNT(*) FROM "User";`).
- [ ] Post records match production counts (`SELECT COUNT(*) FROM "Post";`).
- [ ] All media file URLs inside `Media` table resolve correctly.
- [ ] Signed uploads parameters generate correctly.
- [ ] Verification environment successfully torn down.
- [ ] Date of drill, database size, and counts recorded in the engineering operations log.
