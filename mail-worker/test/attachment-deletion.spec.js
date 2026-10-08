import {DatabaseSync} from 'node:sqlite';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import attService from '../src/service/att-service';
import s3Service from '../src/service/s3-service';
import r2Service from '../src/service/r2-service';
import emailService from '../src/service/email-service';
import roleService from '../src/service/role-service';
import settingService from '../src/service/setting-service';

let database;
let context;
let deletedKeys;

function rows() {
  return database.prepare('SELECT att_id AS id, user_id AS userId, key FROM attachments ORDER BY att_id').all();
}

beforeEach(() => {
  database = new DatabaseSync(':memory:');
  database.exec('CREATE TABLE attachments (att_id INTEGER PRIMARY KEY, user_id INTEGER, email_id INTEGER, account_id INTEGER, key TEXT)');
  deletedKeys = [];
  context = {env: {
    db: {
      prepare(sql) {
        const statement = database.prepare(sql);
        return {
          bind(...values) {
            return {
              sql,
              all: async () => ({results: statement.all(...values)}),
              raw: async () => statement.all(...values).map(Object.values),
              run: async () => {
                statement.run(...values);
                return {success: true};
              }
            };
          }
        };
      },
      async batch(statements) {
        const results = [];
        for (const statement of statements) {
          results.push(statement.sql.trim().startsWith('SELECT') ? await statement.all() : await statement.run());
        }
        return results;
      }
    },
    r2: {
      async delete(keys) {
        deletedKeys.push(...(Array.isArray(keys) ? keys : [keys]));
      }
    }
  }};
  vi.spyOn(settingService, 'query').mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
  database.close();
});

describe('attachment deletion', () => {
  it('reuses only inline images from an active mail owned by the sender', async () => {
    database.exec(`CREATE TABLE email (email_id INTEGER PRIMARY KEY, user_id INTEGER, is_del INTEGER);
      ALTER TABLE attachments ADD COLUMN filename TEXT;
      ALTER TABLE attachments ADD COLUMN mime_type TEXT;
      ALTER TABLE attachments ADD COLUMN size INTEGER;
      ALTER TABLE attachments ADD COLUMN type INTEGER;
      ALTER TABLE attachments ADD COLUMN status TEXT;
      ALTER TABLE attachments ADD COLUMN disposition TEXT;
      ALTER TABLE attachments ADD COLUMN related TEXT;
      ALTER TABLE attachments ADD COLUMN content_id TEXT;
      ALTER TABLE attachments ADD COLUMN encoding TEXT;
      ALTER TABLE attachments ADD COLUMN create_time TEXT;
      INSERT INTO email VALUES (10,7,0),(11,8,0),(12,7,1);
      INSERT INTO attachments(att_id,user_id,email_id,key,type) VALUES
        (1,7,10,'attachments/own',1),(2,8,11,'attachments/other',1),
        (3,7,12,'attachments/deleted',1),(4,7,10,'attachments/download',0);`);
    const keys=['attachments/own','attachments/other','attachments/deleted','attachments/download'];
    const result=await attService.selectOneByKeys(context,keys,7);
    expect(result.map(row=>row.key)).toEqual(['attachments/own']);
    expect(await attService.selectOneByKeys(context,keys,0)).toEqual([]);
  });
  it('assigns distinct object keys and copies an existing inline image before reuse', async () => {
    const first = attService.newKey('same.png');
    const second = attService.newKey('same.png');
    expect(first).not.toBe(second);
    expect(first).toMatch(/^attachments\/[0-9a-f]{32}\.png$/);
    expect(attService.newKey('attachment.pdf/../../secret')).toMatch(/^attachments\/[0-9a-f]{32}$/);

    settingService.query.mockResolvedValue({r2Domain: 'https://storage.example.test'});
    vi.spyOn(attService, 'selectOneByKeys').mockResolvedValue([{
      key: 'attachments/legacy.png', filename: 'legacy.png', size: 3, mimeType: 'image/png'
    }]);
    vi.spyOn(r2Service, 'getObj').mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);

    const result = await attService.toImageUrlHtml(context, '<img src="attachments/legacy.png">');
    expect(result.imageDataList).toHaveLength(1);
    expect(result.imageDataList[0].key).not.toBe('attachments/legacy.png');
    expect(result.imageDataList[0].buff.byteLength).toBe(3);
  });

  it('copies each internal delivery to a separate object and rewrites only inline image links', async () => {
    const source = [{attId: 1, key: 'attachments/source.png', filename: 'source.png', mimeType: 'image/png', type: 1}];
    vi.spyOn(r2Service, 'getObj').mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
    const put = vi.spyOn(r2Service, 'putObj').mockResolvedValue();

    const first = await attService.copyForDelivery(context, source);
    const second = await attService.copyForDelivery(context, source);
    expect(first.copies[0].key).not.toBe(source[0].key);
    expect(second.copies[0].key).not.toBe(first.copies[0].key);
    expect(put).toHaveBeenCalledTimes(2);

    const body = '<p>attachments/source.png</p><img src="{{domain}}attachments/source.png"><img src="https://other.test/image.png">';
    const rewritten = emailService.rewriteInlineImageKeys(body, first.keyMap);
    expect(rewritten).toContain(`src="{{domain}}${first.copies[0].key}"`);
    expect(rewritten).toContain('<p>attachments/source.png</p>');
    expect(rewritten).toContain('src="https://other.test/image.png"');
  });

  it('stores an internal recipient with independent inline and download objects', async () => {
    const deliveryDb = new DatabaseSync(':memory:');
    try {
      deliveryDb.exec(`
        CREATE TABLE account (account_id INTEGER PRIMARY KEY, email TEXT, name TEXT, status INTEGER,
          latest_email_time TEXT, create_time TEXT, user_id INTEGER, all_receive INTEGER, sort INTEGER, is_del INTEGER);
        CREATE TABLE email (email_id INTEGER PRIMARY KEY, send_email TEXT, name TEXT, account_id INTEGER,
          user_id INTEGER, subject TEXT, code TEXT, text TEXT, content TEXT, cc TEXT, bcc TEXT,
          recipient TEXT, to_email TEXT, to_name TEXT, in_reply_to TEXT, relation TEXT, message_id TEXT,
          type INTEGER, status INTEGER, resend_email_id TEXT, message TEXT, unread INTEGER,
          create_time TEXT, is_del INTEGER);
        CREATE TABLE attachments (att_id INTEGER PRIMARY KEY, user_id INTEGER, email_id INTEGER,
          account_id INTEGER, key TEXT, filename TEXT, mime_type TEXT, size INTEGER, status TEXT,
          type INTEGER, disposition TEXT, related TEXT, content_id TEXT, encoding TEXT, create_time TEXT);
        INSERT INTO account (account_id,email,name,user_id,all_receive,sort,is_del,status)
          VALUES (2,'recipient@example.test','Recipient',8,0,0,0,0);
        INSERT INTO email (email_id,send_email,account_id,user_id,content,to_email,to_name,type,status)
          VALUES (100,'sender@example.test',1,7,'<img src="{{domain}}attachments/original.png">',
            'recipient@example.test','Recipient',1,1);
        INSERT INTO attachments (att_id,user_id,email_id,account_id,key,filename,mime_type,size,type)
          VALUES (1,7,100,1,'attachments/original.png','original.png','image/png',3,1),
            (2,7,100,1,'attachments/original.pdf','original.pdf','application/pdf',3,0);
      `);
      const storage = new Map([
        ['attachments/original.png', new Uint8Array([1, 2, 3]).buffer],
        ['attachments/original.pdf', new Uint8Array([4, 5, 6]).buffer],
      ]);
      vi.spyOn(r2Service, 'getObj').mockImplementation(async (_, key) => storage.get(key) || null);
      vi.spyOn(r2Service, 'putObj').mockImplementation(async (_, key, data) => storage.set(key, data));
      vi.spyOn(roleService, 'selectByUserIds').mockResolvedValue([{userId: 8, banEmail: '', availDomain: ''}]);
      settingService.query.mockResolvedValue({noRecipient: 0});
      const deliveryContext = {env: {admin: 'admin@example.test', db: {
        prepare(sql) {
          const statement = deliveryDb.prepare(sql);
          return {bind(...params) { return {
            raw: async () => statement.all(...params).map(Object.values),
            all: async () => ({results: statement.all(...params)}),
            run: async () => ({success: true, ...statement.run(...params)})
          }; }};
        }
      }}};
      const sender = deliveryDb.prepare('SELECT * FROM email WHERE email_id = 100').get();

      await emailService.HandleOnSiteEmail(deliveryContext, ['recipient@example.test'], {
        emailId: sender.email_id, sendEmail: sender.send_email, accountId: sender.account_id,
        userId: sender.user_id, content: sender.content, toEmail: sender.to_email,
        toName: sender.to_name, type: sender.type, status: sender.status
      });

      const recipient = deliveryDb.prepare('SELECT email_id AS id, content FROM email WHERE user_id = 8').get();
      const copied = deliveryDb.prepare('SELECT key, type, user_id AS userId FROM attachments WHERE email_id = ? ORDER BY type').all(recipient.id);
      const inline = copied.find(row => row.type === 1);
      const download = copied.find(row => row.type === 0);
      expect(inline.userId).toBe(8);
      expect(download.userId).toBe(8);
      expect(inline.key).not.toBe('attachments/original.png');
      expect(download.key).not.toBe('attachments/original.pdf');
      expect(recipient.content).toContain(`{{domain}}${inline.key}`);
      expect(storage.has(inline.key)).toBe(true);
      expect(storage.has(download.key)).toBe(true);
      expect(deliveryDb.prepare('SELECT content FROM email WHERE email_id = 100').get().content)
        .toContain('attachments/original.png');
    } finally {
      deliveryDb.close();
    }
  });

  it('retains metadata after storage failure so the same deletion can be retried', async () => {
    database.exec("INSERT INTO attachments VALUES (1, 7, 10, 20, 'attachments/only')");
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const originalDelete = context.env.r2.delete;
    context.env.r2.delete = vi.fn().mockRejectedValueOnce(new Error('storage unavailable')).mockImplementation(originalDelete);

    await expect(attService.removeByUserIds(context, [7])).rejects.toThrow('storage unavailable');
    expect(rows()).toEqual([{id: 1, userId: 7, key: 'attachments/only'}]);

    await attService.removeByUserIds(context, [7]);
    expect(rows()).toEqual([]);
    expect(deletedKeys).toEqual(['attachments/only']);
  });

  it('deletes a key once when all references are selected and keeps a key still referenced elsewhere', async () => {
    database.exec(`INSERT INTO attachments VALUES
      (1, 7, 10, 20, 'attachments/only'),
      (2, 7, 10, 20, 'attachments/selected-shared'),
      (3, 7, 11, 20, 'attachments/selected-shared'),
      (4, 7, 11, 20, 'attachments/survivor-shared'),
      (5, 8, 12, 21, 'attachments/survivor-shared')`);

    await attService.removeByUserIds(context, [7]);

    expect(deletedKeys.sort()).toEqual(['attachments/only', 'attachments/selected-shared']);
    expect(rows()).toEqual([{id: 5, userId: 8, key: 'attachments/survivor-shared'}]);
  });

  it('treats references held by every selected user as one deletion set', async () => {
    database.exec(`INSERT INTO attachments VALUES
      (1, 7, 10, 20, 'attachments/two-users'),
      (2, 8, 12, 21, 'attachments/two-users')`);

    await attService.removeByUserIds(context, [7, 8]);

    expect(deletedKeys).toEqual(['attachments/two-users']);
    expect(rows()).toEqual([]);
  });

  it('retains metadata after a database deletion failure for a safe retry', async () => {
    database.exec("INSERT INTO attachments VALUES (1, 7, 10, 20, 'attachments/only')");
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const originalPrepare = context.env.db.prepare;
    let fail = true;
    context.env.db.prepare = (sql) => {
      const prepared = originalPrepare(sql);
      if (!sql.startsWith('DELETE FROM attachments')) return prepared;
      return {
        bind(...values) {
          const bound = prepared.bind(...values);
          return {sql, run: async () => {
            if (fail) {
              fail = false;
              throw new Error('database unavailable');
            }
            return bound.run();
          }};
        }
      };
    };

    await expect(attService.removeByUserIds(context, [7])).rejects.toThrow('database unavailable');
    expect(rows()).toEqual([{id: 1, userId: 7, key: 'attachments/only'}]);
    await attService.removeByUserIds(context, [7]);
    expect(rows()).toEqual([]);
    expect(deletedKeys).toEqual(['attachments/only', 'attachments/only']);
  });

  it('keeps metadata when KV object removal fails', async () => {
    database.exec("INSERT INTO attachments VALUES (1, 7, 10, 20, 'attachments/only')");
    vi.spyOn(console, 'error').mockImplementation(() => {});
    delete context.env.r2;
    context.env.kv = {delete: async () => { throw new Error('KV unavailable'); }};

    await expect(attService.removeByUserIds(context, [7])).rejects.toThrow('KV unavailable');
    expect(rows()).toEqual([{id: 1, userId: 7, key: 'attachments/only'}]);
  });

  it('keeps metadata when S3 reports a per-object failure', async () => {
    database.exec("INSERT INTO attachments VALUES (1, 7, 10, 20, 'attachments/only')");
    vi.spyOn(console, 'error').mockImplementation(() => {});
    delete context.env.r2;
    settingService.query.mockResolvedValue({
      bucket: 'mail', endpoint: 'https://storage.example.test',
      s3AccessKey: 'access', s3SecretKey: 'secret'
    });
    vi.spyOn(s3Service, 'client').mockResolvedValue({
      middlewareStack: {add() {}},
      send: async () => ({Errors: [{Key: 'attachments/only', Code: 'AccessDenied'}]})
    });

    await expect(attService.removeByUserIds(context, [7])).rejects.toThrow(/AccessDenied/);
    expect(rows()).toEqual([{id: 1, userId: 7, key: 'attachments/only'}]);
  });
});

describe('S3 multi-object deletion', () => {
  it('rejects an HTTP success response containing per-object errors', async () => {
    vi.spyOn(settingService, 'query').mockResolvedValue({bucket: 'mail'});
    vi.spyOn(s3Service, 'client').mockResolvedValue({
      middlewareStack: {add() {}},
      send: async () => ({
        Deleted: [{Key: 'attachments/good'}],
        Errors: [{Key: 'attachments/bad', Code: 'AccessDenied', Message: 'Access Denied'}]
      })
    });

    await expect(s3Service.deleteObj(context, ['attachments/good', 'attachments/bad']))
      .rejects.toThrow(/AccessDenied/);
  });

  it('does not accept a partial success response with no result for one requested object', async () => {
    vi.spyOn(settingService, 'query').mockResolvedValue({bucket: 'mail'});
    vi.spyOn(s3Service, 'client').mockResolvedValue({
      middlewareStack: {add() {}},
      send: async () => ({Deleted: [{Key: 'attachments/good'}], Errors: []})
    });

    await expect(s3Service.deleteObj(context, ['attachments/good', 'attachments/missing']))
      .rejects.toThrow(/attachments\/missing/);
  });
});
