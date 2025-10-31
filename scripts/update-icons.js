#!/usr/bin/env node

/**
 * Update Icons Script
 * 
 * This script regenerates all app icons from the shared logo.
 * Source: libs/shared/assets/src/images/logo.png
 * 
 * Generates:
 * - Web PWA icons (multiple sizes)
 * - Desktop app icon
 * - Mobile app icon
 */

const { execSync } = require('child_process');
const fs = require('fs');

const SHARED_LOGO = 'libs/shared/assets/src/images/logo.png';

// Check if shared logo exists
if (!fs.existsSync(SHARED_LOGO)) {
  console.error('❌ Error: Shared logo not found at', SHARED_LOGO);
  process.exit(1);
}

function generateWebIcons() {
  console.log('📱 Generating Web PWA icons...');
  const webIcons = [
    { output: 'apps/web/public/logo.png', size: 1000 },
    { output: 'apps/web/public/pwa-192x192.png', size: 192 },
    { output: 'apps/web/public/pwa-512x512.png', size: 512 },
    { output: 'apps/web/public/apple-touch-icon.png', size: 180 },
    { output: 'apps/web/public/favicon-32x32.png', size: 32 },
    { output: 'apps/web/public/favicon-16x16.png', size: 16 },
  ];
  webIcons.forEach(({ output, size }) => {
    try {
      const cmd = `npx sharp-cli -i ${SHARED_LOGO} -o ${output} resize ${size} ${size}`;
      execSync(cmd, { stdio: 'inherit' });
      console.log(`  ✓ Generated ${output} (${size}x${size})`);
    } catch (error) {
      console.error(`  ✗ Failed to generate ${output}:`, error.message);
    }
  });
}

function updateDesktopIcons() {
  console.log('\n🖥️  Updating Desktop app icon...');
  try {
    const desktopSizes = [
      { output: 'apps/desktop/resources/icon.png', size: 512 },
      { output: 'apps/desktop/resources/icon-256.png', size: 256 },
    ];
    desktopSizes.forEach(({ output, size }) => {
      const cmd = `npx sharp-cli -i ${SHARED_LOGO} -o ${output} resize ${size} ${size}`;
      execSync(cmd, { stdio: 'pipe' });
    });
    console.log('  ✓ Desktop icons updated (512px, 256px)');
  } catch (error) {
    console.error('  ✗ Failed to update desktop icon:', error.message);
  }
}

function updateMobileIcon() {
  console.log('\n📱 Updating Mobile app icon...');
  try {
    fs.copyFileSync(SHARED_LOGO, 'apps/mobile/src/assets/logo.png');
    console.log('  ✓ Mobile icon updated');
  } catch (error) {
    console.error('  ✗ Failed to update mobile icon:', error.message);
  }
}

function promptSelection() {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('🎨 Update icons from shared logo');
    console.log('\nSelect target to update:');
    console.log('  1) Web');
    console.log('  2) Desktop');
    console.log('  3) Mobile');
    console.log('  4) All');
    console.log('  5) Exit');
    rl.question('\nEnter choice [1-5]: ', (answer) => {
      rl.close();
      const choice = String(answer || '').trim();
      resolve(choice);
    });
  });
}

async function main() {
  const choice = await promptSelection();
  switch (choice) {
    case '1':
    case 'web':
    case 'Web':
      console.log('\n🎯 Target: Web');
      generateWebIcons();
      break;
    case '2':
    case 'desktop':
    case 'Desktop':
      console.log('\n🎯 Target: Desktop');
      updateDesktopIcons();
      break;
    case '3':
    case 'mobile':
    case 'Mobile':
      console.log('\n🎯 Target: Mobile');
      updateMobileIcon();
      break;
    case '5':
    case 'exit':
    case 'Exit':
      console.log('\n👋 Exiting without changes.');
      return;
    case '4':
    case 'all':
    case 'All':
    default:
      console.log('\n🎯 Target: All');
      generateWebIcons();
      updateDesktopIcons();
      updateMobileIcon();
      break;
  }
  console.log('\n✅ Icon update complete.');
  console.log('\n💡 Remember to commit the updated icons to version control.');
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

