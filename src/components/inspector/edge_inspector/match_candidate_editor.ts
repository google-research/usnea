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

import {AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {Edge, MatchCandidate} from './../../../common/interfaces';
import {GraphService} from './../../../services/graph/graph_service';

/**
 * A skeletal stub for the graph inspector.
 */
@Component({
  selector: 'match-candidate-editor',
  templateUrl: 'match_candidate_editor.ng.html',
  styleUrls: ['./match_candidate_editor.scss'],
})
export class MatchCandidateEditor implements AfterViewInit {
  @Input() candidate!: MatchCandidate;
  @Input() edge!: Edge;
  @Output() delete = new EventEmitter<MatchCandidate>();
  @Output() enter = new EventEmitter<MatchCandidate>();

  @ViewChild('matchCandidateText') matchCandidateText!: ElementRef;

  ngAfterViewInit() {
    if (this.isEmpty()) {
      this.focusText();
    }
  }

  showDelete = false;

  constructor(private readonly graphService: GraphService) {}

  isEmpty() {
    return this.candidate.text.length === 0;
  }

  focusText() {
    this.matchCandidateText.nativeElement.focus();
  }

  toggle() {
    this.candidate.antiExample = !this.candidate.antiExample;
    this.graphService.announceGraphModified({});
  }

  deleteCandidate() {
    this.delete.emit(this.candidate);
    this.graphService.announceGraphModified({});
  }

  onTextChange(event: Event) {
    this.graphService.announceGraphModified({
      dontSave: true,
      onlyUpdateNodeIDList: [this.edge.source.id],
    });
  }

  getCandidateIcon() {
    return this.candidate.antiExample ? 'close' : 'check';
  }

  onMouseEnter(event: MouseEvent) {
    this.showDelete = true;
  }

  onMouseLeave(event: MouseEvent) {
    this.showDelete = false;
  }

  onEnter() {
    this.enter.emit(this.candidate);
  }
}
