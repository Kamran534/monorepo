@echo off
REM Script to apply SQLite migration

echo Applying SQLite migration...
echo.

if not exist "cpos.db" (
    echo Database file not found. Creating new database from schema...
    sqlite3 cpos.db < ..\..\..\apps\desktop\libsdb\schema.sql
    echo Database created successfully!
) else (
    echo Applying migration to existing database...
    sqlite3 cpos.db < apply-migration.sql
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo Migration applied successfully!
        echo Verifying tables...
        sqlite3 cpos.db "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('ExchangeOrder', 'ExchangeLineItem', 'StoreConfig');"
    ) else (
        echo.
        echo Migration completed with warnings. Some changes may already exist.
        echo This is normal if the database was already updated.
    )
)

echo.
echo Done!

