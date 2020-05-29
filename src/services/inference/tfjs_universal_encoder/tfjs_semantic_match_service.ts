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
import * as use from '@tensorflow-models/universal-sentence-encoder';
import {SemanticMatchService} from './../interfaces';

/**
 * TF.JS-based semantic matcher uses Universal Sentence Encoder model which
 * runs in the client.
 */
@Injectable({
  providedIn: 'root',
})
export class TFJSSemanticMatchService implements SemanticMatchService {
  model?: use.UniversalSentenceEncoder;

  constructor() {
    this.loadUniversalSentenceEncoder();
  }

  getThreshold() {
    return 0.75;
  }

  ready() {
    return Boolean(this.model);
  }

  private async loadUniversalSentenceEncoder() {
    const startTime = Date.now();
    this.model = await use.load();
    console.log(`Loaded USE model in ${Date.now() - startTime} ms.`);
  }

  async semanticSimilarity(utterance: string, candidates: string[]):
      Promise<number[]> {
    if (!this.model) {
      throw new Error('USE model not loaded yet.');
    }
    // Make a call to the client-side model to get all embeddings.
    const all = [utterance, ...candidates];
    const allEmbeddings = await this.model.embed(all);

    // Compare the first (utterance) embedding to each of the candidate
    // embeddings and generate a score for each.
    const utteranceEmbedding = allEmbeddings.slice([0, 0], [1]);
    const scores = [];
    for (let i = 0; i < candidates.length; i++) {
      // Get the embedding for the i'th candidate.
      const candidateEmbedding = allEmbeddings.slice([i + 1, 0], [1]);
      const candidateTranspose = false;
      const utteranceTranspose = true;
      const score =
          candidateEmbedding
              .matMul(
                  utteranceEmbedding, candidateTranspose, utteranceTranspose)
              .dataSync();
      scores.push(score[0]);
    }
    return scores;
  }
}
