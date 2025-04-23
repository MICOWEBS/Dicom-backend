const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Clean dist directory
console.log('Cleaning dist directory...');
if (fs.existsSync('dist')) {
  const files = fs.readdirSync('dist');
  for (const file of files) {
    fs.unlinkSync(path.join('dist', file));
  }
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

// Copy views directory if it exists
if (fs.existsSync('src/views')) {
  console.log('Copying views directory...');
  fs.mkdirSync('dist/views', { recursive: true });
  const views = fs.readdirSync('src/views');
  for (const view of views) {
    fs.copyFileSync(
      path.join('src/views', view),
      path.join('dist/views', view)
    );
  }
}

console.log('Build completed successfully!'); 