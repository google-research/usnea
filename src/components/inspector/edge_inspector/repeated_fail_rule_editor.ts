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

import {Component, Input} from '@angular/core';
import {EdgeRule, RepeatedFailRule} from './../../../common/interfaces';

/**
 * A skeletal stub for the graph inspector.
 */
@Component({
  selector: 'repeated-fail-rule-editor',
  templateUrl: 'repeated_fail_rule_editor.ng.html',
  styleUrls: ['./repeated_fail_rule_editor.scss'],
})
export class RepeatedFailRuleEditor {
  @Input() rule!: EdgeRule;

  get repeatedFailRule() {
    return this.rule.data as RepeatedFailRule;
  }
}
