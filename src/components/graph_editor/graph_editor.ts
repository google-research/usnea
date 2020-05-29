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

import {AfterViewInit, Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';
import {MatSnackBar, MatSnackBarRef, SimpleSnackBar} from '@angular/material/snack-bar';
import * as d3 from 'd3';
import {v4 as uuidv4} from 'uuid';

import {Condition, ConditionType, Edge, EdgeRule, EdgeRuleType, Graph, GraphSelection, Mutation, MutationType, Node} from './../../common/interfaces';
import {copyToClipboard, dagLayout, getEdgeName, getInEdges, getOutEdges, isEdge, isHorizontal, isNode, isRepeatedFail} from './../../common/utils';
import {GraphModification, GraphService} from './../../services/graph/graph_service';
import {SerializationService} from './../../services/persistence/graph_serialization';
import {Tool, ToolType} from './graph_toolbar';

const HALF_NODE_HEIGHT = 50;
const HALF_NODE_WIDTH = 81;
const NODE_HEIGHT = 2 * HALF_NODE_HEIGHT;
const NODE_WIDTH = 2 * HALF_NODE_WIDTH;

const R_HALF_NODE_SZ = 30;
const R_NODE_SZ = 2 * R_HALF_NODE_SZ;

const NODE_TEXT_PAD_HORIZ = .9;
const TSPAN_ABSOLUTE_Y_SHIFT = 0.9;
const CURVE_SIZE = 70;

const LABEL_CIRCLE_RADIUS = 5;

const LABEL_WIDTH = 200;
const LABEL_HEIGHT = 40;
const DEGEN_LABEL_WIDTH = 40;
const DEGEN_LABEL_HEIGHT = 3;

const CONDITION_LABEL_OFFSET = -5;
const MUTATION_LABEL_OFFSET = 20;
const WORLD_LABEL_HEIGHT = 17;

const LABEL_TEXT_OFFSET_X = 4;
const LABEL_TEXT_OFFSET_Y = 5;

const PLUS_SVG = 'M2 1 h1 v1 h1 v1 h-1 v1 h-1 v-1 h-1 v-1 h1 z';
const MINUS_SVG = 'M1 2 h3 v1 h-3 z';
const CHECK_SVG = 'M0 -3 l2 2 l 3 -3 l -1 -1 l-2 2 l -1 -1z';
const X_SVG =
    'M0 -4 l1 1 l-1 1 l1 1 l1 -1 l1 1 l 1 -1 l-1 -1 l1 -1 l -1 -1 l-1 1 l -1 -1 l-1 lz';

const AUTOLAYOUT_PAD_VERT = 160;
const AUTOLAYOUT_PAD_HORIZ = 50;

const AUTOLAYOUT_X_SPACING =
    NODE_WIDTH + LABEL_WIDTH + 2 * AUTOLAYOUT_PAD_HORIZ;
const AUTOLAYOUT_Y_SPACING = NODE_HEIGHT + AUTOLAYOUT_PAD_VERT;

// The percent of the parent min(width/height) taken up by autozoom.
const AUTOZOOM_PARENT_PERCENT = .9;
const AUTOZOOM_PARENT_PERCENT_ONE = .3;
const AUTOZOOM_PARENT_PERCENT_TWO = .7;

// While zooming, a move of this or more will trigger a pan, otherwise it
// will trigger a click.
const MOUSE_MOVE_THRESHOLD = 5;

const MAX_TITLE_LENGTH = 8;
const MAX_LABEL_LENGTH = 20;

type D3Node = d3.Selection<SVGGElement, Node, Element, {}>;
type D3Edge = d3.Selection<SVGGElement, Edge, Element, {}>;
type D3Label = d3.Selection<SVGGElement, Edge, Element, {}>;

/**
 * An editor for directed graphs.
 */
@Component({
  selector: 'graph-editor',
  templateUrl: 'graph_editor.ng.html',
  styleUrls: ['./graph_editor.scss'],
})
export class GraphEditor implements OnChanges, AfterViewInit {
  // Graph is mostly set via graphService, but can also be set via an external
  // Input for debugging purposes.
  @Input() graph!: Graph;
  @Output() showTutorial = new EventEmitter<void>();

  svg?: d3.Selection<SVGElement, {}, HTMLElement, undefined>;
  masterG?:
      d3.Selection<Element, {}, HTMLElement, undefined>;
  zoom?: d3.ZoomBehavior<SVGElement, {}>;
  drag?: d3.DragBehavior<
      Element, {}, {}|d3.SubjectPosition>;

  nodeData: Node[] = [];
  edgeData: Edge[] = [];

  selectedSelection: d3.Selection<
      d3.BaseType, Node|Edge, d3.BaseType|null,
      {}|undefined>|null = null;

  nodeD3?: D3Node;
  edgeD3?: D3Edge;
  labelD3?: D3Label;

  initialized: boolean = false;

  lastKeyDown = -1;
  // adjustingGraph = false;

  mousedownNode: d3.SimulationNodeDatum|null = null;

  mouseDownEvent: MouseEvent|null = null;
  mouseDownCoords: number[]|null = null;
  mouseDowned = false;

  dragLine?:
      d3.Selection<d3.BaseType, {}, Element, undefined>;
  selection: GraphSelection = null;

  snackBarRef?: MatSnackBarRef<SimpleSnackBar>;

  constructor(
      private readonly graphService: GraphService,
      private readonly serializationService: SerializationService,
      // TODO(smus): Probably move SnackBar and other ancillary components into
      // a new parent component of graph-editor. This file does too many things.
      private readonly snackBar: MatSnackBar,
  ) {
    this.graphService.graph$.subscribe(graph => {
      if (this.graph) {
        this.clearGraph();
      }
      this.graph = graph;
      this.updateGraph({});

      const gEl = (this.masterG!.node() as SVGGElement);
      const bounds = gEl.getBBox();
      const parent = gEl.parentElement as HTMLElement;
      const fullWidth = parent.clientWidth;
      const fullHeight = parent.clientHeight;
      const width = bounds.width;
      const height = bounds.height;
      this.svg!.attr(
          'viewBox',
          `${- fullWidth / 2} ${- fullHeight / 2} ${fullWidth} ${fullHeight}`);
      if (width > 0 && height > 0) {
        let zoomPercent = AUTOZOOM_PARENT_PERCENT;
        if (this.graph.nodes.length === 1) {
          zoomPercent = AUTOZOOM_PARENT_PERCENT_ONE;
        } else if (this.graph.nodes.length === 2) {
          zoomPercent = AUTOZOOM_PARENT_PERCENT_TWO;
        }
        const scale =
            zoomPercent / Math.max(width / fullWidth, height / fullHeight);

        // g's midpoint might not be at the simulations' zero point.

        const midX = bounds.x + width / 2;
        const offsetX = midX / width * fullWidth;
        const midY = bounds.y + height / 2;
        const offsetY = midY / height * fullHeight;

        this.svg!.call(
            this.zoom!.transform,
            d3.zoomIdentity.translate(-offsetX, -offsetY).scale(scale));
      }
    });
    this.graphService.selection$.subscribe(selection => {
      this.selectByData(selection);
    });
    this.graphService.graphModification$.subscribe(modification => {
      this.updateGraph(modification);
    });
    this.graphService.edgeHighlight$.subscribe(highlight => {
      this.getEdgeSelectionByData(highlight.edge)
          .selectAll('path')
          .classed('highlighted-edge', highlight.toggleOn);
    });
  }

  async onToolClick(tool: Tool) {
    console.log('GraphEditor::onToolClick', tool);

    if (tool.type === ToolType.ZOOM_TO_FIT) {
      this.autoZoom();
    } else if (tool.type === ToolType.SAVE_GRAPH) {
      this.graphService.announceGraphModified({});
    } else if (tool.type === ToolType.EXPORT_GRAPH) {
      const firebaseGraph = this.serializationService.graphToSerializableGraph(this.graphService.graph);
      const graphString = JSON.stringify(firebaseGraph, null, 2);
      copyToClipboard(graphString);
      this.showSnackbar(`Graph JSON copied to clipboard.`);
    } else if (tool.type === ToolType.DAG_LAYOUT) {
      this.applyTreeLayout();
      this.graphService.announceGraphModified({});
    } else if (tool.type === ToolType.TUTORIAL) {
      this.showTutorial.emit();
    } else {
      this.showSnackbar(`"${tool.name}" not implemented yet.`);
    }
  }

  applyTreeLayout() {
    const layoutData = dagLayout(this.graph);
    if (layoutData === null) {
      this.showSnackbar('Cannot apply layout to a graph with cycles.');
      return;
    }
    const nodeMap = new Map<string, Node>();
    for (const n of this.graph.nodes) {
      nodeMap.set(n.id, n);
    }

    let y = 0;
    for (let i = 0; i < layoutData!.length; ++i) {
      const numNodesInRow = layoutData[i].length;
      let x = -(NODE_WIDTH + (numNodesInRow - 1) * AUTOLAYOUT_X_SPACING) / 2.0;
      for (const nodeID of layoutData![i]) {
        const n = nodeMap.get(nodeID) as d3.SimulationNodeDatum;
        n.fx = x;
        n.fy = y;
        x += AUTOLAYOUT_X_SPACING;
      }
      y += AUTOLAYOUT_Y_SPACING;
    }
  }

  private showSnackbar(text: string) {
    this.snackBarRef = this.snackBar.open(text);
  }

  selectGraphElement(d3Selection: d3.Selection<
                     d3.BaseType, Node|Edge, d3.BaseType|null,
                     {}|undefined>|null) {
    const oldGraphEl = this.selectedSelection && this.selectedSelection.datum();
    const newGraphEl = d3Selection && d3Selection.datum();
    // Don't do anything if the selection hasn't changed.
    if (oldGraphEl === newGraphEl) {
      return;
    }
    // Unselect the current selection, if it exists.
    if (this.selectedSelection) {
      this.selectedSelection.classed('selected', false);
    }
    this.selectedSelection = d3Selection;
    // Select the new selection, if it exists.
    if (this.selectedSelection) {
      this.selectedSelection.classed('selected', true);
    }
    this.graphService.setSelection(newGraphEl);
  }

  ngOnChanges() {
    if (this.initialized) {
      this.updateGraph({});
    }
  }

  getEdgeSelectionByData(e: Edge): D3Edge {
    return this.edgeD3!.filter((d: Edge) => {
      return (d.source.id === e.source.id && d.target.id === e.target.id);
    });
  }

  selectEdgeByData(e: Edge) {
    const edgeSelection = this.getEdgeSelectionByData(e);
    if (edgeSelection.size() === 1) {
      this.selectGraphElement(edgeSelection.selectAll('path'));
    }
  }

  selectNodeByData(n: Node) {
    this.nodeD3!.each((d: Node, i: number, ns: ArrayLike<d3.BaseType>) => {
      if (n.id === d.id) {
        this.selectGraphElement(d3.select(ns[i]));
      }
    });
  }

  clearGraph() {
    console.log('Clearing graph');
    this.nodeD3 = this.nodeD3!.data([]);
    this.nodeD3.exit().remove();
    this.edgeD3 = this.edgeD3!.data([]);
    this.edgeD3.exit().remove();
    this.labelD3 = this.labelD3!.data([]);
    this.labelD3.exit().remove();
  }

  updateNodeTitles(
      selection:
          d3.Selection<SVGGElement, Node, Element, {}>) {
    selection.selectAll<SVGTextElement, Node>('text')
        .text((d: Node) => d.title === '' ? d.prompt : d.title)
        .call(wrap, NODE_TEXT_PAD_HORIZ * NODE_WIDTH, /** max lines */ 5);
  }

  updateLabelTexts(
      selection:
          d3.Selection<SVGGElement, Edge, Element, {}>) {
    selection.selectAll<SVGTextElement, Edge>('.label-text').text((d: Edge) => {
      const name = getEdgeName(d);
      if (name && name.length > MAX_LABEL_LENGTH) {
        return name.slice(0, MAX_LABEL_LENGTH) + '...';
      }
      return name;
    });

    const mutationG =
        selection.selectAll<SVGGElement, Edge>('.label-mutations');
    mutationG.selectAll<SVGRectElement, Edge>('.mutation-label').remove();
    const mutationEnter =
        mutationG.selectAll<SVGRectElement, Edge>('.mutation-label')
            .data((d: Edge) => {
              return d.mutations ? d.mutations : [];
            })
            .enter()
            .append('g')
            .classed('mutation-label', true)
            .attr(
                'transform',
                (d: Mutation, i: number) => `translate(0,${
                    MUTATION_LABEL_OFFSET + WORLD_LABEL_HEIGHT * i})`);
    mutationEnter.append('path')
        .attr(
            'fill',
            (d: Mutation) =>
                d.mutationType === MutationType.ADD ? 'lime' : 'red')
        .attr('transform', 'translate(0,-16) scale(4)')
        .attr('d', (d: Mutation, i: number) => {
          if (d.mutationType === MutationType.ADD) {
            return PLUS_SVG;
          } else {
            return MINUS_SVG;
          }
        });

    mutationEnter.append('text')
        .classed('world-state-label', true)
        .attr('x', 20)
        .text((d: Mutation) => `${d.key} - ${d.value}`);

    const conditionG =
        selection.selectAll<SVGGElement, Edge>('.label-conditions');
    conditionG.selectAll<SVGRectElement, Edge>('.condition-label').remove();
    const conditionEnter =
        conditionG.selectAll<SVGRectElement, Edge>('.condition-label')
            .data((d: Edge) => {
              return d.conditions ? d.conditions : [];
            })
            .enter()
            .append('g')
            .classed('condition-label', true)
            .attr(
                'transform',
                (d: Condition, i: number) => `translate(0,${
                    CONDITION_LABEL_OFFSET - WORLD_LABEL_HEIGHT * i})`);

    conditionEnter.append('path')
        .attr(
            'fill',
            (d: Condition) =>
                d.conditionType === ConditionType.REQUIRE ? 'lime' : 'red')
        .attr('transform', 'translate(0,5) scale(3)')
        .attr('d', (d: Condition, i: number) => {
          if (d.conditionType === ConditionType.REQUIRE) {
            return CHECK_SVG;
          } else {
            return X_SVG;
          }
        });

    conditionEnter.append('text')
        .classed('world-state-label', true)
        .attr('x', 20)
        .text((d: Condition) => `${d.key} - ${d.value}`);
  }

  updateGraph(modification: GraphModification) {
    console.log('d3 updating', this.graph);

    this.nodeData = this.graph.nodes;
    this.edgeData = this.graph.edges;
    for (const e of this.edgeData) {
      if (!e.layout) {
        e.layout = {};
      }
    }

    // update nodes
    this.nodeD3 = this.nodeD3!.data(this.nodeData, (d: Node) => d.id);
    this.nodeD3.exit().remove();

    const nodeEnter = this.nodeD3.enter()
                          .append('g')
                          .classed('node', true)
                          .classed('fixed', (n: Node) => {
                            return n.fx !== undefined && n.fy !== undefined;
                          });

    nodeEnter.append('rect')
        .classed('nodebox', true)
        .classed('start-node', (d: Node) => d.id === this.graph.start)
        .attr('rx', 6)
        .attr('ry', 6)
        .on('mousedown',
            (d: Node) => {
              this.selectNodeByData(d);
            })
        .on('mouseup', (d: Node, i: number, ns: ArrayLike<Element>) => {
          // Perhaps we are creating a new link?

          d3.event.stopPropagation();

          if (this.mousedownNode) {
            // Hide drag line.
            this.dragLine!.classed('hidden', true).style('marker-end', '');

            // Prevent self loops.
            if (this.mousedownNode === d) {
              this.mousedownNode = null;
              return;
            }

            // Create a new edge with an empty semantic match rule.
            const newEdge: Edge = {
              source: this.mousedownNode as Node,
              target: d,
              rules: this.createNewEdgeRules(),
            };

            // Disallow duplicate edges and bidirectional edges.
            for (const edge of this.graph.edges) {
              if ((edge.source === newEdge.source &&
                   edge.target === newEdge.target) ||
                  (edge.source === newEdge.source &&
                   edge.target === newEdge.target)) {
                return;
              }
            }

            this.edgeData.push(newEdge);
            this.updateGraph({});
            this.selectEdgeByData(newEdge);
          }
          this.mousedownNode = null;
        });

    nodeEnter.append('text').attr('text-anchor', 'middle');

    nodeEnter.append('circle')
        .attr('r', 20)
        .classed('new-node-circle', true)
        .on('mousedown', (d: Node) => {
          d3.event.stopPropagation();

          this.mousedownNode = d as d3.SimulationNodeDatum;

          const transform = d3.zoomTransform(this.svg!.node()!);

          // Reposition drag line.
          this.dragLine!
              .attr(
                  'd',
                  `M${this.mousedownNode.fx},${this.mousedownNode.fy}L${
                      this.mousedownNode.fx},${this.mousedownNode.fy}`)
              .attr(
                  'transform',
                  `translate(${transform.x},${transform.y}) scale(${
                      transform.k})`);
        });

    // Update node titles for new nodes.
    nodeEnter.call(this.updateNodeTitles);

    this.nodeD3 = nodeEnter.merge(this.nodeD3);
    this.nodeD3.call(this.drag!);

    // updates to all items
    this.nodeD3.selectAll<SVGRectElement, Node>('rect')
        .classed('routing-nodebox', (d: Node) => isRoutingNode(d))
        .attr(
            'x',
            (d: Node) => isRoutingNode(d) ? -R_HALF_NODE_SZ : -HALF_NODE_WIDTH)
        .attr(
            'y',
            (d: Node) => isRoutingNode(d) ? -R_HALF_NODE_SZ : -HALF_NODE_HEIGHT)
        .attr('width', (d: Node) => isRoutingNode(d) ? R_NODE_SZ : NODE_WIDTH)
        .attr(
            'height', (d: Node) => isRoutingNode(d) ? R_NODE_SZ : NODE_HEIGHT);

    // Apply the general update pattern to the links.
    this.edgeD3 = this.edgeD3!.data(this.edgeData, (d: Edge) => {
      return `${d.source.id}-${d.target.id}`;
    });
    this.edgeD3.exit().remove();

    const edgeEnter = this.edgeD3.enter().append('g').attr('class', 'edge');

    edgeEnter.append('svg:path')
        .on('click', (d: Edge, i: number, ns: ArrayLike<d3.BaseType>) => {
          this.selectGraphElement(d3.select(ns[i]));
        });

    this.edgeD3 = edgeEnter.merge(this.edgeD3);
    this.edgeD3.selectAll<SVGGElement, Edge>('path')
        .classed(
            'auto-advance-edge',
            (d: Edge) => {
              return d.source.autoAdvance === true;
            })
        .classed('repeated-fail-edge', (d: Edge) => {
          return isRepeatedFail(d);
        });

    // Apply the general update pattern to the edges with labels.
    const edgeDataWithLabels = this.edgeData.filter((d: Edge) => {
      return getEdgeName(d) || (d.mutations && d.mutations.length > 0) ||
          (d.conditions && d.conditions.length > 0);
    });

    this.labelD3 = this.labelD3!.data(edgeDataWithLabels, (d: Edge) => {
      return `${d.source.id}-${d.target.id}`;
    });

    this.labelD3.exit().remove();
    const labelEnter = this.labelD3.enter().append('g').attr('class', 'label');
    labelEnter.append('rect')
        .classed('label-back', true)
        .classed('degenerate-label-back', (d: Edge) => !shouldShowLabel(d))
        .attr(
            'height',
            (d: Edge) => shouldShowLabel(d) ? LABEL_HEIGHT : DEGEN_LABEL_HEIGHT)
        .attr(
            'width',
            (d: Edge) => shouldShowLabel(d) ? LABEL_WIDTH : DEGEN_LABEL_WIDTH)
        .on('click',
            (d: Edge) => {
              d3.event.stopPropagation();
              this.selectEdgeByData(d);
            })
        .on('mousedown',
            () => {
              d3.event.stopPropagation();
            })
        .on('mouseup', () => {
          d3.event.stopPropagation();
        });
    labelEnter.append('path').classed('label-link', true);
    labelEnter.append('circle')
        .classed('label-anchor', true)
        .attr('r', LABEL_CIRCLE_RADIUS);
    labelEnter.append('text').classed('label-text', true);
    labelEnter.append('g').classed('label-mutations', true);
    labelEnter.append('g').classed('label-conditions', true);

    labelEnter.call(this.updateLabelTexts);

    this.labelD3 = labelEnter.merge(this.labelD3);

    // Also update local titles if the nodeID is specified.
    if (modification.onlyUpdateNodeIDList) {
      this.nodeD3
          .filter((d: Node) => {
            return modification.onlyUpdateNodeIDList!.indexOf(d.id) > -1;
          })
          .call(this.updateNodeTitles);
      this.labelD3
          .filter((d: Edge) => {
            return modification.onlyUpdateNodeIDList!.indexOf(d.source.id) > -1;
          })
          .call(this.updateLabelTexts);
    }
    // Other label subelements are updated via sim tick.

    // Persist selection over graph update.
    if (this.selectedSelection) {
      const selectionData = this.selectedSelection.datum() as GraphSelection;
      this.selectByData(selectionData);
    }

    this.tick();
  }

  private selectByData(selectionData: GraphSelection) {
    // TODO(smus): Only do stuff unless selection changes.
    if (isEdge(selectionData)) {
      this.selectEdgeByData(selectionData as Edge);
    } else if (isNode(selectionData)) {
      this.selectNodeByData(selectionData as Node);
    }
  }

  private createNewEdgeRules(): EdgeRule[] {
    return [{
      type: EdgeRuleType.SEMANTIC_MATCH,
      data: {matchCandidates: [{'text': ''}]},
    }];
  }

  async ngAfterViewInit() {
    console.log('GraphEditor::ngOnInit');
    this.setUpSVG();

    this.nodeD3 = this.masterG!.selectAll<SVGGElement, {}>('.node').data([]);
    this.edgeD3 = this.masterG!.selectAll<SVGLineElement, {}>('.edge').data([]);
    this.labelD3 = this.masterG!.selectAll<SVGGElement, {}>('.label').data([]);

    // line displayed when dragging new nodes
    this.dragLine = this.svg!.append('svg:path')
                        .attr('class', 'edge dragline hidden')
                        .attr('d', 'M0,0L0,0');

    this.initialized = true;
  }

  getMouseCoords() {
    const svgNode = this.svg!.node()!;
    const mouse = d3.mouse(svgNode as d3.ContainerElement);
    const transform = d3.zoomTransform(svgNode);
    return transform.invert(mouse);
  }

  // Helper to compute length of a line (distance between two points).
  lineLength(a: number[], b: number[]) {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
  }

  setUpSVG() {
    this.svg = d3.select<SVGElement, {}>('#graph-editor');

    const parent = this.svg.node()!;
    const fullWidth = parent.clientWidth;
    const fullHeight = parent.clientHeight;
    console.log(
        `Initializing SVG with width ${fullWidth} and height ${fullHeight}`);

    this.svg.attr(
        'viewBox',
        `${- fullWidth / 2} ${- fullHeight / 2} ${fullWidth} ${fullHeight}`);

    const clickyRect = this.svg.append('rect')
                           .classed('click-rect', true)
                           .attr('width', '200%')
                           .attr('height', '200%')
                           .attr('x', '-100%')
                           .attr('y', '-100%')
                           .attr('fill', 'steelblue');

    this.masterG = this.svg.append('g');



    // PROTIP: all markers can be defined in one block by giving each a name
    // in 'data' and then having attr determine its value based on the
    // marker name.
    this.svg.append('svg:defs')
        .selectAll('marker')
        .data([
          {id: 'end-arrow', fill: 'black'},
          {id: 'end-arrow-selected', fill: '#ff1493'},
          {id: 'end-arrow-auto-advance', fill: '#90ee90'},
          {id: 'end-arrow-repeated-fail', fill: 'crimson'},
          {id: 'end-arrow-highlighted', fill: '#33ddcc'},
        ])
        .enter()
        .append('svg:marker')
        .attr('id', d => d.id)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 6)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', d => d.fill);

    clickyRect.on('mousedown', () => {
      this.mouseDowned = true;

      // Create a copy of the mousedown event to propagate later if needed.
      this.mouseDownEvent = new MouseEvent(d3.event.type, d3.event);

      // Keep coords handy to check distance to see if mouse moved far enough.
      this.mouseDownCoords = [this.mouseDownEvent.x, this.mouseDownEvent.y];

      // Do not propagate this mousedown to zoom immediately
      // We will fake it with the mouseDownEvent if the mouse moves far enough.
      d3.event.stopPropagation();
    });

    clickyRect.on(
        'mousemove',
        (d: {}, i: number, ns: ArrayLike<SVGElement>) => {
          if (!this.mousedownNode) {
            return;
          }

          const mouse = this.getMouseCoords();

          // update drag line
          this.dragLine!.style('marker-end', 'url(#end-arrow)')
              .classed('hidden', false)
              .attr(
                  'd',
                  `M${this.mousedownNode.fx},${this.mousedownNode.fy}L${
                      mouse[0]},${mouse[1]}`);
          this.tick();
        });

    clickyRect.on(
        'mouseup',
        (d: {}, i: number, ns: ArrayLike<SVGElement>) => {
          this.mouseDowned = false;
          if (this.mousedownNode) {
            // hide drag line
            this.dragLine!.classed('hidden', true).style('marker-end', '');

            const mouse = this.getMouseCoords();

            const newNode = {
              id: uuidv4(),
              title: '',
              prompt: '',
              retryPrompt: '',
              fx: mouse[0],
              fy: mouse[1],
              x: mouse[0],
              y: mouse[1],
            };

            const newEdge = {
              source: this.mousedownNode as Node,
              target: newNode,
              rules: this.createNewEdgeRules(),
            };

            this.nodeData.push(newNode);
            this.edgeData.push(newEdge);
            this.graphService.announceGraphModified({});
            this.selectEdgeByData(newEdge);
          } else {
            this.selectGraphElement(null);
          }

          // TODO(pwnr): see if this is necessary and WTF it does.
          // because :active only works in WebKit?
          this.svg!.classed('active', false);

          this.mousedownNode = null;
        });

    this.svg.on('mouseup', () => {
      this.mouseDowned = false;
    });

    this.svg.on('mousemove', () => {
      // Skip tracking mouse move if we didn't mousedown on the highlight item.
      if (!this.mouseDowned) {
        return;
      }

      const mouse = [d3.event.x, d3.event.y];
      const distance = this.lineLength(mouse, this.mouseDownCoords!);

      // We have reached a big enough distance to pass over to the zoom handler.
      if (distance > MOUSE_MOVE_THRESHOLD) {
        this.mouseDowned = false;

        // Dispatch original mouse down event to the zoom handler
        // Note that here the mousedown event is dispatched directly on the
        // zoom element (this.svg), which bypasses our mousedown listener above.
        this.svg!.node()!.dispatchEvent(this.mouseDownEvent!);
      }
    });

    this.svg.on('mouseleave', () => {
      if (this.mousedownNode) {
        this.mousedownNode = null;
        this.hideDragLine();
      }
    });

    // TODO(pwnr): decide on appropriate extents for zooming and panning.
    this.zoom = d3.zoom<SVGElement, {}>()
                    .extent([[0, 0], [fullWidth, fullHeight]])
                    .scaleExtent([.1, 8])
                    .on('zoom', () => {
                      this.masterG!.attr('transform', d3.event.transform);
                    });
    this.svg.call(this.zoom);

    this.drag =
        d3.drag()
            // Mac Firefox doesn't distinguish between left/right click when
            // Ctrl is held...
            // 0 is 'no button' and 2 is right click.
            // TODO(pwnr): kill this code
            .filter(() => d3.event.button === 0 || d3.event.button === 2)
            .on('drag', (d: d3.SimulationNodeDatum) => {
              d.fx = d3.event.x;
              d.fy = d3.event.y;
              this.tick();
            });

    // TODO(pwnr): kill this code
    this.svg.classed('ctrl', true);
  }

  hideDragLine() {
    this.dragLine!.classed('hidden', true).style('marker-end', '');
  }

  tick() {
    this.edgeD3!.selectAll<SVGPathElement, Edge>('path')
        .each((d: Edge) => {
          const sourceIntercept = getIntercept(d.source, d.target);
          const targetIntercept = getIntercept(d.target, d.source);
          const layout = d.layout!;
          layout.sourceX = sourceIntercept[0];
          layout.sourceY = sourceIntercept[1];
          layout.targetX = targetIntercept[0];
          layout.targetY = targetIntercept[1];
        })
        .attr('d', (d: Edge) => {
          // This behaviour is where we draw the line.
          const v = [d.layout!.targetX!-d.layout!.sourceX!,
                     d.layout!.targetY!-d.layout!.sourceY!];

          const mid = [v[0]/2, v[1]/2];
          const inEdges = getInEdges(d.source, this.graph);
          const outEdges = getOutEdges(d.target, this.graph, undefined);
          const closeEdges = [d].concat(inEdges).concat(outEdges);
          const horizEdges = closeEdges.filter(isHorizontal);
          const horiz = (horizEdges.length / closeEdges.length) > .5;
          let flip = true;
          if (v[1] !== 0) {
            if (horiz) {
              flip = v[0] / v[1] < 0;
            } else {
              flip = v[0] / v[1] > 0;
            }
          }

          const rot = flip ? [mid[1], -mid[0]] : [-mid[1], mid[0]];
          const norm = Math.sqrt(Math.pow(rot[0],2) + Math.pow(rot[1],2));
          const scaled = [rot[0] / norm * CURVE_SIZE, rot[1] / norm * CURVE_SIZE];
          d.layout!.control = [d.layout!.sourceX!+mid[0]+scaled[0],d.layout!.sourceY!+mid[1]+scaled[1]];
          return `M${d.layout!.sourceX},${d.layout!.sourceY}S${d.layout!.control[0]},${d.layout!.control[1]},${d.layout!.targetX},${d.layout!.targetY}`;
        });

    this.labelD3!.each((d: Edge) => {
      let deltaX = d.layout!.targetX! - d.layout!.sourceX!;
      const deltaY = d.layout!.targetY! - d.layout!.sourceY!;
      if (deltaX === 0) {
        deltaX = .00001;
      }
      const angle = Math.abs(Math.atan(-deltaY / deltaX));

      // How far along the edge arrow is the anchor?
      let linePosition = 0.0;
      const sc = d3.scaleLinear().domain([0, 1.57]).range([0, 1.0]);
      linePosition = sc(angle);
      linePosition = linePosition * .8 + .1;

      const t = linePosition;

      const src = [d.layout!.sourceX!, d.layout!.sourceY!];
      const trg = [d.layout!.targetX!, d.layout!.targetY!];
      const ctl = d.layout!.control!;
      const point = bezierBlend(bezierBlend(trg,ctl,t), bezierBlend(ctl,src,t), t);

      d.layout!.lineAnchorX = point[0];
      d.layout!.lineAnchorY = point[1];

      const padSize = 20;
      const padX = padSize * Math.sin(angle);
      let padY = padSize * Math.cos(angle);
      if (deltaX * deltaY > 0) {  // 2nd and 4rd quadrants
        padY = -padY;
      }

      d.layout!.labelX = d.layout!.lineAnchorX + padX;
      d.layout!.labelY = d.layout!.lineAnchorY + padY;
    });

    this.labelD3!.selectAll<SVGGElement, Edge>('.label-conditions')
        .attr('transform', (d: Edge) => {
          let y = d.layout!.labelY!;
          if (shouldShowLabel(d)) {
            y -= LABEL_HEIGHT / 2;
          }
          return `translate(${d.layout!.labelX!},${y})`;
        });
    this.labelD3!.selectAll<SVGGElement, Edge>('.label-mutations')
        .attr('transform', (d: Edge) => {
          let y = d.layout!.labelY!;
          if (shouldShowLabel(d)) {
            y += LABEL_HEIGHT / 2;
          }
          return `translate(${d.layout!.labelX!},${y})`;
        });

    this.labelD3!.selectAll<SVGTextElement, Edge>('.label-text')
        .attr('transform', (d: Edge) => {
          return `translate(${d.layout!.labelX! + LABEL_TEXT_OFFSET_X},${
              d.layout!.labelY! + LABEL_TEXT_OFFSET_Y})`;
        });
    this.labelD3!.selectAll<SVGRectElement, Edge>('.label-back')
        .attr('transform', (d: Edge) => {
          let y = d.layout!.labelY!;
          if (shouldShowLabel(d)) {
            y -= LABEL_HEIGHT / 2;
          }
          return `translate(${d.layout!.labelX!},${y})`;
        });
    this.labelD3!.selectAll<SVGCircleElement, Edge>('.label-anchor')
        .attr('cx', (d: Edge) => d.layout!.lineAnchorX!)
        .attr('cy', (d: Edge) => d.layout!.lineAnchorY!);
    this.labelD3!.selectAll<SVGPathElement, Edge>('.label-link')
        .attr('d', (d: Edge) => {
          return `M${d.layout!.lineAnchorX!},${d.layout!.lineAnchorY!}L${
              d.layout!.labelX},${d.layout!.labelY}`;
        });

    this.nodeD3!.attr('transform', (d: Node) => {
      const simDatum = d as d3.SimulationNodeDatum;
      return `translate(${simDatum.fx},${simDatum.fy})`;
    });
  }

  autoZoom() {
    const gEl = (this.masterG!.node() as SVGGElement);
    const bounds = gEl.getBBox();
    const parent = gEl.parentElement as HTMLElement;
    const fullWidth = parent.clientWidth;
    const fullHeight = parent.clientHeight;
    const width = bounds.width;
    const height = bounds.height;
    this.svg!.attr(
        'viewBox',
        `${- fullWidth / 2} ${- fullHeight / 2} ${fullWidth} ${fullHeight}`);
    if (width > 0 && height > 0) {
      let zoomPercent = AUTOZOOM_PARENT_PERCENT;
      if (this.graph.nodes.length === 1) {
        zoomPercent = AUTOZOOM_PARENT_PERCENT_ONE;
      } else if (this.graph.nodes.length === 2) {
        zoomPercent = AUTOZOOM_PARENT_PERCENT_TWO;
      }
      const scale =
          zoomPercent / Math.max(width / fullWidth, height / fullHeight);

      // g's midpoint might not be at the simulations' zero point.

      const midX = bounds.x + width / 2;
      const offsetX = midX / width * fullWidth;
      const midY = bounds.y + height / 2;
      const offsetY = midY / height * fullHeight;

      this.svg!.transition().duration(1000).call(
          this.zoom!.transform,
          d3.zoomIdentity.translate(-offsetX, -offsetY).scale(scale));
    }
  }
}

/**
 *
 * Text Wrapping for nodes.
 *
 * NOTE: This seems to be a very expensive operation, so much so that in large
 * graphs it causes significant lag if called on each update.
 *
 * Current workaround is to give an explicit signal to update the node texts
 *
 */
function wrap(
    text: d3.Selection<SVGTextElement, Node, d3.BaseType, Node>, width: number,
    maxlines: number) {
  text.each(function() {
    const text = d3.select(this);
    const words = text.text().split(/\s+/).reverse();
    let word: string|undefined = '';
    let line: string[] = [];
    let lineNumber = 0;
    const lineHeight = 1.1;  // ems
    let tspan = text.text(null).append('tspan').attr('x', 0).attr('y', 0).attr(
        'dy', '0em');
    let nlines = 1;
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(' '));
      if (tspan.node()!.getComputedTextLength() > width) {
        line.pop();
        nlines += 1;
        if (nlines > maxlines) {
          tspan.text(line.join(' ').slice(0, MAX_TITLE_LENGTH) + '...');
          nlines -= 1;
          break;
        }
        tspan.text(line.join(' '));
        if (tspan.node()!.getComputedTextLength() > width) {
          tspan.text(line.join(' ').slice(0, MAX_TITLE_LENGTH) + '...');
        }
        line = [word];
        tspan = text.append('tspan')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('dy', `${++lineNumber * lineHeight}em`)
                    .text(word);
      }
    }
    if (tspan.node()!.getComputedTextLength() > width) {
      tspan.text(line.join(' ').slice(0, MAX_TITLE_LENGTH) + '...');
    }
    const yShift = lineHeight * nlines / 2.0;
    text.selectAll('tspan').attr('y', `${- yShift + TSPAN_ABSOLUTE_Y_SHIFT}em`);
  });
}

function shouldShowLabel(e: Edge) {
  return getEdgeName(e);
}

/**
 * if p1 and p2 are 2 element vectors and t in [0,1], computes
 * t * (p1) + (1-t) * (p2)
 */
function bezierBlend(p1 : number[], p2 : number[], t : number) {
  const x = t * p1[0] + (1-t) * p2[0];
  const y = t * p1[1] + (1-t) * p2[1];
  return [x, y];
}

/**
 *  Boolean indication of if a node is a routing node.
 *
 *  requirements - AutoAdvance and no Prompt
 */
function isRoutingNode(d: Node): boolean {
  return !!d.autoAdvance && d.prompt.length === 0;
}

function getIntercept(n: Node, other: Node): number[] {
  const src = n as d3.SimulationNodeDatum;
  const trg = other as d3.SimulationNodeDatum;

  const deltaX = trg.fx! - src.fx!;
  const deltaY = trg.fy! - src.fy!;
  const slope = deltaY / deltaX;

  const halfHeight = isRoutingNode(n) ? R_HALF_NODE_SZ : HALF_NODE_HEIGHT;
  const halfWidth = isRoutingNode(n) ? R_HALF_NODE_SZ : HALF_NODE_WIDTH;

  const topIntercept = -halfHeight / slope;
  if (topIntercept > -halfWidth &&
      topIntercept < halfWidth) {  // Intercept is on the top or bottom
    if (deltaY > 0) {              // on top
      return [src.fx! - topIntercept, src.fy! + halfHeight];
    } else {  // on bottom
      return [src.fx! + topIntercept, src.fy! - halfHeight];
    }
  } else {  // Intercept is on the side
    const sideIntercept = -halfWidth * slope;
    if (deltaX > 0) {  // left
      return [src.fx! + halfWidth, src.fy! - sideIntercept];
    } else {  // right
      return [src.fx! - halfWidth, src.fy! + sideIntercept];
    }
  }
}
