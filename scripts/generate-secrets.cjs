const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const directory=path.join(__dirname,'../.local');
const file=path.join(directory,'production-secrets.json');
fs.mkdirSync(directory,{recursive:true});
if(fs.existsSync(file)) { console.error('File already exists. Reuse existing secrets; do not reset a deployed administrator.');process.exitCode=1; }
else {
  fs.writeFileSync(file,JSON.stringify({JWT_SECRET:randomBytes(32).toString('hex'),BOOTSTRAP_SECRET:randomBytes(32).toString('hex'),ADMIN_PASSWORD:randomBytes(12).toString('hex')},null,2));
  console.log('Generated deployment secrets in '+file+'. Copy into GitHub Actions Secrets; never commit this file.');
}
