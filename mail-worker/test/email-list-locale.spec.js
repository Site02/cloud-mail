import {describe, expect, it} from 'vitest';
import emailService from '../src/service/email-service';

describe('mailbox list errors', () => {
  it('uses the request language when the mailbox ID is invalid', async () => {
    const context = {req: {header: () => 'ar'}};
    await expect(emailService.list(context, {accountId: 'invalid'}, 1))
      .rejects.toThrow('معرّف صندوق البريد مطلوب.');
  });
});
