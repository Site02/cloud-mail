import {afterEach, describe, expect, it, vi} from 'vitest';
import userService from '../src/service/user-service';
import settingService from '../src/service/setting-service';

afterEach(() => vi.restoreAllMocks());

describe('account deletion consent', () => {
  it('reads the deletion mode from the database instead of the cached settings', async () => {
    const raw = vi.fn().mockResolvedValue([[0]]);
    const prepare = vi.fn().mockReturnValue({bind: () => ({raw})});
    const c = {env: {db: {prepare}, kv: {get: vi.fn().mockResolvedValue({syncDelete: 1})}}};

    expect(await settingService.deletionMode(c)).toBe(0);
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('sync_delete'));
    expect(c.env.kv.get).not.toHaveBeenCalled();
  });

  it('refuses deletion if the deletion mode changes after confirmation', async () => {
    const kvDelete = vi.fn();
    const c = {req: {header: () => 'en'}, env: {kv: {delete: kvDelete}}};
    vi.spyOn(settingService, 'deletionMode').mockResolvedValue(0);
    const physicalDelete = vi.spyOn(userService, 'physicsDelete').mockResolvedValue();

    await expect(userService.delete(c, 42, 1)).rejects.toMatchObject({code: 409});
    await expect(userService.delete(c, 42)).rejects.toMatchObject({code: 409});
    await expect(userService.delete(c, 42, 'invalid')).rejects.toMatchObject({code: 409});
    expect(physicalDelete).not.toHaveBeenCalled();
    expect(kvDelete).not.toHaveBeenCalled();

    await userService.delete(c, 42, 0);
    expect(physicalDelete).toHaveBeenCalledWith(c, {userIds: '42'});
    expect(kvDelete).toHaveBeenCalledTimes(1);
  });
});
