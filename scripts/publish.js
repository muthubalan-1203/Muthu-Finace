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

console.log('Pushing to GitHub...');
try {
  execSync('git add public/version.json dist.zip', { stdio: 'inherit' });
  execSync(`git commit -m "OTA Update v${verData.version}"`, { stdio: 'inherit' });
  execSync('git push', { stdio: 'inherit' });
  console.log('✅ Successfully published OTA update to GitHub!');
} catch (e) {
  console.error('Failed to push to GitHub. Make sure you have initialized a git repository and set an origin.', e.message);
}
