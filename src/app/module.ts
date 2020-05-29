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

import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserModule} from '@angular/platform-browser';
import {RouterModule, Routes} from '@angular/router';
import {DialogEditor} from './../components/core/dialog_editor';
import {DialogPreview} from './../components/preview/dialog_preview';
import {DialogPreviewModule} from './../components/preview/module';
import {GraphCoreModule} from './../components/core/module';
import {GraphService} from './../services/graph/graph_service';
import {PersistenceService} from './../services/persistence/persistence_service_interface';
import {SemanticMatchService} from './../services/inference/interfaces';
import {SemanticInferenceService} from './../services/inference/semantic_inference_service';
import {BaseSerializationService, SerializationService} from './../services/persistence/graph_serialization';

// App Specific imports.
import {FirebasePersistenceService} from './../services/persistence/firebase/firebase_persistence_service';
import {TFJSSemanticMatchService} from './../services/inference/tfjs_universal_encoder/tfjs_semantic_match_service';
import {DefaultProjectInspectorModule} from './../components/inspector/project_inspector/default_project_inspector/module';

import {MainApp} from './app';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { environment } from '../environments/environment';

const routes: Routes = [
  {path: '', pathMatch: 'full', component: DialogEditor},
  {path: 'edit/:graphId', component: DialogEditor},
  {path: 'preview/:graphId/:nodeId', component: DialogPreview},
  {path: 'preview/:graphId', component: DialogPreview},
];

@NgModule({
  declarations: [
    MainApp,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    RouterModule.forRoot(routes),
    GraphCoreModule,
    DefaultProjectInspectorModule,
    BrowserAnimationsModule,
    DialogPreviewModule,
  ],
  exports: [],
  providers: [
    GraphService,
    {provide: SerializationService, useClass: BaseSerializationService},
    {provide: PersistenceService, useClass: FirebasePersistenceService},
    {provide: SemanticMatchService, useClass: TFJSSemanticMatchService},
    SemanticInferenceService,
  ],
  bootstrap: [MainApp],
})
export class AppModule {
}
