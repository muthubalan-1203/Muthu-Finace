import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';

const versionFile = path.resolve('public', 'version.json');
let verData = { version: 1 };
if (fs.existsSync(versionFile)) {
  verData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
}
verData.version += 1;
fs.writeFileSync(versionFile, JSON.stringify(verData, null, 2));
console.log('Bumped version to', verData.version);

console.log('Building app...');
execSync('npm run build', { stdio: 'inherit' });

console.log('Zipping dist...');
const zip = new AdmZip();
zip.addLocalFolder(path.resolve('dist'));
zip.writeZip(path.resolve('dist.zip'));

// Move the zip into dist so Firebase hosts it
fs.renameSync(path.resolve('dist.zip'), path.resolve('dist', 'dist.zip'));

console.log('Deploying to Firebase Hosting for instant OTA...');
try {
  execSync('npx firebase deploy --only hosting', { stdio: 'inherit' });
  console.log('✅ Successfully published OTA update to Firebase!');
} catch (e) {
  console.error('Failed to deploy to Firebase.', e.message);
}

console.log('Backing up source code to GitHub...');
try {
  execSync('git add .', { stdio: 'inherit' });
  execSync(`git commit -m "OTA Update v${verData.version}"`, { stdio: 'inherit' });
  execSync('git push', { stdio: 'inherit' });
  console.log('✅ Backed up to GitHub.');
} catch (e) {
  console.log('GitHub push skipped or failed (this is normal if Git is not setup in terminal).');
}
