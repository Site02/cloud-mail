const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const { spawn } = require('child_process');
const root = path.resolve(__dirname, '..');
const worker = path.join(root, 'mail-worker');
const local = path.join(root, '.local');
fs.mkdirSync(local, { recursive: true });
const credentialsFile = path.join(local, 'credentials.json');
if (!fs.existsSync(credentialsFile)) {
  const data = { admin: 'admin@haoxi1688.com', adminPassword: randomBytes(12).toString('hex'), jwt_secret: randomBytes(32).toString('hex'), bootstrap_secret: randomBytes(32).toString('hex') };
  fs.writeFileSync(credentialsFile, JSON.stringify(data, null, 2));
}
const creds = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
fs.writeFileSync(path.join(worker, '.dev.vars'), `jwt_secret="${creds.jwt_secret}"\nbootstrap_secret="${creds.bootstrap_secret}"\n`);
const wrangler = path.join(worker, 'node_modules/wrangler/bin/wrangler.js');
const child = spawn(process.execPath, [wrangler, 'dev', '--local', '--config', 'wrangler-dev.toml', '--ip', '127.0.0.1', '--port', '8787'], { cwd: worker, stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
let stopped = false;
child.on('exit', code => { stopped = true; process.exitCode = code || 0; });
process.on('SIGINT', () => { stopped = true; child.kill('SIGINT'); });
process.on('SIGTERM', () => { stopped = true; child.kill('SIGTERM'); });
(async()=>{
  for (let i=0;i<90&&!stopped;i++) {
    let bootstrapping = false;
    try {
      const ready = await fetch('http://127.0.0.1:8787/', { signal: AbortSignal.timeout(1500) });
      if (!ready.ok) throw new Error('Not ready');
      bootstrapping = true;
      const response = await fetch('http://127.0.0.1:8787/api/init', { method: 'POST', headers: { Authorization: `Bearer ${creds.bootstrap_secret}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ adminPassword: creds.adminPassword }) });
      if (!response.ok || await response.text() !== 'success') throw new Error('Database bootstrap failed; check Worker log');
      console.log('\nLocal Cloud Mail: http://127.0.0.1:8787');
      console.log(`Login: ${creds.admin}; local password is in ${credentialsFile}`);
      console.log('Keep this terminal open. Ctrl+C stops the local Worker.');
      return;
    } catch(error) {
      if (bootstrapping || i === 89) { console.error(error.message); child.kill(); process.exitCode=1; return; }
      await new Promise(r=>setTimeout(r,1000));
    }
  }
})();
