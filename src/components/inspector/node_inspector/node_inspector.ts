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
import {Node} from './../../../common/interfaces';
import {GraphService} from './../../../services/graph/graph_service';

/**
 * Node Inspector
 */
@Component({
  selector: 'node-inspector',
  templateUrl: 'node_inspector.ng.html',
  styleUrls: ['./node_inspector.scss'],
})
export class NodeInspector {
  @Input() node!: Node;
  @Input() startNode: boolean = false;

  constructor(private readonly graphService: GraphService) {}


  onNodeChange(event: Event) {
    this.graphService.announceGraphModified({
      onlyUpdateNodeIDList: [this.node.id],
      dontSave: true, // This is called on every keystroke.
    });
  }

  autoAdvanceToggled() {
    this.graphService.announceGraphModified({onlyUpdateNodeIDList: [this.node.id]});
  }

  onDelete() {
    this.graphService.deleteNode(this.node);
  }

  onPreview() {
    const graphId = this.graphService.graph.id;
    const nodeId = this.node.id;
    const previewUrl = `/preview/${graphId}/${nodeId}`;
    window.open(previewUrl);
  }
}
