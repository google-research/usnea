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

import {Component, EventEmitter, Output} from '@angular/core';

/** Represents a single item in the graph toolbar. */
export interface Tool {
  // Type of the tool (eg. ZOOM_TO_FIT).
  type: ToolType;
  // Name of the tool (eg. zoom to fit).
  name: string;
  // Name of the material icon (eg. fit_screen)
  iconName: string;
  // Whether it's a toggle or a one-off button (eg. false)
  toggle: boolean;
  // Whether the tool is currently enabled (only if it's a toggle).
  enabled?: boolean;
}

/** Types of tools the toolbar can have. */
export enum ToolType {
  ZOOM_TO_FIT,
  TOGGLE_ARRANGE_MODE,
  CYCLE_COLOR_SCHEME,
  SAVE_GRAPH,
  EXPORT_GRAPH,
  DAG_LAYOUT,
  TUTORIAL,
}

/**
 * Toolbar for manipulating graph in various ways.
 */
@Component({
  selector: 'graph-toolbar',
  templateUrl: 'graph_toolbar.ng.html',
  styleUrls: ['./graph_toolbar.scss'],
})
export class GraphToolbar {
  @Output() toolClick = new EventEmitter<Tool>();
  tools: Tool[] = [
    {
      type: ToolType.ZOOM_TO_FIT,
      name: 'Zoom to Fit',
      iconName: 'fit_screen',
      toggle: false,
    },
    // TODO(pwnr): Reenable with full functionality.
    // {
    //   type: ToolType.CYCLE_COLOR_SCHEME,
    //   name: 'Cycle Color Scheme',
    //   iconName: 'invert_colors',
    //   toggle: false,
    // },
    {
      type: ToolType.DAG_LAYOUT,
      name: 'DAG Layout',
      iconName: 'account_tree',
      toggle: false,
    },
    {
      type: ToolType.EXPORT_GRAPH,
      name: 'Export Graph',
      iconName: 'file_download',
      toggle: false,
    },
    {
      type: ToolType.SAVE_GRAPH,
      name: 'Save Graph',
      iconName: 'save',
      toggle: false,
    },
    {
      type: ToolType.TUTORIAL,
      name: 'Tutorial',
      iconName: 'help',
      toggle: false,
    },
  ];

  onToolClick(tool: Tool) {
    if (tool.toggle) {
      tool.enabled = !Boolean(tool.enabled);
    }
    this.toolClick.emit(tool);
  }
}
