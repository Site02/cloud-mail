const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');
const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, '../.local/credentials.json'), 'utf8'));
const message = `From: Local Test <sender@example.com>\r\nTo: admin@haoxi1688.com\r\nSubject: Local receipt test\r\nMessage-ID: <${randomUUID()}@example.com>\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n<h2>本地收信测试</h2><p>这封邮件由本机模拟，没有通过公网发送。</p>`;
fetch('http://127.0.0.1:8787/__local/email?from=sender%40example.com&to=admin%40haoxi1688.com', { method: 'POST', body: message, headers: {Authorization: `Bearer ${credentials.bootstrap_secret}`} }).then(async r=>{ if(!r.ok)throw new Error(`${r.status}: ${await r.text()}`); console.log('Local email submitted. Refresh the inbox.'); }).catch(e=>{console.error(e.message);process.exitCode=1;});
