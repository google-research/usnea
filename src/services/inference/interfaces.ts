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

import {Edge, EdgeRule, MatchCandidate, Node, SemanticMatchRule} from './../../common/interfaces';

/**
 * A service providing semantic matching functionality. This is just the base
 * class, not intended to be used directly.
 */
export class SemanticMatchService {
  // Is the semantic matcher ready to be called?
  ready(): boolean {
    return false;
  }
  // What's the threshold we're using for this service?
  getThreshold(): number {
    return -1;
  }
  // Generate scores for candidates.
  async semanticSimilarity(utterance: string, candidates: string[]):
      Promise<number[]> {
    return [];
  }
}

/** A state to be passed in to run inference on. */
export interface InferenceState {
  attemptNumber: number;
  node: Node;
  world?: Map<string, string>;
}

/**
 * A semantic match candidate that has a score assigned by a semantic matcher.
 */
export interface ScoredCandidate {
  candidate: MatchCandidate;
  score: number;
  // True iff this is the best candidate of the whole SemanticMatchRule.
  topScore: boolean;
}

/** Scored semantic match rule to populate a UI. */
export interface ScoredSemanticMatchRule {
  rule: SemanticMatchRule;
  scoredCandidates: ScoredCandidate[];
  // True iff this was the semantic match rule that was selected.
  chosen: boolean;
}

/** Result of running inference. */
export interface InferenceResult {
  state: InferenceState;
  // Which edge was taken, if any, to arrive at this new state.
  edge?: Edge;
  // Which rule was used to transition the edge.
  rule?: EdgeRule;
  // What were the other scores for every semantic match rule.
  scoredSemanticMatchRules: ScoredSemanticMatchRule[];
}

/** All inference services should have this signature. */
export interface InferenceService {
  // Whether the model is ready to be called (for client-side loading).
  ready(): boolean;
  evaluate(utterance: string, state: InferenceState): Promise<InferenceResult>;
}
