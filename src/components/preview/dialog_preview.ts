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

import {Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {ActivatedRoute} from '@angular/router';

import {EdgeRuleType, Graph, Node, RepeatedFailRule} from './../../common/interfaces';
import {getOutEdges, pickRandom} from './../../common/utils';
import {GraphService} from './../../services/graph/graph_service';
import {InferenceState} from './../../services/inference/interfaces';
import {applyMutations, SemanticInferenceService} from './../../services/inference/semantic_inference_service';
import {SerializationService} from './../../services/persistence/graph_serialization';
import {PersistenceService} from './../../services/persistence/persistence_service_interface';

interface TranscriptItem {
  utterance: string;
  user: boolean;
}

/**
 * Dialog graph preview.
 */
@Component({
  selector: 'dialog-preview',
  templateUrl: 'dialog_preview.ng.html',
  styleUrls: ['./dialog_preview.scss'],

})
export class DialogPreview implements OnInit {
  @ViewChild('query') queryElement!: ElementRef;
  @ViewChild('restartButton') restartElement!: ElementRef;
  @ViewChild('history') historyElement!: ElementRef;

  loadingGraph = false;
  loadingResults = false;
  error = '';
  skipTypewriterIfPossible = false;

  graphName!: string;
  currentUtterance = '';
  transcript: TranscriptItem[] = [];
  inferenceState!: InferenceState;
  initialInferenceState!: InferenceState;
  finished = false;

  constructor(
      private readonly titleService: Title,
      private readonly route: ActivatedRoute,
      private readonly inferenceService: SemanticInferenceService,
      private readonly graphService: GraphService,
      private readonly persistenceService: PersistenceService,
      private readonly serializationService: SerializationService,
  ) {
    this.titleService.setTitle('Dialog Preview');
  }

  async ngOnInit() {
    const graphId = this.route.snapshot.paramMap.get('graphId');
    let nodeId = this.route.snapshot.paramMap.get('nodeId');

    try {
      if (!graphId) {
        throw new Error('graphId must be specified.');
      }

      this.loadingGraph = true;
      const serializableGraph = await this.persistenceService.load(graphId);
      const graph = this.serializationService.serializableGraphToGraph(serializableGraph);
      this.graphService.newGraph(graph);
      this.graphName = graph.name;
    } catch (e) {
      console.log(e);
      this.error = `Failed to load graph ${graphId}`;
    }

    nodeId = nodeId || this.graphService.graph.start || null;
    if (!nodeId) {
      throw new Error(`No nodeId and or graph start node found.`);
    }
    const node = getNodeById(this.graphService.graph, nodeId);
    if (!node) {
      throw new Error(`Failed to find node ${nodeId} in graph.`);
    }
    this.inferenceState = {
      node,
      attemptNumber: 0,
      world: new Map<string, string>()
    };
    this.initialInferenceState = {
      node,
      attemptNumber: 0,
      world: new Map<string, string>()
    };
    this.loadingGraph = false;
    await this.addTranscriptItem(node.prompt, false);
    // Try to auto advance if we can.
    await this.autoAdvanceAsNeeded();

    this.focusInput();
  }

  async submitUtterance() {
    if (!this.currentUtterance) {
      // Warn that we require an utterance.
      return;
    }
    // Save the utterance, but reset it in the input box.
    const utterance = this.currentUtterance;
    this.currentUtterance = '';

    // Record what the user said.
    await this.addTranscriptItem(utterance, true);

    this.loadingResults = true;
    setTimeout(() => {
      this.updateScroll(); // To handle the "Wait" indicator
    }, .1);
    const result =
        await this.inferenceService.evaluate(utterance, this.inferenceState);
    this.loadingResults = false;
    this.focusInput();

    this.inferenceState = result.state;

    if (result.edge) {
      if (result.rule!.type === EdgeRuleType.REPEATED_FAIL) {
        const ruleData = result.rule!.data as RepeatedFailRule;
        if(ruleData.failMessage) {
          await this.addTranscriptItem(ruleData.failMessage, false);
        }
      }

      await this.addTranscriptItem(result.state.node.prompt, false);
      // Try to auto advance if we can.
      await this.autoAdvanceAsNeeded();
      // If we're at a leaf node (no outgoing edges), we're done.
      if (this.isLeafNode(result.state)) {
        this.finishConversation();
      }
    } else {
      // Otherwise, we failed to match anything. Show the repeat prompt.
      await this.addTranscriptItem(result.state.node.retryPrompt, false);
    }
  }

  async restart() {
    this.transcript = [];
    this.finished = false;
    this.inferenceState = {...this.initialInferenceState};
    await this.addTranscriptItem(this.inferenceState.node.prompt, false);
    // Try to auto advance if we can.
    await this.autoAdvanceAsNeeded();
    this.focusInput();
  }

  private async autoAdvanceAsNeeded() {
    // Keep auto-advancing.
    while (this.inferenceState.node.autoAdvance) {
      const node = this.inferenceState.node;
      const edges =
          getOutEdges(node, this.graphService.graph, this.inferenceState.world);
      if (edges.length === 0) {
        throw new Error(`No edges in auto-advance node.`);
      }
      if (edges.length >= 2) {
        // If there are multiple edges in an autoadvance node, warn.
        console.warn(`Multiple edges on auto-advance node. Picking randomly.`);
      }
      const edge = pickRandom(edges);
      if (this.inferenceState.world) {
        applyMutations(this.inferenceState.world, edge);
      }
      // Manually advance to the next node.
      const nextNode = edge.target;
      this.inferenceState.node = nextNode;
      await this.addTranscriptItem(nextNode.prompt, false);
    }
  }

  private async addTranscriptItem(utterance: string, user: boolean) {
    console.log('addTranscriptItem', utterance, user);
    const transcriptItem = {utterance: '', user};
    this.transcript = [...this.transcript, transcriptItem];
    await this.typewriter(transcriptItem, utterance, !user);
  }

  private focusInput(): void {
    setTimeout(() => {
      this.queryElement.nativeElement.focus();
    }, 0);
  }

  private isLeafNode(state: InferenceState): boolean {
    const outEdges =
        getOutEdges(state.node, this.graphService.graph, state.world);
    return outEdges.length === 0;
  }

  private finishConversation(): void {
    this.finished = true;
    this.addTranscriptItem('To be continued...', false);
  }

  @HostListener('document:keypress', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if(event.key === "Enter") {  // Enter
      if(this.finished) {
        this.restart();
      } else {
        this.skipTypewriterIfPossible = true;
      }
    }
  }

  async typewriter(item: TranscriptItem, finalUtterance: string, breakable: boolean) {
    // Build out the item character by character.
    this.skipTypewriterIfPossible = false;
    for (let i = 0; i < finalUtterance.length; i++) {
      item.utterance = finalUtterance.slice(0, i + 1);
      this.updateScroll();
      if(breakable && this.skipTypewriterIfPossible) {
        item.utterance = finalUtterance;
        break;
      } else {
        await sleep(30);
      }
    }
    this.updateScroll();
  }

  updateScroll(){
    if(this.historyElement) {
      const element = this.historyElement.nativeElement;
      element!.scrollTop = element!.scrollHeight;
    }
  }
}



function getNodeById(graph: Graph, nodeId: string): Node|null {
  for (const node of graph.nodes) {
    if (node.id === nodeId) {
      return node;
    }
  }
  return null;
}

async function sleep(ms: number) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
}
