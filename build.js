const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Clean dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

// Run TypeScript compilation
console.log('Compiling TypeScript...');
execSync('npx tsc', { stdio: 'inherit' });

// Copy package.json to dist
console.log('Copying package.json...');
fs.copyFileSync('package.json', 'dist/package.json');

// Copy .env to dist if it exists
if (fs.existsSync('.env')) {
  console.log('Copying .env...');
  fs.copyFileSync('.env', 'dist/.env');
}

console.log('Build completed successfully!'); 