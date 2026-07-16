/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const SYNTHETIC_OWNER_ID = 'user_test_authorized_owner';
const SYNTHETIC_OTHER_ID = 'user_test_someone_else';

describe('access.verifyOwner', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('denies a request without an authenticated identity', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);

    await expect(t.query(api.access.verifyOwner)).rejects.toMatchObject({
      data: { code: 'AUTHENTICATION_REQUIRED' },
    });
  });

  it('denies an authenticated identity that is not on the allowlist', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules).withIdentity({ subject: SYNTHETIC_OTHER_ID });

    await expect(t.query(api.access.verifyOwner)).rejects.toMatchObject({
      data: { code: 'ACCESS_DENIED' },
    });
  });

  it('fails closed when the allowlist is not configured', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', '');
    const t = convexTest(schema, modules).withIdentity({ subject: SYNTHETIC_OWNER_ID });

    await expect(t.query(api.access.verifyOwner)).rejects.toMatchObject({
      data: { code: 'AUTHORIZATION_NOT_CONFIGURED' },
    });
  });

  it('accepts only the configured owner identity', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules).withIdentity({ subject: SYNTHETIC_OWNER_ID });

    await expect(t.query(api.access.verifyOwner)).resolves.toEqual({ status: 'authorized' });
  });
});
