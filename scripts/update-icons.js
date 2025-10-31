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

async function main() {
  console.log('🎨 Updating all app icons from shared logo...\n');

  // Web App PWA Icons
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

  // Desktop App Icon
  console.log('\n🖥️  Updating Desktop app icon...');
  try {
    // Generate multiple sizes for better quality on different DPIs
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

  // Mobile App Icon
  console.log('\n📱 Updating Mobile app icon...');
  try {
    fs.copyFileSync(SHARED_LOGO, 'apps/mobile/src/assets/logo.png');
    console.log('  ✓ Mobile icon updated');
  } catch (error) {
    console.error('  ✗ Failed to update mobile icon:', error.message);
  }

  console.log('\n✅ All icons updated successfully!');
  console.log('\n💡 Remember to commit the updated icons to version control.');
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

