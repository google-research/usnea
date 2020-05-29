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

import {EdgeRuleType, Graph} from './interfaces';
import {v4 as uuidv4} from 'uuid';
const START_NODE_ID_1 = uuidv4();
const START_NODE_ID_2 = uuidv4();

/** Something for everyone, a comedy tonight */
export function createWelcomeGraph(): Graph {
  return {
    start: START_NODE_ID_1,
    id: 'hello_world',
    name: 'Hello World',
    nodes: [
      {
        id: START_NODE_ID_1,
        title: '',
        prompt: 'What\'s on your human mind?',
        retryPrompt: 'Answer the question, human.',
        fx: 0.0,
        fy: 0.0,
      },
    ],
    edges: [],
  };
}

/** Example graph for testing/demoing. */
export function createDemoGraph(): Graph {
  const graph: Graph = {
    start: START_NODE_ID_2,
    id: 'demo_graph',
    name: 'Get Lamp',
    nodes: [
      {
        'fx': 433.88885448913084,
        'fy': -53.76002398947807,
        'id': START_NODE_ID_2,
        'prompt':
            'Welcome to the Lamp Store.  We love lamp, and we love you.  How can I be helpful to you on this particularly dark evening?',
        'retryPrompt': 'We sell lamps, what can I do for you?',
        'title': ''
      },
      {
        'fx': 433.28331624722983,
        'fy': 130.0452108349142,
        'id': uuidv4(),
        'prompt':
            'You\'ve come to the right place.  We have literally hundreds of lamps here, but as well you know each lamp has its own secret purpose.  What is it you require of your lamp?',
        'retryPrompt': 'Why do you need a lamp?',
        'title': 'But Why?'
      },
      {
        'fx': 213.09503530223623,
        'fy': 415.1814012412143,
        'autoAdvance': true,
        'id': uuidv4(),
        'prompt':
            'How nice!  I\'d recommend the iLamp 6E, it was released just this week so they\'ll know you actually love them.',
        'retryPrompt': '',
        'title': ''
      },
      {
        'fx': 470.10530691063167,
        'fy': 410.82146975959324,
        'autoAdvance': true,
        'id': uuidv4(),
        'prompt':
            'Nothing is as powerful and beautiful as a roaring blaze.  This antique oil lantern should serve your purposes neatly.',
        'retryPrompt': '',
        'title': ''
      },
      {
        'fx': 668.7287409880437,
        'fy': 375.96692967210447,
        'autoAdvance': true,
        'id': uuidv4(),
        'prompt':
            'Indeed it is, the sun has not risen for three days now.  Some say it is the end times.  I would recommend The Lightmaster, its luminous flux is well over 9000!',
        'retryPrompt': '',
        'title': ''
      },
      {
        'fx': 284.99763975155645,
        'fy': 747.5675047452709,
        'id': uuidv4(),
        'prompt': 'I hope you enjoy your new lamp',
        'retryPrompt': '',
        'title': ''
      },
      {
        'fx': -128.2410581457313,
        'fy': 219.79769175798916,
        'id': uuidv4(),
        'autoAdvance': true,
        'prompt':
            'Please!  No!  I have children...just take the lamps and go.  What...this lamp?  No, please, this was my great grandfathers, its all I have to remember him by.  I beg you... Nooooooo!',
        'retryPrompt': '',
        'title': ''
      }
    ],
    edges: [],
  };
  graph.edges = [
    {
      'rules': [{
        'data': {
          'matchCandidates': [
            {'text': 'I would like a lamp'}, {'text': 'give me a lamp'},
            {'text': 'one lamp please'},
            {'antiExample': true, 'text': 'i love lamp'}
          ]
        },
        'type': EdgeRuleType.SEMANTIC_MATCH
      }],
      'source': graph.nodes[0],
      'target': graph.nodes[1]
    },
    {
      'rules': [{
        'data': {
          'matchCandidates': [
            {'text': 'It\'s a present'}, {'text': 'As a present'},
            {'text': 'I need it to give to someone'}
          ]
        },
        'type': EdgeRuleType.SEMANTIC_MATCH
      }],
      'source': graph.nodes[1],
      'target': graph.nodes[2]
    },
    {
      'rules': [{
        'data': {
          'matchCandidates':
              [{'text': 'to start a fire'}, {'text': 'I want to commit arson'}]
        },
        'type': EdgeRuleType.SEMANTIC_MATCH
      }],
      'source': graph.nodes[1],
      'target': graph.nodes[3]
    },
    {
      'rules': [{
        'data': {
          'matchCandidates': [
            {'text': 'its very dark'}, {'text': 'it is too dark'},
            {'text': 'its dark in here!'}
          ]
        },
        'type': EdgeRuleType.SEMANTIC_MATCH
      }],
      'source': graph.nodes[1],
      'target': graph.nodes[4]
    },
    {
      'rules': [
        {'data': {'matchCandidates': []}, 'type': EdgeRuleType.SEMANTIC_MATCH}
      ],
      'source': graph.nodes[2],
      'target': graph.nodes[5]
    },
    {
      'rules': [{'data': {'matchCandidates': []}, 'type': 0}],
      'source': graph.nodes[3],
      'target': graph.nodes[5]
    },
    {
      'rules': [{'data': {'matchCandidates': []}, 'type': 0}],
      'source': graph.nodes[4],
      'target': graph.nodes[5]
    },
    {
      'rules': [{
        'data': {
          'failCount': 3,
          'failMessage': 'Look, trust me.  You want this lamp right here.'
        },
        'type': 1
      }],
      'source': graph.nodes[1],
      'target': graph.nodes[5]
    },
    {
      'rules': [{
        'data': {'matchCandidates': [{'text': 'Be cool, this is a robbery'}]},
        'type': EdgeRuleType.SEMANTIC_MATCH
      }],
      'source': graph.nodes[0],
      'target': graph.nodes[6]
    },
    {
      'rules': [{'data': {'matchCandidates': []}, 'type': 0}],
      'source': graph.nodes[6],
      'target': graph.nodes[5]
    }
  ];
  return graph;
}
