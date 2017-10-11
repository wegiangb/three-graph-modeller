///<reference path="graph-renderer.component.ts"/>
import * as THREE from 'three';

import {GraphModel} from '../graph-model/graph-model';
import {AutoGraphLayouter, VertexRenderer} from './graph-renderer.api';
import {Vertex} from '../graph-model/vertex';
import {Edge} from '../graph-model/edge';
import {GraphControl} from "../graph-control-component/graph-control";
import {Font} from "../../../types/three/three-core";

import '../js/EnableThreeJs.js';
import {extend, RenderedEdge, RenderedVertex, RenderObjectController} from "./rendered-object";

/**
 * Created by Andreas Hilbig on 11.09.2017.
 */

export class CircleAutoGraphRenderer implements AutoGraphLayouter {

  private vertexRenderer: ThreeAutoVertexFromTypeRenderer = new ThreeAutoVertexFromTypeRenderer();

  private _scene: THREE.Scene;
  private _defaultObjectSize: number;
  private rotationSpeedX = 0;
  private rotationSpeedY = 0;
  private _graphModel: GraphModel;
  private graphControl: GraphControl;
  private _font: THREE.Font;


  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private clientWidth: number;
  private clientHeight: number;

  constructor(defaultObjectSize: number, rotationSpeedX: number, rotationSpeedY: number, font?: Font, graphModel?: GraphModel) {
    this._defaultObjectSize = defaultObjectSize;
    this.rotationSpeedX = rotationSpeedX;
    this.rotationSpeedY = rotationSpeedY;
    this._graphModel = graphModel;
    this.graphControl = new GraphControl(this.graphModel);
    this.font = font;
  }


  set font(value: THREE.Font) {
    this._font = value;
    this.vertexRenderer.font = value;
  }

  /**
   * Create the scene
   */
  createScene(fieldOfView, clientWidth, clientHeight, nearClippingPane, farClippingPane, cameraZ) {
    /* Scene */
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xcce0ff, 0.0003);
    this.clientWidth = clientWidth;
    this.clientHeight = clientHeight

    /* Camera */
    this.camera = new THREE.PerspectiveCamera(
      fieldOfView,
      this.getAspectRatio(),
      nearClippingPane,
      farClippingPane
    );
    this.camera.position.z = cameraZ;

    //this.createOrbitControls();
    // Add lights
    this.scene.add(new THREE.AmbientLight(0x444444));
    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(200, 200, 1000).normalize();

    const light = new THREE.SpotLight(0xffffff, 1.5);
    light.position.set(0, 500, 2000);
    light.castShadow = true;
    light.shadow = new THREE.SpotLightShadow(new THREE.PerspectiveCamera(50, 1, 200, 10000));
    light.shadow.bias = -0.00022;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;


    this.scene.add(light);
    this.camera.add(dirLight);
    this.camera.add(dirLight.target);
  }

  /**
   * Start the rendering loop
   */
  startRenderingLoop() {
    const component: CircleAutoGraphRenderer = this;
    (function render() {
      requestAnimationFrame(render);
      component.animateObjects();
      component.renderer.render(component.scene, component.camera);
    }());
  }

  get graphModel(): GraphModel {
    return this._graphModel;
  }

  set graphModel(value: GraphModel) {
    this._graphModel = value;
    if (this.graphControl) {
      this.graphControl.graphModel = value;
    }
  }

  get defaultObjectSize(): number {
    return this._defaultObjectSize;
  }

  set defaultObjectSize(value: number) {
    this._defaultObjectSize = value;
  }

  get scene(): THREE.Scene {
    return this._scene;
  }

  set scene(value: THREE.Scene) {
    this._scene = value;
  }

  autoLayout() {
    const r = 100;
    const n = this._graphModel.vertexCount;
    const alpha = 2 * Math.PI / (n);
    const z = 0;
    let x, y;

    // Render vertexes
    let i = 0;
    for (let id in this._graphModel.vertexes) {
      const vertex = <RenderedVertex> this._graphModel.vertexes[id];
      if (vertex.isObject3D()) {
        x = r * Math.sin(alpha * i);
        y = r * Math.cos(alpha * i);

        console.log('Vertex vid=' + id + ', name=' + vertex.vname + ', vtype=' + vertex.vtype + ' added at alpha=' + alpha * i + ',  position={' + x + ',' + y + ',' + z + '}.');
        this.setObject3DPosition(vertex, {x, y, z});
      } else {
        console.log('Can\'t render Vertex vid=' + id);
      }
      i++;
    }
    this.autoLayoutEdges();
  }

  autoLayoutEdges() {
    for (let i = 0; i < this._graphModel.edges.length; i++) {
      this.autoLayoutEdge(this._graphModel.edges[i]);
    }
  }

  autoLayoutRemovedVertex(vertex: Vertex) {
    this.autoLayout();
  }

  autoLayoutRemovedEdge(edge: Edge) {
    this.autoLayout();
  }

  autoLayoutAddedVertex(vertex: RenderedVertex) {
    this.autoLayout();
  }

  addRenderedVertexToGraph(vertex: Vertex | RenderedVertex, position ?: THREE.Vector3): RenderedVertex {
    var renderedVertex;
    if (vertex.isObject3D()) {
      renderedVertex = vertex;
      if (position) {
        this.setObject3DPosition(vertex, position);
      }
    }
    else {
      renderedVertex = this.vertexRenderer.createVertexRenderingMixin(vertex, this._font, position);
    }
    var vid = vertex.vid;
    if (!this._graphModel.vertexes[vid]) {
      this._graphModel.vertexes[vid] = renderedVertex;
      this.graphControl.addVertexControls(renderedVertex);
      this.scene.add(renderedVertex);
    }

    return renderedVertex;
  }

  cloneRenderedVertex(vertex: RenderedVertex): Vertex {
    var oldId = vertex.vid;
    var newId = this.generateCloneId(oldId);
    const cloneIndex = parseInt(newId.split("-c")[1]);
    var nameCore = cloneIndex > 1 ? vertex.vname.split("Clone " + (cloneIndex - 1) + " of ")[1] : vertex.vname;


    console.log("Cloning vertex with id=" + oldId + ", cloned id=" + newId);
    var clonedVertex = new Vertex(newId, "Clone " + cloneIndex + " of " + (nameCore ? nameCore : vertex.vname), vertex.vtype);
    var clonedRenderedVertex: THREE.Object3D = extend((<THREE.Object3D> vertex).clone(), clonedVertex);

    this.vertexRenderer.setVertexInfoName(clonedRenderedVertex)

    this.addRenderedVertexToGraph(clonedRenderedVertex);
    this.graphControl.updateDragControls(this.camera, this.renderer.domElement);
    return clonedRenderedVertex
  }

  generateCloneId(vid: string): string {
    // Use -c seperator to split original id from clone index (if id is not id of a clone then the resulting array will have length 1)
    var splitId = vid.split('-c');
    var newCloneIndex = splitId.length == 1 ? 1 : parseInt(splitId[1]) + 1;

    var candidateId = splitId[0] + '-c' + newCloneIndex;

    // Return candidate Id if not exists, otherwise calculate next available clone id recursively
    return this.graphModel.vertexes[candidateId] ? this.generateCloneId(candidateId) : candidateId;
  }

  addRenderedEdgeToGraph(edge: Edge | RenderedEdge) {
    if (edge.isObject3D()) {
      return edge;
    }
    else {
      const fromVertex3D: RenderedVertex = this._graphModel.getFromVertex(edge);
      const toVertex3D: RenderedVertex = this._graphModel.getToVertex(edge);
      var renderedEdge = this.vertexRenderer.createEdgeRenderingMixin(edge, fromVertex3D, toVertex3D);
      this._graphModel.edges.push(renderedEdge);
      this.scene.add(renderedEdge);
      return renderedEdge;
    }
  }

  private setObject3DPosition(obj: THREE.Object3D, position: THREE.Vector3) {
    obj.position.set(position.x, position.y, position.z);
  }

  autoRenderMoveVertex(graphModel: GraphModel, index: number) {
    this.autoLayout();
  }

  autoLayoutEdge(edge: Edge, moveVertexes?: boolean) {
    const fromVertex3D: RenderedVertex = this._graphModel.getFromVertex(edge);
    const toVertex3D: RenderedVertex = this._graphModel.getToVertex(edge);

    if (fromVertex3D && toVertex3D) {
      this.vertexRenderer.updateLineGeometry(<THREE.Line> edge, fromVertex3D.position, toVertex3D.position);
    } else {
      console.log("Unable to render edge from vertex " + this._graphModel.getFromVertex(edge).vid + " to vertex " + this._graphModel.getToVertex(edge).vid + ", missing renderingInfo.");
    }

  }

  animateObjects() {
    if (this.rotationSpeedX > 0 || this.rotationSpeedY > 0) {
      var vertexes = this._graphModel.vertexes;
      for (let id in vertexes) {
        (<THREE.Object3D> vertexes[id]).rotation.x += this.rotationSpeedX;
        (<THREE.Object3D> vertexes[id]).rotation.y += this.rotationSpeedY;
      }
    }
    /*for (var i = 0; i < this.textlabels.length; i++) {
      this.textlabels[i].updatePosition();
    }*/

  }
  createControls() {
    this.graphControl.createDragControls(this.camera, this.renderer.domElement);
    this.graphControl.createOrbitControls(this.camera);
  }

  /**
   * Update scene after resizing.
   */
  public setSceneSize(clientWidth: number, clientHeight: number) {
    this.clientWidth = clientWidth;
    this.clientHeight = clientHeight;
    this.camera.aspect = this.getAspectRatio();
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(clientWidth, clientHeight);
  }

  private getAspectRatio() {
    return this.clientWidth / this.clientHeight;
  }

  public createWebGLRenderer(canvas: HTMLCanvasElement) {
    /* Renderer */
    // Use canvas element in template
    this.renderer = new THREE.WebGLRenderer({canvas: canvas});
    this.renderer.setPixelRatio(devicePixelRatio);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    this.renderer.setClearColor(this.scene.fog.color);
    RenderObjectController.setupDomEvents(this.camera, this.renderer.domElement);

    console.log('renderer width=" + this.renderer.getSize().width + ", height=' + this.renderer.getSize().height);
  }
}

export class ThreeAutoVertexFromTypeRenderer implements VertexRenderer {

  _textures = ['/assets/textures/vertex_POS_Box.gif', '/assets/textures/vertex_BILLING_Box.gif', '/assets/textures/crate.gif'];

  extrudeSettings = {amount: 8, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1};
  private defaultObjectSize;
  font: THREE.Font;

  constructor(defaultObjectSize?: number, font?: THREE.Font) {
    this.defaultObjectSize = defaultObjectSize ? defaultObjectSize : 20;
    this.font = font;
  }

  createVertexRenderingMixin(vertex: Vertex, font?: Font, position ?: THREE.Vector3): RenderedVertex {
    let mesh;
    switch (vertex.vtype) {
      case 'PERSON':
        mesh = this.createSmileyShapeMesh(0xf000f0, this.defaultObjectSize, position);
        break;
      case 'POS':
        mesh = this.createCube(this._textures[0], this.defaultObjectSize, position);
        break;
      case 'BILLING':
        mesh = this.createCube(this._textures[1], this.defaultObjectSize, position);
        break;
      default:
        mesh = this.createCube(this._textures[2], this.defaultObjectSize, position);
    }
    mesh.geometry.center();

    var ret = extend(mesh, vertex);
    if (font) {
      this.setVertexInfoName(ret);
      ret.addLabel("This is an additional information added as child mesh by using a canvas content for creating a texture.");
    }
    return ret;
  }


  setVertexInfoName(vertex: RenderedVertex): THREE.Object3D {
    return this.setVertexInfo(vertex, "vertexName", vertex.vname);
  }

  private setVertexInfo(vertex: RenderedVertex, name: string, text: string): THREE.Object3D {
    const charSize = 7;
    const charHeight = 1;
    const width = charSize * vertex.vname.length * 0.9;
    var existingInfo = vertex.getObjectByName(name);
    if (existingInfo) {
      vertex.remove(existingInfo);
    }
    var newInfo: THREE.Object3D = this.createTextCube(vertex.vname,
      {
        font: this.font,
        height: charHeight,
        size: charSize
      }, name);

    var scaleY = vertex.scale.y;
    newInfo.position.setY(-scaleY*(this.defaultObjectSize / 2 + 1.5*charSize));
    vertex.add(newInfo);
    return newInfo;
  }

  calcBoundingSphereRadius(obj: THREE.Object3D) {
    var boundingBoxHelper = new THREE.BoxHelper(obj);
    return boundingBoxHelper.geometry.boundingSphere.radius;
  }

  createEdgeRenderingMixin(edge: Edge, fromVertex3D: THREE.Object3D, toVertex3D: THREE.Object3D): RenderedEdge {
    if (fromVertex3D && toVertex3D) {
      return extend(this.createLine(fromVertex3D.position, toVertex3D.position), edge);
    } else {
      console.log("Unable to render edge from vertex " + fromVertex3D ? fromVertex3D.id : '?' + " to vertex " + toVertex3D ? toVertex3D.id : '?' + ".");
    }

  }

  private createCube(texturePath: string, geometrySize: number, position ?: THREE.Vector3) {
    const texture = new THREE.TextureLoader().load(texturePath);
    const material = new THREE.MeshBasicMaterial({map: texture});

    const geometry = new THREE.BoxGeometry(geometrySize, geometrySize, geometrySize);

    const newCube = new THREE.Mesh(geometry, material);
    if (position) {
      newCube.position.copy(position);
    }

    return newCube;
  }

  private createTextCube(text: string, textGeometryParameters: THREE.TextGeometryParameters, name?: string, position ?: THREE.Vector3): THREE.Object3D {
    const material = new THREE.MeshBasicMaterial();

    const geometry = new THREE.TextGeometry(text, textGeometryParameters);
    geometry.center()

    const newCube = new THREE.Mesh(geometry, material);
    if (position) {
      newCube.position.copy(position);
    }
    if (name) {
      newCube.name = name;
    }

    return newCube;
  }

  createSmileyShapeMesh(color, size: number, position ?: THREE.Vector3): THREE.Mesh {
    const smileyShape = new THREE.Shape();
    smileyShape.moveTo(80, 40);
    smileyShape.absarc(40, 40, 40, 0, Math.PI * 2, false);
    const smileyEye1Path = new THREE.Path();
    smileyEye1Path.moveTo(35, 20);
    smileyEye1Path.absellipse(25, 20, 10, 10, 0, Math.PI * 2, true);
    smileyShape.holes.push(smileyEye1Path);
    const smileyEye2Path = new THREE.Path();
    smileyEye2Path.moveTo(65, 20);
    smileyEye2Path.absarc(55, 20, 10, 0, Math.PI * 2, true);
    smileyShape.holes.push(smileyEye2Path);
    const smileyMouthPath = new THREE.Path();
    smileyMouthPath.moveTo(20, 40);
    smileyMouthPath.quadraticCurveTo(40, 60, 60, 40);
    smileyMouthPath.bezierCurveTo(70, 45, 70, 50, 60, 60);
    smileyMouthPath.quadraticCurveTo(40, 80, 20, 60);
    smileyMouthPath.quadraticCurveTo(5, 50, 20, 40);
    smileyShape.holes.push(smileyMouthPath);

    return this.addShape(
      smileyShape, this.extrudeSettings, color,
      position ? position : new THREE.Vector3(-200, 250, 0),
      0, 0, Math.PI, this.defaultObjectSize / 80);
  }

  createLine(pos1: THREE.Vector3, pos2: THREE.Vector3): THREE.Line {
    //create a blue LineBasicMaterial
    let material = new THREE.LineBasicMaterial({color: 0x0000ff});
    var geometry = new THREE.Geometry();
    geometry.vertices.push(pos1);
    geometry.vertices.push(pos2);

    return new THREE.Line(geometry, material);

  }

  updateLineGeometry(line: THREE.Line, pos1: THREE.Vector3, pos2: THREE.Vector3): THREE.Line {
    line.geometry.vertices[0] = pos1;
    line.geometry.vertices[1] = pos2;
    line.geometry.verticesNeedUpdate = true;
    return line;
  }

  addShape(shape: THREE.Shape, extrudeSettings, color, position: THREE.Vector3, rx, ry, rz, s) {
    // note: default UVs generated by ShapeBufferGeometry are simply the x- and y-coordinates of the vertices
    // extruded shape
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mesh: THREE.Mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color: color}));
    mesh.position.set(position.x, position.y, position.z);
    mesh.rotation.set(rx, ry, rz);
    mesh.scale.set(s, s, s);
    return mesh;
  }
}

