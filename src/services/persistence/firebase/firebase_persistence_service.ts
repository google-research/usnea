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
import {Graph} from './../../../common/interfaces';
import {PersistenceService} from './../persistence_service_interface';
import {SerializableGraph} from './../graph_serialization';
import * as firebase from 'firebase/app';
import 'firebase/database';
import 'firebase/auth';
import {environment} from '../../../environments/environment';

/** Global Firebase app. */
export const app = firebase.initializeApp(environment.firebaseConfig);
/** Global Firestore database. */
export const database = firebase.database(app);

/** Implements Firebase saving and loading. */
@Injectable({
  providedIn: 'root',
})
export class FirebasePersistenceService extends PersistenceService {
  async load(graphId: string): Promise<SerializableGraph> {
    const snap = await database.ref(`graphs/${graphId}`).once('value');
    const firebaseGraph = snap.val() as SerializableGraph;
    if (!firebaseGraph) {
      throw new Error(`No graph found named ${graphId}.`);
    }
    return firebaseGraph;
  }

  async save(graph: SerializableGraph) {
    const ref = database.ref(`graphs/${graph.id}`);
    const snap = await ref.once('value');
    const oldGraph = snap.val() as SerializableGraph;
    if (oldGraph) {
      console.log(`Saving existing graph ${graph.id}.`);
    } else {
      console.log(`Creating new graph ${graph.id}.`);
    }
    try {
      await ref.set(graph);
      const result = {success: true, newGraph: !oldGraph};
      return result;
    } catch (e) {
      console.log('Failed to save firebase graph.');
      console.log(e);
      return {success: false};
    }
  }
}
