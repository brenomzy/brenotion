import { defineApp } from 'convex/server';
import { v } from 'convex/values';

const app = defineApp({
  env: {
    AUTHORIZED_CLERK_USER_ID: v.optional(v.string()),
    CLERK_JWT_ISSUER_DOMAIN: v.string(),
    OPENAI_API_KEY: v.optional(v.string()),
    OPENAI_CLASSIFICATION_MODEL: v.optional(v.string()),
    AI_CLASSIFICATION_ADAPTER: v.optional(v.string()),
  },
});

export default app;
