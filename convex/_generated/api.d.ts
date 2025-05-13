/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as bookmarks from "../bookmarks.js";
import type * as dailyDigests from "../dailyDigests.js";
import type * as examDates from "../examDates.js";
import type * as file from "../file.js";
import type * as fileProcessor from "../fileProcessor.js";
import type * as flashcards from "../flashcards.js";
import type * as http from "../http.js";
import type * as medicalAPIs from "../medicalAPIs.js";
import type * as medicalDomains from "../medicalDomains.js";
import type * as medicalFactChecker from "../medicalFactChecker.js";
import type * as medicalKnowledgeGraph from "../medicalKnowledgeGraph.js";
import type * as medicalRAG from "../medicalRAG.js";
import type * as modelRouter from "../modelRouter.js";
import type * as notes from "../notes.js";
import type * as openai from "../openai.js";
import type * as progress from "../progress.js";
import type * as quizzes from "../quizzes.js";
import type * as router from "../router.js";
import type * as studyGoals from "../studyGoals.js";
import type * as studyPlans from "../studyPlans.js";
import type * as types from "../types.js";
import type * as user from "../user.js";
import type * as utils from "../utils.js";
import type * as wellnessCheckins from "../wellnessCheckins.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  auth: typeof auth;
  bookmarks: typeof bookmarks;
  dailyDigests: typeof dailyDigests;
  examDates: typeof examDates;
  file: typeof file;
  fileProcessor: typeof fileProcessor;
  flashcards: typeof flashcards;
  http: typeof http;
  medicalAPIs: typeof medicalAPIs;
  medicalDomains: typeof medicalDomains;
  medicalFactChecker: typeof medicalFactChecker;
  medicalKnowledgeGraph: typeof medicalKnowledgeGraph;
  medicalRAG: typeof medicalRAG;
  modelRouter: typeof modelRouter;
  notes: typeof notes;
  openai: typeof openai;
  progress: typeof progress;
  quizzes: typeof quizzes;
  router: typeof router;
  studyGoals: typeof studyGoals;
  studyPlans: typeof studyPlans;
  types: typeof types;
  user: typeof user;
  utils: typeof utils;
  wellnessCheckins: typeof wellnessCheckins;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
