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

import {AfterViewInit, Component, Input, QueryList, ViewChildren} from '@angular/core';

import {Edge, EdgeRule, MatchCandidate, SemanticMatchRule} from './../../../common/interfaces';
import {GraphService} from './../../../services/graph/graph_service';
import {MatchCandidateEditor} from './match_candidate_editor';

/**
 * A skeletal stub for the graph inspector.
 */
@Component({
  selector: 'semantic-match-rule-editor',
  templateUrl: 'semantic_match_rule_editor.ng.html',
  styleUrls: ['./semantic_match_rule_editor.scss'],
})
export class SemanticMatchRuleEditor implements AfterViewInit {
  @Input() edge!: Edge;
  @Input() rule!: EdgeRule;
  @ViewChildren('matchCandidate')
  matchCandidateEditor!: QueryList<MatchCandidateEditor>;

  constructor(private readonly graphService: GraphService) {}

  ngAfterViewInit() {
    if (this.matchCandidateEditor && this.matchCandidateEditor.length > 0) {
      this.matchCandidateEditor.last.focusText();
    }
  }

  get semanticMatchRule() {
    return this.rule.data as SemanticMatchRule;
  }

  onAddCandidate() {
    console.log('onAddCandidate');
    this.semanticMatchRule.matchCandidates.push({text: ''});
    this.graphService.announceGraphModified({});
  }

  onDeleteCandidate(candidate: MatchCandidate) {
    const candidates = this.semanticMatchRule.matchCandidates;
    const index = candidates.indexOf(candidate);
    if (index === -1) {
      console.error(`Attempting to delete non-existent match candidate.`);
      return;
    }
    candidates.splice(index, 1);
    this.graphService.announceGraphModified({});
  }
}
