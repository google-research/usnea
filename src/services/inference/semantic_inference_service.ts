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

import {Injectable} from '@angular/core';
import {Edge, EdgeRule, EdgeRuleType, MatchCandidate, MutationType, RepeatedFailRule, SemanticMatchRule} from './../../common/interfaces';
import {getOutEdges, getRepeatedFailEdges} from './../../common/utils';
import {GraphService} from './../graph/graph_service';
import {InferenceResult, InferenceService, InferenceState, ScoredCandidate, ScoredSemanticMatchRule, SemanticMatchService} from './interfaces';

interface SemanticMatchResult {
  maxScore: number|null;
  scoredCandidates: ScoredCandidate[];
}

/** Inference service that calls Sigil's Semantic Match RPC. */
@Injectable({
  providedIn: 'root',
})
export class SemanticInferenceService implements InferenceService {
  constructor(
      private readonly graphService: GraphService,
      private readonly semanticMatchService: SemanticMatchService,
  ) {}

  ready() {
    return true;
  }

  async checkSemanticMatchRule(utterance: string, rule: SemanticMatchRule):
      Promise<SemanticMatchResult> {
    // Skip calling semantic match if there are no candidates,
    // also the rpc 500s if you try this.
    if (rule.matchCandidates.length === 0) {
      return {
        maxScore: null,
        scoredCandidates: [],
      };
    }
    const scoredCandidates: ScoredCandidate[] = [];

    // Get semantic similarity scores for all of the candidates on this edge.
    const candidates = rule.matchCandidates.map((x: MatchCandidate) => x.text);
    // Results are returned in decreasing rank order.
    const scores = await this.semanticMatchService.semanticSimilarity(
        utterance, candidates);

    // Find the idx and score of the highest scoring candidate on this edge.
    let maxIndex = -1;
    let maxScore = -1;
    let maxPositive = false;
    for (let i = 0; i < rule.matchCandidates.length; i++) {
      const candidate = rule.matchCandidates[i];
      const score = scores[i];
      scoredCandidates.push({
        candidate,
        score,
        topScore: false,
      });
      if (score > maxScore) {
        maxIndex = i;
        maxScore = score;
        maxPositive = !candidate.antiExample;
      }
    }

    scoredCandidates[maxIndex].topScore = true;

    if (maxPositive) {
      return {
        maxScore,
        scoredCandidates,
      };
    }
    return {
      maxScore: null,
      scoredCandidates,
    };
  }

  async evaluate(utterance: string, state: InferenceState):
      Promise<InferenceResult> {
    if (!this.semanticMatchService.ready()) {
      throw new Error('Semantic match serice not ready yet. Please wait...');
    }
    let bestScore: number = 0.0;
    let bestEdge: Edge|null = null;
    let bestRule: EdgeRule|undefined;
    let bestSemanticMatchRuleIndex = 0;
    const scoredSemanticMatchRules: ScoredSemanticMatchRule[] = [];
    let semanticMatchRuleIndex: number = -1;

    for (const edge of getOutEdges(
             state.node, this.graphService.graph, state.world)) {
      for (const rule of edge.rules) {
        if (rule.type === EdgeRuleType.SEMANTIC_MATCH) {
          semanticMatchRuleIndex++;

          const semanticMatchResult = await this.checkSemanticMatchRule(
              utterance, rule.data as SemanticMatchRule);
          const topScore = semanticMatchResult.maxScore;
          scoredSemanticMatchRules.push({
            scoredCandidates: semanticMatchResult.scoredCandidates,
            rule: rule.data as SemanticMatchRule,
            chosen: false,
          });
          if (topScore && topScore > this.semanticMatchService.getThreshold() &&
              topScore > bestScore) {
            bestScore = topScore;
            bestEdge = edge;
            bestRule = rule;
            bestSemanticMatchRuleIndex = semanticMatchRuleIndex;
          }
        }
      }
    }

    // Default output is that there is no transition.
    const result: InferenceResult = {
      state: {
        attemptNumber: state.attemptNumber + 1,
        node: state.node,
        world: state.world,
      },
      scoredSemanticMatchRules,
    };

    if (bestEdge) {
      scoredSemanticMatchRules[bestSemanticMatchRuleIndex].chosen = true;
      result.state.attemptNumber = 0;
      result.state.node = bestEdge.target;
      result.edge = bestEdge;
      result.rule = bestRule;
      // update the world
      if (result.state.world) {
        applyMutations(result.state.world, result.edge);
      }
    } else {
      // Check repeated fail edges.
      for(const edge of getRepeatedFailEdges(result.state.node, this.graphService.graph)) {
        for (const rule of edge.rules) {
          if (rule.type === EdgeRuleType.REPEATED_FAIL) {
            const ruleData = rule.data as RepeatedFailRule;
            if(Number(result.state.attemptNumber >= ruleData.failCount)) {
              result.state.attemptNumber = 0;
              result.state.node = edge.target;
              result.edge = edge;
              result.rule = rule;
            }
          }
        }
      }
    }
    return result;
  }
}

/**
 * Utility function to update the world with a edge's mutations.
 */
export function applyMutations(world: Map<string, string>, edge: Edge) {
  if (edge.mutations) {
    for (const mutation of edge.mutations) {
      if (mutation.mutationType === MutationType.ADD) {
        world.set(mutation.key, mutation.value);
      } else if (mutation.mutationType === MutationType.REMOVE) {
        world.delete(mutation.key);
      }
    }
  }
}
