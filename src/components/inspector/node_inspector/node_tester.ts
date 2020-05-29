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

import {Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild} from '@angular/core';
import {Edge, MatchCandidate, Node, SemanticMatchRule} from './../../../common/interfaces';
import {getEdgeName, isSemanticRuleOnEdge} from './../../../common/utils';
import {GraphService} from './../../../services/graph/graph_service';
import {InferenceResult, InferenceState, ScoredCandidate, ScoredSemanticMatchRule} from './../../../services/inference/interfaces';
import {SemanticInferenceService} from './../../../services/inference/semantic_inference_service';

interface SimpleSSMR {
  bestCandidate: ScoredCandidate|null;
  rule: SemanticMatchRule;
}

/**
 * Represents an evaluated candidate that we tested, which we might then want
 * to add as a semantic example.
 */
interface CandidateDetails {
  result: InferenceResult;
  // The text of the utterance.
  utterance: string;
  // What's the summary to show the user.
  summary: string;
  // Best matched candidates from each outgoing semantic match rule.
  scoredRules: SimpleSSMR[];
}

// The number of seconds to wait after one of the "add new example" buttons was
// pressed, to show that the press was registered.
const CONFIRM_TIME = 1;
// Number of seconds to wait before trying to refocus on the input node.
const REFOCUS_TIME = 0.1;

/**
 * The graph inspector.
 */
@Component({
  selector: 'node-tester',
  templateUrl: 'node_tester.ng.html',
  styleUrls: ['./node_tester.scss'],
})
export class NodeTester implements OnChanges {
  @Input() node!: Node;

  @ViewChild('query') queryElement!: ElementRef;

  utterance = '';
  candidate: CandidateDetails|null = null;
  confirmed = false;
  interactive = false;
  loadingResults = false;
  loadingError = '';

  constructor(
      private readonly inferenceService: SemanticInferenceService,
      private readonly graphService: GraphService,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['node']) {
      this.candidate = null;
    }
  }

  async testUtterance() {
    if (!this.utterance) {
      console.error(`Test utterance missing.`);
      return;
    }
    const inferenceState: InferenceState = {node: this.node, attemptNumber: 0};
    try {
      this.candidate = null;
      // Show a loading indicator.
      this.loadingResults = true;
      this.loadingError = '';
      const result =
          await this.inferenceService.evaluate(this.utterance, inferenceState);
      this.loadingResults = false;
      setTimeout(() => {
        this.queryElement.nativeElement.focus();
      }, REFOCUS_TIME * 1000);

      const summary =
          result.edge ? `Matched "${getEdgeName(result.edge)}"` : 'No match';
      const scoredRules =
          result.scoredSemanticMatchRules.map(ssmr => simplifyScoredSMR(ssmr));
      // Order scored rules by their score.
      scoredRules.sort(byScore);
      const candidate: CandidateDetails = {
        utterance: this.utterance,
        result,
        summary,
        scoredRules,
      };
      // If we're in interactive mode, possibly advance to the next node.
      if (this.interactive) {
        if (result.edge) {
          // If an edge matches, update the selection in the graph.
          this.graphService.setSelection(result.state.node);
        } else {
          // If we don't match a node, show an error.
        }
      }
      this.candidate = candidate;
      this.utterance = '';
    } catch (e) {
      this.loadingError = e;
    }
  }

  addPositiveExample(rule: SemanticMatchRule) {
    console.log('addPositiveExample', this.candidate, 'to', rule);
    this.addExample(rule);
  }

  addNegativeExample(rule: SemanticMatchRule) {
    console.log('addNegativeExample', this.candidate, 'to', rule);
    this.addExample(rule, true);
  }

  private addExample(rule: SemanticMatchRule, antiExample?: boolean) {
    if (!this.candidate) {
      throw new Error('No candidate found.');
    }
    const matchCandidate: MatchCandidate = {
      text: this.candidate.utterance,
    };
    if (antiExample !== undefined) {
      matchCandidate.antiExample = antiExample;
    }
    rule.matchCandidates.push(matchCandidate);
    this.confirmCandidate();
  }

  addNewEdge() {
    // TODO(smus): Make a new node, a new edge, a new semantic match rule and
    // use this candidate as a positive example.
    console.log('addNewEdge', this.candidate);
    this.confirmCandidate();
  }

  private confirmCandidate() {
    this.confirmed = true;
    setTimeout(() => {
      this.candidate = null;
      this.confirmed = false;
    }, CONFIRM_TIME * 1000);
  }

  getScoredRuleLabel(scoredRule: SimpleSSMR): string {
    if (scoredRule.bestCandidate) {
      const exampleText = scoredRule.bestCandidate.candidate.text;
      const confidence = scoredRule.bestCandidate.score.toFixed(2);
      return `${exampleText} (${confidence})`;
    } else {
      return 'No examples yet';
    }
  }

  startHover(scoredRule: SimpleSSMR) {
    this.graphService.graph.edges
        .filter((e: Edge) => {
          return e.source.id === this.node.id &&
              isSemanticRuleOnEdge(e, scoredRule.rule);
        })
        .forEach((e: Edge) => {
          this.graphService.toggleEdgeHighlight(e, true);
        });
  }

  endHover(scoredRule: SimpleSSMR) {
    this.graphService.graph.edges
        .filter((e: Edge) => {
          return e.source.id === this.node.id &&
              isSemanticRuleOnEdge(e, scoredRule.rule);
        })
        .forEach((e: Edge) => {
          this.graphService.toggleEdgeHighlight(e, false);
        });
  }
}

function simplifyScoredSMR(ssmr: ScoredSemanticMatchRule): SimpleSSMR {
  return {
    rule: ssmr.rule,
    bestCandidate: getBestCandidate(ssmr),
  };
}

function getBestCandidate(ssmr: ScoredSemanticMatchRule): ScoredCandidate|null {
  for (const scoredCandidate of ssmr.scoredCandidates) {
    if (scoredCandidate.topScore) {
      return scoredCandidate;
    }
  }
  return null;
}

function byScore(a: SimpleSSMR, b: SimpleSSMR) {
  if (a.bestCandidate && b.bestCandidate) {
    return b.bestCandidate.score - a.bestCandidate.score;
  }
  return 0;
}
