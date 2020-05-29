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

import {Directive, InjectionToken, NgModule, Type} from '@angular/core';
import {Graph} from './../../../common/interfaces';
import {GraphService} from './../../../services/graph/graph_service';

// TODO(pwnr): check b/148623697 for doc updates to link to here.
/**
 * Injection token for project inspectors.
 */
export const PROJECT_TOKEN =
    new InjectionToken<Type<ProjectInspector>>('usnea-project-inspector');

/**
 * Base class for project inspectors.
 */
@Directive({selector: 'abstract-project-inspector-base'})
export class ProjectInspector {
  graph!: Graph;

  constructor(readonly graphService: GraphService) {
    this.graph = this.graphService.graph;

    this.graphService.graph$.subscribe(graph => {
      this.graph = graph;
    });
  }
}

@NgModule({
  declarations: [ProjectInspector],
  exports: [ProjectInspector],
})
export class ProjectInspectorModule {
}
