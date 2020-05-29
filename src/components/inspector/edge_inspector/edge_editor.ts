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

import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Condition, ConditionType, Edge, EdgeRule, EdgeRuleType, Mutation, MutationType} from './../../../common/interfaces';
import {GraphService} from './../../../services/graph/graph_service';

/**
 * The graph inspector.
 */
@Component({
  selector: 'edge-editor',
  templateUrl: 'edge_editor.ng.html',
  styleUrls: ['./edge_editor.scss'],
})
export class EdgeEditor {
  @Input() edge!: Edge;

  constructor(private readonly graphService: GraphService) {}

  // Needed in order to expose EdgeRuleType to the ng.html.
  ruleTypes = EdgeRuleType;
  ruleTypeList = [
    EdgeRuleType.SEMANTIC_MATCH,
    EdgeRuleType.REPEATED_FAIL,
  ];

  conditionTypeList = [
    ConditionType.REQUIRE,
    ConditionType.FORBID,
  ];

  mutationTypeList = [
    MutationType.ADD,
    MutationType.REMOVE,
  ];

  // New EdgeRule types.
  NEW_SEMANTIC_MATCH_RULE: EdgeRule = {
    type: EdgeRuleType.SEMANTIC_MATCH,
    data: {matchCandidates: []},
  };
  NEW_REPEATED_FAIL_RULE: EdgeRule = {
    type: EdgeRuleType.REPEATED_FAIL,
    data: {failCount: 3},
  };

  onDelete() {
    console.log('onDelete', this.edge);
    this.graphService.deleteEdge(this.edge);
  }

  onAddRule() {
    console.log('onAddRule');
    const newRule = {...this.NEW_SEMANTIC_MATCH_RULE};
    this.edge.rules.push(newRule);
  }

  onRuleTypeChange() {
    this.graphService.announceGraphModified({});
  }

  onDeleteRule(rule: EdgeRule) {
    console.log('onDeleteRule', rule);
    const index = this.edge.rules.indexOf(rule);
    this.edge.rules.splice(index, 1);
    this.graphService.announceGraphModified({});
  }

  getHumanReadableRuleTitle(ruleType: EdgeRuleType) {
    switch (ruleType) {
      case EdgeRuleType.SEMANTIC_MATCH:
        return 'Semantic match';
      case EdgeRuleType.REPEATED_FAIL:
        return 'Repeated fail';
      default:
        console.warn(`This shouldn't happen.`);
        return 'Untitled rule';
    }
  }

  getHumanReadableConditionTitle(conditionType: ConditionType) {
    switch (conditionType) {
      case ConditionType.REQUIRE:
        return 'Require';
      case ConditionType.FORBID:
        return 'Forbid';
      default:
        console.warn(`This shouldn't happen.`);
        return 'Untitled rule';
    }
  }

  getHumanReadableMutationTitle(mutationType: MutationType) {
    switch (mutationType) {
      case MutationType.ADD:
        return 'Add';
      case MutationType.REMOVE:
        return 'Remove';
      default:
        console.warn(`This shouldn't happen.`);
        return 'Untitled rule';
    }
  }

  deleteCondition(index: number) {
    this.edge.conditions!.splice(index, 1);
    this.announceModified();
  }

  deleteMutation(index: number) {
    this.edge.mutations!.splice(index, 1);
    this.announceModified();
  }

  onAddCondition() {
    const newCondition:
        Condition = {conditionType: ConditionType.REQUIRE, key: '', value: ''};
    if (this.edge.conditions) {
      this.edge.conditions.push(newCondition);
    } else {
      this.edge.conditions = [newCondition];
    }
    this.announceModified();
  }

  onAddMutation() {
    const newMutation:
        Mutation = {mutationType: MutationType.ADD, key: '', value: ''};
    if (this.edge.mutations) {
      this.edge.mutations.push(newMutation);
    } else {
      this.edge.mutations = [newMutation];
    }
    this.announceModified();
  }

  showRules() {
    return !this.edge.source.autoAdvance;
  }

  announceModified() {
    this.graphService.announceGraphModified({
      onlyUpdateNodeIDList: [this.edge.source.id],
      dontSave: true
    });
  }
}
