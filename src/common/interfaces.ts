/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** String ID Typedef for code clarity */
export type NodeID = string;

/** Represents the whole dialog graph. */
export declare interface Graph {
  id: string;
  contentId?: string;
  name: string;
  start: NodeID;
  nodes: Node[];
  edges: Edge[];
}

/** Represents a single selection in the graph. */
export type GraphSelection = Node|Edge|null;

/** Represents one node in the graph. */
export declare interface Node {
  id: NodeID;
  title: string;
  prompt: string;
  retryPrompt: string;
  autoAdvance?: boolean;
  fx?: number|null;
  fy?: number|null;
}

/** Layout info for an edge. */
export declare interface EdgeLayout {
  sourceX?: number;
  sourceY?: number;
  targetX?: number;
  targetY?: number;
  lineAnchorX?: number;
  lineAnchorY?: number;
  labelX?: number;
  labelY?: number;
  control?: number[]; // control point for the quadratic bezier curve
}

/** Represents an edge in the graph. */
export declare interface Edge {
  source: Node;
  target: Node;
  rules: EdgeRule[];

  conditions?: Condition[];
  mutations?: Mutation[];

  layout?: EdgeLayout;
}

/** Mutation Types. */
export enum MutationType {
  ADD,
  REMOVE,
}

/** Condition Types. */
export enum ConditionType {
  REQUIRE,
  FORBID,
}

/** A condition gating edge activation. */
export declare interface Condition {
  conditionType: ConditionType;
  key: string;
  value: string;
}

/** A mutation to the world state. */
export declare interface Mutation {
  mutationType: MutationType;
  key: string;
  value: string;
}

/** All supported edge rule types. */
export enum EdgeRuleType {
  SEMANTIC_MATCH,
  REPEATED_FAIL,
}

/** Represents a rule which lets you traverse the graph. */
export declare interface EdgeRule {
  type: EdgeRuleType;
  data: SemanticMatchRule|RepeatedFailRule;
}

/** Represents a rule that is evaluated based on semantic match quality. */
export declare interface SemanticMatchRule {
  matchCandidates: MatchCandidate[];
}

/** A positive or negative example. */
export declare interface MatchCandidate {
  text: string;
  antiExample?: boolean;
}

/**
 * Represents the rule used to advance to the next node after too many repeated
 * failures.
 */
export declare interface RepeatedFailRule {
  failMessage?: string;
  failCount: number;
}
