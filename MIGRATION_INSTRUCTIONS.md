# Database Migration Instructions

## Problem
After updating to the new app version, the app cannot read session data because the database schema has changed. The `assessment_notes` table needs two new columns: `duration_minutes` and `is_paid`.

## Solution
Run the standalone migration script to update your database.

## Step-by-Step Instructions

### Option 1: If you have the migration script file

1. **Open Terminal** (Applications → Utilities → Terminal)

2. **Navigate to where the migration script is located**
   ```bash
   cd /path/to/migrate_database.py
   ```
   (Replace `/path/to/` with the actual location where you saved the file)

3. **Run the migration script**
   ```bash
   python3 migrate_database.py
   ```

4. **You should see output like:**
   ```
   ============================================================
   Therapy Session Manager - Database Migration
   ============================================================
   
   📂 Found database at: /Users/[username]/Library/Application Support/therapy-sessions-app/therapy.db
   🔍 Checking if migration is needed...
   🔄 Migrating database...
      Adding duration_minutes column...
      ✅ duration_minutes column added (default: 50 minutes)
      Adding is_paid column...
      ✅ is_paid column added (default: False)
   
   ✅ Migration completed successfully!
   ```

5. **After migration completes**, you can run the app normally and all your data will be accessible.

---

### Option 2: If you need to download/create the script

If you don't have the `migrate_database.py` file, you can create it:

1. **Open Terminal**

2. **Create the script file:**
   ```bash
   nano ~/migrate_database.py
   ```
   (This opens a text editor)

3. **Copy and paste the entire contents of the migration script** (provided separately)

4. **Save and exit:**
   - Press `Ctrl + X`
   - Press `Y` to confirm
   - Press `Enter` to save

5. **Make it executable:**
   ```bash
   chmod +x ~/migrate_database.py
   ```

6. **Run it:**
   ```bash
   python3 ~/migrate_database.py
   ```

---

## Troubleshooting

### "python3: command not found"
- Try `python` instead of `python3`
- Or install Python 3 from python.org

### "Database not found"
- This means you haven't run the app yet, or the database is in a different location
- The database will be created automatically when you first run the app with the new version

### "Permission denied"
- Make sure you have write permissions to the database file
- The database is located at: `~/Library/Application Support/therapy-sessions-app/therapy.db`

### Migration already completed
- If you see "Migration already completed", your database is already up to date
- You can run the app normally

---

## What the Migration Does

The migration script:
1. Checks if your database needs updating
2. Adds `duration_minutes` column to `assessment_notes` (default: 50 minutes)
3. Adds `is_paid` column to `assessment_notes` (default: False)
4. Sets default values for any existing assessment notes
5. **Does NOT delete or modify any existing data** - it only adds new columns

Your existing sessions, clients, and all other data remain intact!

---

## After Migration

Once the migration completes successfully:
1. Close the Terminal
2. Run the Therapy Session Manager app
3. All your data should now be accessible

If you still have issues after running the migration, please share the error message you see.















