import { DatabaseSync } from 'node:sqlite';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import app from '../src/hono/hono';
import '../src/api/open-api';
import '../src/api/media-api';
import '../src/api/r2-api';
import '../src/api/telegram-api';
import mediaService from '../src/service/media-service';

let storedObject;
vi.mock('../src/service/r2-service', () => ({
  default: { getObj: async () => storedObject() }
}));

let database;
let context;
let values;

beforeEach(async () => {
  database = new DatabaseSync(':memory:');
  database.exec(`
    CREATE TABLE email (email_id INTEGER PRIMARY KEY, to_email TEXT, send_email TEXT,
      name TEXT, subject TEXT, code TEXT, content TEXT, text TEXT,
      recipient TEXT, status INTEGER, message TEXT,
      create_time TEXT, type INTEGER, is_del INTEGER);
    CREATE TABLE attachments (att_id INTEGER PRIMARY KEY, email_id INTEGER, filename TEXT,
      mime_type TEXT, size INTEGER, key TEXT, type INTEGER, content_id TEXT);
    CREATE TABLE account (email TEXT);
    INSERT INTO email VALUES
      (1, 'right@example.com', 'sender@example.net', 'Sender', 'Files', '', '<p>Hi</p>', 'Hi', '[{"address":"right@example.com"}]', 3, '{"message":"Delivery failed"}', datetime('now', '-1 minute'), 0, 0),
      (2, 'right@example.com', 'sender@example.net', 'Sender', 'Old', '', '<p>Old</p>', 'Old', '[]', 0, NULL, datetime('now', '-11 minutes'), 0, 0),
      (3, 'other@example.com', 'sender@example.net', 'Sender', 'Other', '', '<p>Other</p>', 'Other', '[]', 0, NULL, datetime('now', '-1 minute'), 0, 0);
    INSERT INTO attachments VALUES
      (10, 1, 'photo.png', 'image/png', 4, 'attachments/photo', 0, NULL),
      (11, 1, 'hidden.png', 'image/png', 4, 'attachments/hidden', 1, 'cid-1'),
      (12, 2, 'old.png', 'image/png', 4, 'attachments/old', 0, NULL),
      (13, 3, 'other.png', 'image/png', 4, 'attachments/other', 0, NULL),
      (14, 1, 'page.html', 'text/html', 4, 'attachments/page', 0, NULL),
      (15, 1, '账单.pdf', 'application/pdf', 4, 'attachments/bill', 0, NULL),
      (16, 1, 'inline.png', 'image/png', 4, 'attachments/inline', 0, 'cid-2');
    ALTER TABLE email ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE email ADD COLUMN account_id INTEGER NOT NULL DEFAULT 0;
    CREATE INDEX idx_email_to_email_nocase ON email(to_email COLLATE NOCASE);
  `);
  values = new Map();
  context = { domain: ['example.com'], kv: {
    async get(key, options) {
      const value = values.get(key) ?? null;
      return options?.type === 'json' && value ? JSON.parse(value) : value;
    },
    async put(key, value) { values.set(key, value); }
  }, db: {
    prepare(sql) {
      const statement = database.prepare(sql);
      return {
        bind(...values) {
          return {
            first: async () => statement.get(...values),
            all: async () => ({ results: statement.all(...values) })
          };
        }
      };
    }
  } };
  storedObject = () => new Response(new Uint8Array([1, 2, 3, 4]), {
    headers: { 'Content-Type': 'image/png' }
  });
});

afterEach(() => database.close());

function request(path) {
  return app.request(`http://localhost${path}`, {}, context);
}

describe('public attachments', () => {
  it('uses the address index for public mailbox pages', () => {
    const plan = database.prepare(`EXPLAIN QUERY PLAN SELECT email_id FROM email INDEXED BY idx_email_to_email_nocase
      WHERE to_email COLLATE NOCASE = ? AND type = 0 AND is_del = 0
        AND user_id = 0 AND account_id = 0 AND email_id < ?
      ORDER BY email_id DESC LIMIT 20`).all('right@example.com', Number.MAX_SAFE_INTEGER);
    expect(plan.some(step => step.detail.startsWith('SEARCH email USING INDEX idx_email_to_email_nocase'))).toBe(true);
  });

  it('continues serving public pages before the index migration runs', async () => {
    database.exec('DROP INDEX idx_email_to_email_nocase');
    const response = await request('/open/recentMails?address=right@example.com');
    expect((await response.json()).data.map(row => row.emailId)).toEqual([2, 1]);
  });

  it('issues a random public inbox address', async () => {
    const response = await app.request('http://localhost/open/inbox', {method: 'POST'}, context);
    const { data } = await response.json();
    expect(data.address).toMatch(/^t[a-f0-9]{20}@example\.com$/);
    expect(data).toEqual({address: data.address});
  });

  it('allows address-only access to unclaimed mail regardless of age', async () => {
    const response = await request('/open/recentMails?address=right@example.com');
    const {data} = await response.json();
    expect(data.map(row => row.emailId)).toEqual([2, 1]);
    const detail = await request('/open/mailContent?emailId=2&address=right@example.com');
    expect((await detail.json()).data.subject).toBe('Old');
    const attachment = await request('/open/attachment?emailId=2&address=right@example.com&attId=12');
    expect(attachment.status).toBe(200);
  });

  it('pages older mail without exposing other addresses', async () => {
    for (let id = 4; id <= 25; id++) {
      database.prepare(`INSERT INTO email (email_id,to_email,create_time,type,is_del,user_id,account_id)
        VALUES (?, 'right@example.com', datetime('now', '-30 days'), 0, 0, 0, 0)`).run(id);
    }
    const first = (await (await request('/open/recentMails?address=right@example.com')).json()).data;
    expect(first).toHaveLength(20);
    expect(first[0].emailId).toBe(25);
    const second = (await (await request(`/open/recentMails?address=right@example.com&before=${first.at(-1).emailId}`)).json()).data;
    expect(second.map(row => row.emailId)).toEqual([5, 4, 2, 1]);
    const badCursor = await request('/open/recentMails?address=right@example.com&before=1%20OR%201=1');
    expect((await badCursor.json()).code).not.toBe(200);
  });

  it('blocks a registered mailbox and its plus-address aliases', async () => {
    database.exec("INSERT INTO account(email) VALUES ('right@example.com')");
    const response = await request('/open/recentMails?address=right@example.com');
    expect((await response.json()).code).toBe(403);
    const attachment = await request('/open/attachment?emailId=1&address=right@example.com&attId=10');
    expect(attachment.status).toBe(404);
    const alias = await request('/open/recentMails?address=right%2Btag@example.com');
    expect((await alias.json()).code).toBe(403);
  });

  it('never exposes mail already assigned to a user, even if the account row is missing', async () => {
    database.exec('UPDATE email SET user_id = 8, account_id = 9 WHERE email_id = 1');
    const list = await request('/open/recentMails?address=right@example.com');
    expect((await list.json()).data.map(row => row.emailId)).toEqual([2]);
    const detail = await request('/open/mailContent?emailId=1&address=right@example.com');
    expect((await detail.json()).code).not.toBe(200);
    const attachment = await request('/open/attachment?emailId=1&address=right@example.com&attId=10');
    expect(attachment.status).toBe(404);
  });

  it('returns the normal message detail fields for an active public message', async () => {
    const response = await request('/open/mailContent?emailId=1&address=right@example.com');
    const { data } = await response.json();
    expect(data).toMatchObject({
      sendEmail: 'sender@example.net',
      sendName: 'Sender',
      subject: 'Files',
      content: '<p>Hi</p>',
      text: 'Hi',
      recipient: '[{"address":"right@example.com"}]',
      toEmail: 'right@example.com',
      status: 3,
      message: '{"message":"Delivery failed"}'
    });
    expect(data.createTime).toMatch(/^\d{4}-\d\d-\d\d /);
  });

  it('matches the normal message attachment list without exposing storage keys', async () => {
    const response = await request('/open/mailContent?emailId=1&address=right@example.com');
    const payload = await response.json();
    expect(payload.code).toBe(200);
    expect(payload.data.attList).toEqual([
      { attId: 10, filename: 'photo.png', mimeType: 'image/png', size: 4 },
      { attId: 14, filename: 'page.html', mimeType: 'text/html', size: 4 },
      { attId: 15, filename: '账单.pdf', mimeType: 'application/pdf', size: 4 }
    ]);
  });

  it('opens a current attachment and downloads the same bytes on request', async () => {
    const path = '/open/attachment?emailId=1&address=right@example.com&attId=10';
    const preview = await request(path);
    expect(preview.status).toBe(200);
    expect(preview.headers.get('Content-Type')).toBe('image/png');
    expect(preview.headers.get('Content-Disposition')).toContain('inline');
    expect(new Uint8Array(await preview.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));

    const download = await request(`${path}&download=1`);
    expect(download.headers.get('Content-Disposition')).toContain('attachment');
    expect(new Uint8Array(await download.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it.each([
    ['wrong address', 'emailId=1&address=other@example.com&attId=10'],
    ['another email attachment', 'emailId=1&address=right@example.com&attId=13'],
    ['embedded image', 'emailId=1&address=right@example.com&attId=11']
  ])('rejects %s', async (_, query) => {
    const response = await request(`/open/attachment?${query}`);
    expect(response.status).not.toBe(200);
    expect(await response.text()).not.toContain('attachments/');
  });

  it('forces active HTML files to download even when preview was requested', async () => {
    const response = await request('/open/attachment?emailId=1&address=right@example.com&attId=14');
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('serves a Chinese filename in a valid download header', async () => {
    const response = await request('/open/attachment?emailId=1&address=right@example.com&attId=15&download=1');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toContain("filename*=UTF-8''%E8%B4%A6%E5%8D%95.pdf");
  });

  it('does not expose a content-id attachment through the regular attachment endpoint', async () => {
    const response = await request('/open/attachment?emailId=1&address=right@example.com&attId=16');
    expect(response.status).toBe(404);
  });

  it('grants an inline image only while its message remains public', async () => {
    const detail = await request('/open/mailContent?emailId=1&address=right@example.com');
    const { data } = await detail.json();
    const url = data.inlineMedia['attachments/hidden'];
    expect(url).toMatch(/^\/api\/media\/[A-Za-z0-9_-]{43}$/);
    const image = await request(url.replace('/api', ''));
    expect(image.status).toBe(200);
    database.exec("INSERT INTO account(email) VALUES ('right@example.com')");
    const afterClaim = await request(url.replace('/api', ''));
    expect(afterClaim.status).toBe(404);
  });

  it('revokes a public inline image when the email is assigned to a user', async () => {
    const detail = await request('/open/mailContent?emailId=1&address=right@example.com');
    const {data} = await detail.json();
    const url = data.inlineMedia['attachments/hidden'];
    database.exec('UPDATE email SET user_id = 8, account_id = 9 WHERE email_id = 1');
    expect((await request(url.replace('/api', ''))).status).toBe(404);
  });

  it('serves old inline media and revokes it when the email is deleted', async () => {
    database.exec("INSERT INTO attachments VALUES (17, 2, 'old-inline.png', 'image/png', 4, 'attachments/old-inline', 1, 'cid-old')");
    const detail = await request('/open/mailContent?emailId=2&address=right@example.com');
    const {data} = await detail.json();
    const path = data.inlineMedia['attachments/old-inline'].replace('/api', '');
    expect((await request(path)).status).toBe(200);
    database.exec('UPDATE email SET is_del = 1 WHERE email_id = 2');
    expect((await request(path)).status).toBe(404);
  });

  it('does not expose attachment storage keys or accept old message links', async () => {
    expect((await request('/oss/attachments/photo')).status).toBe(404);
    const legacyLink = await request('/telegram/getEmail/eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbElkIjoxfQ.signature');
    expect(await legacyLink.text()).toContain('Access denied');
  });

  it('localizes public attachment and message-view errors by language and script', async () => {
    const attachment = await app.request(
      'http://localhost/open/attachment?emailId=2&address=right@example.com&attId=999',
      {headers: {'Accept-Language': 'zh-HK'}}, context
    );
    expect(attachment.status).toBe(404);
    expect(await attachment.text()).toBe('附件不存在或已過期');
    expect(attachment.headers.get('Cache-Control')).toBe('no-store');

    const messageView = await app.request('http://localhost/telegram/getEmail/invalid',
      {headers: {'Accept-Language': 'ar-EG'}}, context);
    const page = await messageView.text();
    expect(page).toContain("<html lang='ar-SA' dir='rtl'>");
    expect(page).toContain('تم رفض الوصول');
    expect(messageView.headers.get('Cache-Control')).toContain('no-store');
  });

  it('binds private attachment bytes to the signed-in owner', async () => {
    database.exec('UPDATE email SET user_id = 8 WHERE email_id = 1');
    await expect(mediaService.privateAttachment({env: context}, {emailId: 1, attId: 10}, 9)).rejects.toThrow();
    const response = await mediaService.privateAttachment({env: context}, {emailId: 1, attId: 10}, 8);
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('lets the all-mail viewer load another account’s inline image, including deleted mail', async () => {
    database.exec('UPDATE email SET user_id = 8, is_del = 1 WHERE email_id = 1');
    await expect(mediaService.privateInlineMap({env: context}, 1, 9)).rejects.toThrow();

    const map = await mediaService.adminInlineMap({env: context}, 1);
    const url = map['attachments/hidden'];
    expect(url).toMatch(/^\/api\/media\/[A-Za-z0-9_-]{43}$/);
    const response = await mediaService.get({env: context}, url.split('/').pop());
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('uses all-mail access for a deleted mail attachment without granting personal cross-account access', async () => {
    database.exec('UPDATE email SET user_id = 8, is_del = 1 WHERE email_id = 1');
    await expect(mediaService.privateAttachment({env: context}, {emailId: 1, attId: 10}, 9)).rejects.toThrow();
    const response = await mediaService.adminAttachment({env: context}, {emailId: 1, attId: 10});
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
    await expect(mediaService.adminAttachment({env: context}, {emailId: 1, attId: 13})).rejects.toThrow();
    await expect(mediaService.adminAttachment({env: context}, {emailId: 1, attId: 11})).rejects.toThrow();
  });
});
