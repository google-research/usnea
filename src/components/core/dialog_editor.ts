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

import {AfterViewInit, ChangeDetectorRef, Component, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {MatSnackBar, MatSnackBarRef, SimpleSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {v4 as uuidv4} from 'uuid';

import {createWelcomeGraph} from './../../common/demo_dialog_data';
import {Graph} from './../../common/interfaces';
import {GraphService} from './../../services/graph/graph_service';
import {SerializationService} from './../../services/persistence/graph_serialization';
import {PersistenceService} from './../../services/persistence/persistence_service_interface';
import {GraphEditor} from './../graph_editor/graph_editor';

const SNACKBAR_DURATION = 3;
const INTRO_VIDEO_KEY = 'did_see_intro_video';

/**
 * Root component for the entire app.
 */
@Component({
  selector: 'dialog-editor',
  templateUrl: 'dialog_editor.ng.html',
  styleUrls: ['./dialog_editor.scss'],
})
export class DialogEditor implements AfterViewInit {
  @ViewChild(GraphEditor, {static: false}) graphEditor!: GraphEditor;

  loading = true;
  loadingError = '';
  snackBarRef?: MatSnackBarRef<SimpleSnackBar>;

  constructor(
      private readonly router: Router,
      private readonly route: ActivatedRoute,
      private readonly snackBar: MatSnackBar,
      private readonly graphService: GraphService,
      private readonly persistenceService: PersistenceService,
      private readonly serializationService: SerializationService,
      private readonly ref: ChangeDetectorRef,
  ) {
    // Whenever there's a graph modification, persist it to the database.
    this.graphService.graphModification$.subscribe(modification => {
      if(modification.dontSave) {
        return;
      }
      this.saveGraph();
    });
  }

  get didSeeIntroVideo(): boolean {
    // If the item is not null, we're set.
    return window.localStorage.getItem(INTRO_VIDEO_KEY) !== null;
  }

  set didSeeIntroVideo(seen: boolean) {
    if (seen) {
      window.localStorage.setItem(INTRO_VIDEO_KEY, 'yes');
    } else {
      window.localStorage.removeItem(INTRO_VIDEO_KEY);
    }
  }

  dismissIntroVideo() {
    this.didSeeIntroVideo = true;
  }

  async ngAfterViewInit() {
    const graphId = this.route.snapshot.paramMap.get('graphId');
    // If no graph ID provided, start a new anonymous graph.
    if (!graphId) {
      this.graphService.newGraph(this.createDefaultGraph());
      console.log('No graph name provided, starting a new graph.');
    } else {
      await this.loadGraph(graphId);
    }
    if (!this.loadingError) {
      this.loading = false;

      // Setting loading to false does not trigger change detection.
      this.ref.detectChanges();
    }
  }

  async loadGraph(graphId: string) {
    console.log(`Loading graph with ID ${graphId}.`);
    try {
      const graph = await this.persistenceService.load(graphId);
      this.graphService.newGraph(
          this.serializationService.serializableGraphToGraph(graph));
    } catch (error) {
      this.loadingError = 'Failed to load graph.';
      console.error('Failed to load graph.', error);
    }
  }

  async saveGraph() {
    try {
      const {newGraph} = await this.persistenceService.save(
          this.serializationService.graphToSerializableGraph(
              this.graphService.graph));
      if (newGraph) {
        this.redirectToGraph(this.graphService.graph);
        this.showSnackbar(
            `Saved new graph with ID ${this.graphService.graph.id}.`);
      } else {
        this.showSnackbar(`Saved graph.`);
      }
    } catch (error) {
      console.log('ERROR', error);
      this.showSnackbar('Failed to save graph');
    }
  }

  private showSnackbar(text: string) {
    this.snackBarRef =
        this.snackBar.open(text, '', {duration: SNACKBAR_DURATION * 1000});
  }

  private redirectToGraph(graph: Graph) {
    this.router.navigate(['/', 'edit', graph.id]);
  }

  private createDefaultGraph() {
    /**
     * To re-seed the demo graph, replace the following with
     *     return createDemoGraph();
     * (be sure to include createDemoGraph at the top, too)
     */
    const graph = createWelcomeGraph();
    graph.id = uuidv4();
    return graph;
  }
}
