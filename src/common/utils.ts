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

/**
 * Multipurpose utility functions for use in the dialog_editor and its
 * subcomponents.
 */

import {ConditionType, Edge, EdgeRuleType, Graph, Node, SemanticMatchRule} from './interfaces';

/** Returns true iff argument is an Edge */
export function isEdge(nodeEdgeOrNull: Node|Edge|null): boolean {
  const edge = nodeEdgeOrNull as Edge;
  return (edge && edge.rules !== undefined);
}

/** Returns true iff argument is an Node */
export function isNode(nodeEdgeOrNull: Node|Edge|null): boolean {
  const node = nodeEdgeOrNull as Node;
  return (node && node.prompt !== undefined);
}

/** Returns true iff the edge has only repeated fail rules. */
export function isRepeatedFail(edge: Edge): boolean {
  let hasRepeatedFail = false;
  for (const rule of edge.rules) {
    if (rule.type === EdgeRuleType.REPEATED_FAIL) {
      hasRepeatedFail = true;
    } else {
      return false;
    }
  }
  return hasRepeatedFail;
}

/** Gets the name of an edge. */
export function getEdgeName(edge: Edge): string|null {
  // Get the first positive example of the first semantic match rule of this
  // edge.
  let firstSemanticRule: SemanticMatchRule|null = null;
  for (const rule of edge.rules) {
    if (rule.type === EdgeRuleType.SEMANTIC_MATCH) {
      firstSemanticRule = rule.data as SemanticMatchRule;
      break;
    }
  }
  if (!firstSemanticRule) {
    return null;
  }

  let firstPositiveExample: string|null = null;
  for (const matchCandidate of firstSemanticRule.matchCandidates) {
    if (!matchCandidate.antiExample) {
      firstPositiveExample = matchCandidate.text;
      break;
    }
  }
  return firstPositiveExample || '';
}

/** Gets all of the outbound edges for a node in the graph. */
export function getOutEdges(
    node: Node, graph: Graph, world: Map<string, string>|undefined) {
  const out: Edge[] = [];
  // Iterate through all edges to see if their source is the specified node.
  for (const edge of graph.edges) {
    if (edge.source.id === node.id) {
      let passedConditions = true;
      if (world && edge.conditions) {
        for (const condition of edge.conditions) {
          if (condition.conditionType === ConditionType.REQUIRE) {
            if (!world.has(condition.key) ||
                world.get(condition.key) !== condition.value) {
              passedConditions = false;
              break;
            }
          } else if (condition.conditionType === ConditionType.FORBID) {
            if (world.has(condition.key) ||
                world.get(condition.key) === condition.value) {
              passedConditions = false;
              break;
            }
          }
        }
      }
      if (passedConditions) {
        out.push(edge);
      }
    }
  }
  return out;
}

/** Gets all of the inbound edges for a node in the graph. */
export function getInEdges(node: Node, graph: Graph) {
  return graph.edges.filter(edge => edge.target.id === node.id);
}

/** Returns true iff the edge is mostly horizonal (as opposed to vertical) */
export function isHorizontal(edge: Edge) {
  const v = [
    edge.layout!.targetX! - edge.layout!.sourceX!,
    edge.layout!.targetY! - edge.layout!.sourceY!
  ];
  return Math.abs(v[0]) > Math.abs(v[1]);
}

/** Return all repeated fail edges coming out of a node */
export function getRepeatedFailEdges(node: Node, graph: Graph) {
  return getOutEdges(node, graph, undefined).filter(isRepeatedFail);
}

/** Returns true iff the edge contains the query SemanticMatchRule */
export function isSemanticRuleOnEdge(edge: Edge, query: SemanticMatchRule) {
  // TODO(pwnr): implement rule ids and use that to match
  const queryCandidates =
      new Set(query.matchCandidates.map(candidate => candidate.text));

  for (const rule of edge.rules) {
    if (rule.type === EdgeRuleType.SEMANTIC_MATCH) {
      const semanticRule = rule.data as SemanticMatchRule;
      const ruleCandidates = new Set();
      for (const candidate of semanticRule.matchCandidates) {
        ruleCandidates.add(candidate.text);
      }
      if (queryCandidates.size === ruleCandidates.size) {
        for (const c of queryCandidates) {
          if (!ruleCandidates.has(c)) {
            return false;
          }
        }
        return true;
      }
    }
  }
  return false;
}

/** Pick a random element from an array. */
export function pickRandom<T>(array: T[]) {
  const index = Math.floor(Math.random() * array.length);
  return array[index];
}

/** Get the index of the largest element in an array of numbers. */
export function argmax(array: number[]) {
  let maxValue = -Infinity;
  let maxIndex = -1;
  for (let i = 0; i < array.length; i++) {
    const value = array[i];
    if (value > maxValue) {
      maxValue = value;
      maxIndex = i;
    }
  }
  return [maxIndex, maxValue];
}

/** Copy to clipboard */
export function copyToClipboard(data: string) {
  const el = document.createElement('textarea');
  el.value = data;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

interface NodeDepth {
  node: Node;
  depth: number;
}

type StringList = string[];

/**
 * Returns the information needed for DAG Layout - an array of lists of node
 * ids, where the longest path from the start node has length i for all
 * nodes in the list at index i.
 *
 * Returns null if the graph has cycles.
 */
export function dagLayout(graph: Graph) {
  const startNode = graph.nodes.filter(n => n.id === graph.start)[0];
  const inDegree = new Map<string, number>();
  const finished = new Set<string>();
  const depthMap = new Map<string, number>();
  let maxDepth = 0;

  // Set up indegrees.
  inDegree.set(startNode.id, 1);
  for (const e of graph.edges) {
    if (inDegree.has(e.target.id)) {
      inDegree.set(e.target.id, inDegree.get(e.target.id)! + 1);
    } else {
      inDegree.set(e.target.id, 1);
    }
  }

  // Traverse graph and find max depth of each node.
  const proc: NodeDepth[] = [{node: startNode, depth: 0}];
  while (proc.length > 0) {
    const cur = proc.shift()!;
    const remainingInDegree: number = inDegree.get(cur.node.id)!;
    if (remainingInDegree === 1) {
      finished.add(cur.node.id);

      // Only enqueue outgoing edges if the node is finished.
      const outEdges = getOutEdges(cur.node, graph, undefined);
      for (const e of outEdges) {
        proc.push({node: e.target, depth: cur.depth + 1});
      }
    } else {
      inDegree.set(cur.node.id, remainingInDegree - 1);
    }
    // BFS ensures that this will monotonically increase depth.
    depthMap.set(cur.node.id, cur.depth);
    if (cur.depth > maxDepth) {
      maxDepth = cur.depth;
    }
  }

  if (finished.size !== graph.nodes.length) {
    // The presence of a cycle means a node is its own ancestor,
    // and so is children will never be enqued, leaving gaps in `finished`
    return null;
  }

  // Invert node->depth map.
  const depthToNode: StringList[] = [];
  for (let i = 0; i <= maxDepth; ++i) {
    depthToNode.push([]);
  }
  for (const item of depthMap.entries()) {
    depthToNode[item[1]].push(item[0]);
  }

  return depthToNode;
}
