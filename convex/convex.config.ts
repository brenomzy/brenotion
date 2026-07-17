import { defineApp } from 'convex/server';
import { v } from 'convex/values';

const app = defineApp({
  env: {
    AUTHORIZED_CLERK_USER_ID: v.optional(v.string()),
    PLUGGY_CLIENT_ID: v.optional(v.string()),
    PLUGGY_CLIENT_SECRET: v.optional(v.string()),
    PLUGGY_ITEM_ID: v.optional(v.string()),
  },
});

export default app;
