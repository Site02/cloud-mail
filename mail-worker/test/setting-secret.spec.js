import {afterEach, describe, expect, it, vi} from 'vitest';
import settingService from '../src/service/setting-service';
import verifyRecordService from '../src/service/verify-record-service';
import r2Service from '../src/service/r2-service';
import userContext from '../src/security/user-context';

afterEach(() => vi.restoreAllMocks());

describe('settings response', () => {
  it('publishes the current account deletion mode without private settings', async () => {
    vi.spyOn(settingService, 'get').mockResolvedValue({
      syncDelete: 1,
      loginDomain: 0,
      domainList: ['@example.test'],
      webhookSecret: 'private-signing-key'
    });
    vi.spyOn(userContext, 'getToken').mockResolvedValue(null);

    const response = await settingService.websiteConfig({req: {}});

    expect(response.syncDelete).toBe(1);
    expect(response).not.toHaveProperty('webhookSecret');
  });

  it('reports a configured webhook without exposing its secret or changing the internal settings', async () => {
    const internal = {
      webhookSecret: 'private-signing-key',
      resendTokens: {example: 'private-resend-token'},
      siteKey: 'public-site-key',
      secretKey: 'private-turnstile-key',
      s3AccessKey: '',
      s3SecretKey: '',
      tgBotToken: '',
      regVerifyCount: 1,
      addVerifyCount: 1
    };
    vi.spyOn(settingService, 'query').mockResolvedValue(internal);
    vi.spyOn(settingService, 'deletionMode').mockResolvedValue(0);
    vi.spyOn(verifyRecordService, 'selectListByIP').mockResolvedValue([]);
    vi.spyOn(r2Service, 'storageType').mockResolvedValue('KV');

    const response = await settingService.get({env: {}});

    expect(response.webhookSecretConfigured).toBe(true);
    expect(response.syncDelete).toBe(0);
    expect(response).not.toHaveProperty('webhookSecret');
    expect(JSON.stringify(response)).not.toContain('private-signing-key');
    expect(JSON.stringify(response)).not.toContain('private-resend-token');
    expect(internal.webhookSecret).toBe('private-signing-key');
    expect(internal.resendTokens.example).toBe('private-resend-token');
  });
});
