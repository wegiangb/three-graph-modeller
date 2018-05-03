import {Vertex} from './vertex';
import {Edge} from './edge';
import {AutoGraphLayouter} from "../graph-renderer/graph-renderer.api";
import {RenderedEdge, RenderedVertex} from "../graph-renderer/rendered-object";
import {IDictionary} from "../../../lib/util";

export class Graph {
  constructor(graphRenderer?: AutoGraphLayouter) {
    this.graphRenderer = graphRenderer;
  }

  initialize(vertexes: Vertex[], edges: Edge[], metadata: { name: string }) {
    this._metadata = metadata;
    this.autoLayoutEnabled = false;
    this.initializeVertexArray(vertexes);
    this.initializeEdges(edges);
    this.graphRenderer.autoLayout();
    this.autoLayoutEnabled = true;
  }

  private _vertexes: IDictionary<RenderedVertex> = {};
  private _edges: RenderedEdge[] = [];

  private _metadata;
  private _vertexCount = 0;

  graphRenderer: AutoGraphLayouter;
  private autoLayoutEnabled = true;

  private initializeVertexArray(vertexes: Vertex[]) {
    for (let vertex of vertexes) {
      this.addVertex(vertex);
    }
  }

  private initializeEdges(edges: Edge[]) {
    for (let edge of edges) {
      this.addEdge(edge);
    }
  }

  get metadata() {
    return this._metadata;
  }

  set metadata(value) {
    this._metadata = value;
  }

  get vertexes(): IDictionary<RenderedVertex> {
    return this._vertexes;
  }

  get edges(): RenderedEdge[] {
    return this._edges;
  }

  set edges(value: RenderedEdge[]) {
    this._edges = value;
  }

  findVertexById(id) {
    return this._vertexes[id];
  }

  getFromVertex(edge: Edge): Vertex {
    return edge.vertexFromId ? this._vertexes[edge.vertexFromId] : null;
  }

  getToVertex(edge: Edge): Vertex {
    return edge.vertexToId ? this._vertexes[edge.vertexToId] : null;
  }

  addVertex(vertex: Vertex) {
    let id = vertex.vid;
    if (!this._vertexes[id]) {
      this._vertexCount++;
    }

    this.graphRenderer.addRenderedVertexToGraph(vertex);

    if (this.autoLayoutEnabled) {
      this.graphRenderer.autoLayoutAddedVertex(vertex);
    }
  }

  cloneVertex(vid: string): Vertex {
    var clonedVertex = this.graphRenderer.cloneRenderedVertex(this.vertexes[vid]);
    if (clonedVertex) {
      this._vertexCount++;
      if (this.autoLayoutEnabled) {
        this.graphRenderer.autoLayoutAddedVertex(clonedVertex);
      }
    }
    return clonedVertex
  }

  addEdge(edge: Edge) {
    this.graphRenderer.addRenderedEdgeToGraph(edge);

    if (this.autoLayoutEnabled) {
      this.graphRenderer.autoLayoutEdge(edge);
    }
  }

  removeVertex(id) {
    if (this._vertexes[id]) {
      if (this.autoLayoutEnabled) {
        this.graphRenderer.autoLayoutRemovedVertex(this._vertexes[id]);
      }
      delete this._vertexes[id];
      this._vertexCount--;
    }
  }

  get vertexCount() {
    return this._vertexCount
  }

  getVertexArray() {
    var arr = [];
    for (let id in this.vertexes) {
      arr.push(this.vertexes[id]);
    }
    return arr;
  }
}
