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
import {Condition, EdgeRule, EdgeRuleType, Graph, Mutation, Node, NodeID, SemanticMatchRule} from './../../common/interfaces';

/** A structure to hold a Graph that can safely be serialized. */
export declare interface SerializableGraph {
  id: string;
  contentId?: string;
  name: string;
  start: NodeID;
  nodes: SerializableNode[];
  edges: SerializableEdge[];
}

declare interface SerializableEdge {
  sourceIndex: number;
  targetIndex: number;
  rules: EdgeRule[];
  mutations: Mutation[];
  conditions: Condition[];
}

declare interface SerializableNodeAnchor {
  x: number;
  y: number;
}

declare interface SerializableNode {
  id: NodeID;
  title: string;
  prompt: string;
  retryPrompt: string;
  autoAdvance?: boolean;
  anchor?: SerializableNodeAnchor;
}

/**
 * Interface for Graph serialization / de-serialization.
 */
export class SerializationService {
  serializableGraphToGraph(serializableGraph: SerializableGraph): Graph {
    return {
      id: '',
      name: '',
      start: '',
      nodes: [],
      edges: [],
    };
  }

  graphToSerializableGraph(graph: Graph): SerializableGraph {
    return {
      id: '',
      name: '',
      start: '',
      nodes: [],
      edges: [],
    };
  }
}

/** Implements Firebase saving and loading. */
@Injectable({
  providedIn: 'root',
})
export class BaseSerializationService implements SerializationService {
  purifyNode(node: Node) {
    const {id, title, prompt, retryPrompt, autoAdvance, fx, fy} = node;
    const out: SerializableNode = {
      id,
      title,
      prompt,
      retryPrompt,
    };
    if (autoAdvance !== undefined) {
      out.autoAdvance = autoAdvance;
    }
    if (fx !== undefined && fy !== undefined) {
      out.anchor = {x: Number(fx), y: Number(fy)};
    }
    return out;
  }

  findNodeIndex(nodes: Node[], target: Node) {
    for (let i = 0; i < nodes.length; ++i) {
      if (nodes[i].id === target.id) {
        return i;
      }
    }
    throw new Error('Node not found by id.');
  }

  /** Convert a serializable graph to graph. */
  serializableGraphToGraph(serializableGraph: SerializableGraph): Graph {
    const graph: Graph = {
      id: serializableGraph.id,
      name: serializableGraph.name,
      start: serializableGraph.start,
      nodes: [],
      edges: [],
    };

    if (serializableGraph.contentId) {
      graph.contentId = serializableGraph.contentId;
    }

    for (const e of serializableGraph.nodes) {
      const n: Node = {
        id: e.id,
        title: e.title,
        prompt: e.prompt,
        retryPrompt: e.retryPrompt,
        autoAdvance: e.autoAdvance
      };

      if (e.anchor !== undefined) {
        n.fx = e.anchor.x;
        n.fy = e.anchor.y;
      }

      graph.nodes.push(n);
    }

    if (serializableGraph.edges) {
      for (const e of serializableGraph.edges) {
        // Note: Some databases like Firebase Realtime Database don't save empty
        // arrays, but SemanticMatchRules must exist and have at minimum an
        // empty array of matchCandidates. Here we ensure that this is the case.
        for (const r of e.rules) {
          if (r.type === EdgeRuleType.SEMANTIC_MATCH && !r.data) {
            r.data = {matchCandidates: []} as SemanticMatchRule;
          }
        }
        graph.edges.push({
          source: graph.nodes[e.sourceIndex],
          target: graph.nodes[e.targetIndex],
          rules: e.rules ? e.rules : [],
          mutations: e.mutations ? e.mutations : [],
          conditions: e.conditions ? e.conditions : [],
        });
      }
    }
    return graph;
  }

  /** Convert runtime graph to a format that can be serialized safely. */
  graphToSerializableGraph(graph: Graph): SerializableGraph {
    // Strip extras from Node objects which D3 or other libraries may have
    // added.
    const nodes = graph.nodes.map(node => this.purifyNode(node));

    const serializableGraph: SerializableGraph = {
      id: graph.id,
      name: graph.name,
      start: graph.start,
      nodes,
      edges: [],
    };

    if (graph.contentId) {
      serializableGraph.contentId = graph.contentId;
    }

    for (const e of graph.edges) {
      serializableGraph.edges.push({
        sourceIndex: this.findNodeIndex(graph.nodes, e.source),
        targetIndex: this.findNodeIndex(graph.nodes, e.target),
        rules: e.rules,
        mutations: e.mutations ? e.mutations : [],
        conditions: e.conditions ? e.conditions : [],
      });
    }
    return serializableGraph;
  }
}
