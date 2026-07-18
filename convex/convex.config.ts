import { defineApp } from 'convex/server';
import { v } from 'convex/values';

const app = defineApp({
  env: {
    AUTHORIZED_CLERK_USER_ID: v.optional(v.string()),
    CLERK_JWT_ISSUER_DOMAIN: v.string(),
  },
});

export default app;
