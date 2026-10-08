import {describe, expect, it} from 'vitest';
import {dbInit} from '../src/init/init';

describe('webhook settings migration', () => {
  it('adds remaining columns when a previous run added only the first one', async () => {
    const added = [];
    const context = {env: {db: {
      async batch() {},
      prepare(sql) {
        return {async run() {
          const name = /ADD COLUMN (webhook_\w+)/.exec(sql)?.[1];
          if (name === 'webhook_url') throw new Error('duplicate column name: webhook_url');
          added.push(name);
        }};
      }
    }}};

    await dbInit.v3_3DB(context);

    expect(added).toEqual(['webhook_status', 'webhook_retry', 'webhook_secret']);
  });

  it('does not report success when the database rejects a new column', async () => {
    const context = {env: {db: {
      async batch() {},
      prepare() { return {async run() { throw new Error('database unavailable'); }}; }
    }}};

    await expect(dbInit.v3_3DB(context)).rejects.toThrow('database unavailable');
  });
});
