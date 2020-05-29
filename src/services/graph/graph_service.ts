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
import {Edge, Graph, GraphSelection, Node} from './../../common/interfaces';
import {Subject} from 'rxjs';

/**
 * Annotations for the modification of a graph.
 */
export interface GraphModification {
  dontSave?: boolean;
  onlyUpdateNodeIDList?: string[];
}

// TODO(pwnr): Investigate possibility of a Edge|null emitter instead.
interface EdgeHighlightToggle {
  edge: Edge;
  toggleOn: boolean;
}

/** Graph service for accessing the current graph and its selection. */
@Injectable({
  providedIn: 'root',
})
export class GraphService {
  private readonly graphSource = new Subject<Graph>();
  private readonly selectionSource = new Subject<GraphSelection>();
  private readonly graphModificationSource = new Subject<GraphModification>();
  private readonly edgeHighlightSource = new Subject<EdgeHighlightToggle>();

  selection$ = this.selectionSource.asObservable();
  graph$ = this.graphSource.asObservable();
  graphModification$ = this.graphModificationSource.asObservable();
  edgeHighlight$ = this.edgeHighlightSource.asObservable();

  graph!: Graph;
  selection: GraphSelection = null;

  constructor() {
    // Make graph and selection available as properties, so that consuming
    // components and services don't need to setup new subscriptions themselves.
    this.graph$.subscribe(graph => {
      this.graph = graph;
    });
    this.selection$.subscribe(selection => {
      this.selection = selection;
    });
  }

  setSelection(selection: GraphSelection) {
    this.selectionSource.next(selection);
  }

  /** Called when a new graph is loaded. */
  newGraph(graph: Graph) {
    console.log('GraphService::newGraph', graph.name);
    this.graphSource.next(graph);
  }

  /** Called when a graph is modified. */
  announceGraphModified(modification: GraphModification) {
    console.log('GraphService::announceGraphModified', modification);
    this.graphModificationSource.next(modification);
  }

  deleteNode(node: Node) {
    this.graph.nodes = this.graph.nodes.filter((n: Node) => n.id !== node.id);
    this.graph.edges = this.graph.edges.filter(
        (l: Edge) => l.source.id !== node.id && l.target.id !== node.id);
    this.announceGraphModified({});
    this.selectionSource.next(null);
  }

  deleteEdge(edge: Edge) {
    this.graph.edges = this.graph.edges.filter(
        (l: Edge) =>
            l.source.id !== edge.source.id || l.target.id !== edge.target.id);
    this.announceGraphModified({});
  }

  toggleEdgeHighlight(edge: Edge, toggleOn: boolean) {
    this.edgeHighlightSource.next({edge, toggleOn});
  }
}
