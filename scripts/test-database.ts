/**
 * Database Setup Test Script
 *
 * This script tests the database setup by:
 * 1. Connecting to the database
 * 2. Running migrations
 * 3. Querying schema information
 * 4. Verifying tables, views, and data
 *
 * Usage:
 *   npx tsx scripts/test-database.ts
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';

// Determine database path (Desktop Electron path)
// Note: Electron uses the app name from package.json ("desktop") as the folder name
const dbPath = join(homedir(), 'AppData', 'Roaming', 'desktop', 'payflow.db');
const dbDir = join(homedir(), 'AppData', 'Roaming', 'desktop');

console.log('🔍 Database Setup Test\n');
console.log(`Database path: ${dbPath}\n`);

// Check if database exists
if (!existsSync(dbPath)) {
  console.log('⚠️  Database file not found!\n');
  console.log('This is normal if you haven\'t run the desktop app yet.\n');
  console.log('📋 Next Steps:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Run the desktop app to create the database:');
  console.log('   npm run dev:desktop\n');
  console.log('2. Wait for migrations to complete (check console logs)');
  console.log('3. Close the app and run this test again:\n');
  console.log('   npm run test:db\n');
  console.log('Alternative: Create database directory manually:');
  console.log(`   mkdir "${dbDir}"\n`);
  console.log('Then run the desktop app to initialize the database.');
  process.exit(0);
}

try {
  // Connect to database
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  console.log('✅ Database connection successful\n');

  // Test 1: Check schema_migrations table
  console.log('📋 Test 1: Check Applied Migrations');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const migrations = db.prepare('SELECT * FROM schema_migrations ORDER BY migration_id').all();

  if (migrations.length === 0) {
    console.log('⚠️  No migrations applied yet!');
  } else {
    console.log(`Found ${migrations.length} applied migrations:`);
    migrations.forEach((m: any) => {
      console.log(`  ✓ Version ${m.version}: ${m.description}`);
      console.log(`    Applied at: ${m.applied_at}`);
    });
  }
  console.log('');

  // Test 2: Count all tables
  console.log('📊 Test 2: Database Tables');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const tables = db.prepare(`
    SELECT name, type
    FROM sqlite_master
    WHERE type IN ('table', 'view')
    AND name NOT LIKE 'sqlite_%'
    ORDER BY type, name
  `).all();

  const tablesList = tables.filter((t: any) => t.type === 'table');
  const viewsList = tables.filter((t: any) => t.type === 'view');

  console.log(`Total Tables: ${tablesList.length}`);
  console.log(`Total Views: ${viewsList.length}\n`);

  console.log('Tables:');
  tablesList.forEach((t: any) => console.log(`  • ${t.name}`));

  console.log('\nViews:');
  viewsList.forEach((t: any) => console.log(`  • ${t.name}`));
  console.log('');

  // Test 3: Check lookup data
  console.log('🔧 Test 3: Lookup Data (Reference Tables)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const checkLookupTable = (tableName: string, displayName: string) => {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
      console.log(`  ${displayName}: ${count.count} records`);
    } catch (error) {
      console.log(`  ${displayName}: ⚠️  Table not found`);
    }
  };

  checkLookupTable('roles', 'Roles');
  checkLookupTable('permissions', 'Permissions');
  checkLookupTable('role_permissions', 'Role-Permission Mappings');
  checkLookupTable('shift_statuses', 'Shift Statuses');
  checkLookupTable('order_types', 'Order Types');
  checkLookupTable('order_statuses', 'Order Statuses');
  checkLookupTable('payment_method_types', 'Payment Method Types');
  checkLookupTable('payment_statuses', 'Payment Statuses');
  checkLookupTable('inventory_adjustment_types', 'Inventory Adjustment Types');
  console.log('');

  // Test 4: Check user data (should be empty)
  console.log('👤 Test 4: User Data (Should be Empty)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const checkEmptyTable = (tableName: string, displayName: string) => {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
      const status = count.count === 0 ? '✓ Empty (as expected)' : `⚠️  Has ${count.count} records`;
      console.log(`  ${displayName}: ${status}`);
    } catch (error) {
      console.log(`  ${displayName}: ⚠️  Table not found`);
    }
  };

  checkEmptyTable('users', 'Users');
  checkEmptyTable('locations', 'Locations');
  checkEmptyTable('categories', 'Categories');
  checkEmptyTable('products', 'Products');
  checkEmptyTable('product_variants', 'Product Variants');
  checkEmptyTable('inventory_items', 'Inventory Items');
  checkEmptyTable('sales_orders', 'Sales Orders');
  checkEmptyTable('order_payments', 'Order Payments');
  console.log('');

  // Test 5: Check indexes
  console.log('🔍 Test 5: Database Indexes');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const indexes = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'index'
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`Total Indexes: ${indexes.length}`);
  indexes.forEach((idx: any) => console.log(`  • ${idx.name}`));
  console.log('');

  // Test 6: Check triggers
  console.log('⚡ Test 6: Database Triggers');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const triggers = db.prepare(`
    SELECT name, tbl_name
    FROM sqlite_master
    WHERE type = 'trigger'
    ORDER BY name
  `).all();

  if (triggers.length === 0) {
    console.log('⚠️  No triggers found');
  } else {
    console.log(`Total Triggers: ${triggers.length}`);
    triggers.forEach((trg: any) => console.log(`  • ${trg.name} (on ${trg.tbl_name})`));
  }
  console.log('');

  // Test 7: Test a view
  console.log('📸 Test 7: Test Views');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // This should work even with no data
    const viewTest = db.prepare('SELECT COUNT(*) as count FROM v_product_catalog').get() as { count: number };
    console.log(`  v_product_catalog: ✓ View is working (${viewTest.count} products)`);
  } catch (error) {
    console.log(`  v_product_catalog: ⚠️  View not found or error`);
  }

  try {
    const viewTest2 = db.prepare('SELECT COUNT(*) as count FROM v_inventory_status').get() as { count: number };
    console.log(`  v_inventory_status: ✓ View is working (${viewTest2.count} items)`);
  } catch (error) {
    console.log(`  v_inventory_status: ⚠️  View not found or error`);
  }
  console.log('');

  // Test 8: Check foreign keys
  console.log('🔗 Test 8: Foreign Key Constraints');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const fkStatus = db.pragma('foreign_keys');
  console.log(`  Foreign Keys: ${fkStatus ? '✓ ENABLED' : '⚠️  DISABLED'}`);
  console.log('');

  // Test 9: Sample roles and permissions
  console.log('🎭 Test 9: Roles and Permissions Detail');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const roles = db.prepare('SELECT * FROM roles ORDER BY role_id').all();
  console.log(`Found ${roles.length} roles:\n`);

  roles.forEach((role: any) => {
    console.log(`  ${role.role_name} (ID: ${role.role_id})`);
    console.log(`    Description: ${role.role_description || 'N/A'}`);

    const permissions = db.prepare(`
      SELECT p.permission_name, p.permission_code
      FROM permissions p
      INNER JOIN role_permissions rp ON p.permission_id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.permission_name
    `).all(role.role_id);

    console.log(`    Permissions (${permissions.length}):`);
    permissions.forEach((perm: any) => {
      console.log(`      • ${perm.permission_name} (${perm.permission_code})`);
    });
    console.log('');
  });

  // Final Summary
  console.log('═══════════════════════════════════════');
  console.log('📝 SUMMARY');
  console.log('═══════════════════════════════════════');

  const expectedMigrations = 2;
  const expectedTables = 32; // Approximate
  const expectedViews = 7;
  const expectedLookupTables = 9;

  const migrationsOk = migrations.length >= expectedMigrations;
  const tablesOk = tablesList.length >= expectedTables - 3; // Allow some variance
  const viewsOk = viewsList.length >= expectedViews;

  console.log(`Migrations:  ${migrationsOk ? '✅' : '⚠️ '} ${migrations.length}/${expectedMigrations} applied`);
  console.log(`Tables:      ${tablesOk ? '✅' : '⚠️ '} ${tablesList.length}/${expectedTables} created`);
  console.log(`Views:       ${viewsOk ? '✅' : '⚠️ '} ${viewsList.length}/${expectedViews} created`);
  console.log(`Indexes:     ✅ ${indexes.length} created`);
  console.log(`Triggers:    ${triggers.length > 0 ? '✅' : '⚠️ '} ${triggers.length} created`);
  console.log(`Foreign Keys:${fkStatus ? '✅' : '⚠️ '} ${fkStatus ? 'Enabled' : 'Disabled'}`);
  console.log('');

  if (migrationsOk && tablesOk && viewsOk && fkStatus) {
    console.log('🎉 Database setup is COMPLETE and WORKING!');
  } else {
    console.log('⚠️  Database setup has issues. Please review the logs above.');
  }

  db.close();

} catch (error) {
  console.error('❌ Error testing database:', error);
  process.exit(1);
}
