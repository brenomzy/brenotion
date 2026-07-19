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
import type * as cardSettlements from "../cardSettlements.js";
import type * as classificationDecisions from "../classificationDecisions.js";
import type * as financialCycles from "../financialCycles.js";
import type * as financialSnapshot from "../financialSnapshot.js";
import type * as homeActivation from "../homeActivation.js";
import type * as importHistory from "../importHistory.js";
import type * as importXlsx from "../importXlsx.js";
import type * as imports from "../imports.js";
import type * as lib_authorization from "../lib/authorization.js";
import type * as lib_cardSettlementReconciliation from "../lib/cardSettlementReconciliation.js";
import type * as lib_itauCreditCardStatement from "../lib/itauCreditCardStatement.js";
import type * as lib_itauCreditCardXlsxAdapter from "../lib/itauCreditCardXlsxAdapter.js";
import type * as lib_monthlyClosureReadiness from "../lib/monthlyClosureReadiness.js";
import type * as lib_ofxParser from "../lib/ofxParser.js";
import type * as lib_persistence from "../lib/persistence.js";
import type * as lib_sourceKey from "../lib/sourceKey.js";
import type * as monthlyClosures from "../monthlyClosures.js";
import type * as monthlyImportCoverage from "../monthlyImportCoverage.js";
import type * as obligationOccurrences from "../obligationOccurrences.js";
import type * as obligations from "../obligations.js";
import type * as ownerProfile from "../ownerProfile.js";
import type * as reportedExpenses from "../reportedExpenses.js";
import type * as testFixtures_syntheticOfx from "../testFixtures/syntheticOfx.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  cardSettlements: typeof cardSettlements;
  classificationDecisions: typeof classificationDecisions;
  financialCycles: typeof financialCycles;
  financialSnapshot: typeof financialSnapshot;
  homeActivation: typeof homeActivation;
  importHistory: typeof importHistory;
  importXlsx: typeof importXlsx;
  imports: typeof imports;
  "lib/authorization": typeof lib_authorization;
  "lib/cardSettlementReconciliation": typeof lib_cardSettlementReconciliation;
  "lib/itauCreditCardStatement": typeof lib_itauCreditCardStatement;
  "lib/itauCreditCardXlsxAdapter": typeof lib_itauCreditCardXlsxAdapter;
  "lib/monthlyClosureReadiness": typeof lib_monthlyClosureReadiness;
  "lib/ofxParser": typeof lib_ofxParser;
  "lib/persistence": typeof lib_persistence;
  "lib/sourceKey": typeof lib_sourceKey;
  monthlyClosures: typeof monthlyClosures;
  monthlyImportCoverage: typeof monthlyImportCoverage;
  obligationOccurrences: typeof obligationOccurrences;
  obligations: typeof obligations;
  ownerProfile: typeof ownerProfile;
  reportedExpenses: typeof reportedExpenses;
  "testFixtures/syntheticOfx": typeof testFixtures_syntheticOfx;
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
