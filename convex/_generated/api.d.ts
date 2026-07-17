/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as financialIntegration from "../financialIntegration.js";
import type * as financialSnapshot from "../financialSnapshot.js";
import type * as lib_authorization from "../lib/authorization.js";
import type * as lib_persistence from "../lib/persistence.js";
import type * as lib_pluggyClient from "../lib/pluggyClient.js";
import type * as ownerProfile from "../ownerProfile.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  financialIntegration: typeof financialIntegration;
  financialSnapshot: typeof financialSnapshot;
  "lib/authorization": typeof lib_authorization;
  "lib/persistence": typeof lib_persistence;
  "lib/pluggyClient": typeof lib_pluggyClient;
  ownerProfile: typeof ownerProfile;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
