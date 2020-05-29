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

import {createWelcomeGraph} from './../../common/demo_dialog_data';
import {Graph} from './../../common/interfaces';
import {SerializableGraph} from './graph_serialization';

interface SaveGraphResult {
  success: boolean;
  newGraph?: boolean;
}

/**
 * Persistence service interface. This is just the base class, is never
 * actually injected itself
 */
export class PersistenceService {
  // Returns null if the graph wasn't loaded successfully.
  async load(graphId: string): Promise<SerializableGraph> {
    return {
      'name': '', 'id': '', 'start': '', 'nodes': [], 'edges': [],
    };
  }
  // Returns true if graph was saved successfully.
  async save(graph: SerializableGraph): Promise<SaveGraphResult> {
    return {success: false, newGraph: false};
  }
}
