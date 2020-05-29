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

import {Component, Inject, Input, Optional, Type} from '@angular/core';
import {PROJECT_TOKEN, ProjectInspector} from './project_inspector/project_inspector';
import {Graph, GraphSelection, Node} from './../../common/interfaces';
import {isEdge, isNode} from './../../common/utils';
import {GraphService} from './../../services/graph/graph_service';

/**
 * A skeletal stub for the graph inspector.
 */
@Component({
  selector: 'graph-inspector',
  templateUrl: 'graph_inspector.ng.html',
  styleUrls: ['./graph_inspector.scss'],
})
export class GraphInspector {
  // Selection is mostly set via graphService, but can also be set via Input for
  // debugging purposes.
  @Input() selection: GraphSelection = null;
  graph!: Graph;

  constructor(
      private readonly graphService: GraphService,
      @Optional() @Inject(PROJECT_TOKEN) public projectInspector?:
          Type<ProjectInspector>) {
    this.graphService.graph$.subscribe(graph => {
      this.graph = graph;
    });
    this.graphService.selection$.subscribe(selection => {
      this.selection = selection;
    });
  }

  isEdge() {
    return isEdge(this.selection);
  }

  isNode() {
    return isNode(this.selection);
  }

  isStartNode() {
    return isNode(this.selection) &&
        (this.graph.start === (this.selection as Node).id);
  }

  onChange() {
    this.graphService.announceGraphModified({});
  }
}
