import {AfterViewInit, Component, OnInit, ViewChild, ElementRef, Input, HostListener} from '@angular/core';
import {EnterpriseModelInitialDataLoader, GraphModel} from '../graph-model/graph-model';
import * as THREE from 'three';
import {CircleAutoGraphRenderer} from './three-graph-renderer';

@Component({
  selector: 'app-graph-renderer',
  templateUrl: './graph-renderer.component.html',
  styleUrls: ['./graph-renderer.component.css']
})
export class GraphRendererComponent implements AfterViewInit {
  /* HELPER PROPERTIES (PRIVATE PROPERTIES) */
  private camera: THREE.PerspectiveCamera;
  public controls: THREE.OrbitControls;
  @Input()
  public rotationSpeedX = 0.005;
  @Input()
  public rotationSpeedY = 0.01;
  private graphModel: GraphModel;

  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  @ViewChild('canvas')
  private canvasRef: ElementRef;

  private objects: THREE.Object3D[];

  private renderer: THREE.WebGLRenderer;

  private scene: THREE.Scene;

  private graphRenderer: CircleAutoGraphRenderer;

  /* STAGE PROPERTIES */
  @Input()
  public defaultObjectSize = 200;

  @Input()
  public cameraZ = 400;

  @Input()
  public fieldOfView = 70;

  @Input('nearClipping')
  public nearClippingPane = 1;

  @Input('farClipping')
  public farClippingPane = 1000;


  /* DEPENDENCY INJECTION (CONSTRUCTOR) */
  constructor() {
  }

  /* STAGING, ANIMATION, AND RENDERING */

  /**
   * Animate the objects
   */
  private animateObjects() {
    if (this.objects) {
      for (let i = 0; i < this.objects.length; i++) {
          this.objects[i].rotation.x += this.rotationSpeedX;
        this.objects[i].rotation.y += this.rotationSpeedY;
      }
    }
  }

  /**
   * Create the scene
   */
  private createScene() {
    /* Scene */
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xcce0ff, 0.0003);

    /* Camera */
    const aspectRatio = this.getAspectRatio();
    this.camera = new THREE.PerspectiveCamera(
      this.fieldOfView,
      aspectRatio,
      this.nearClippingPane,
      this.farClippingPane
    );
    this.camera.position.z = this.cameraZ;

    // Prepare Orbit controls
    this.controls = new THREE.OrbitControls(this.camera);
    this.controls.target = new THREE.Vector3(0, 0, 0);
    this.controls.maxDistance = 150;
    // How far you can orbit vertically, upper and lower limits.
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;
    // How far you can dolly in and out ( PerspectiveCamera only )
    this.controls.minDistance = 0;
    this.controls.maxDistance = Infinity;

    this.controls.enableZoom = true; // Set to false to disable zooming
    this.controls.zoomSpeed = 1.0;

    this.controls.enablePan = true; // Set to false to disable panning (ie vertical and horizontal translations)

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

  private getAspectRatio() {
    return this.canvas.clientWidth / this.canvas.clientHeight;
  }

  /**
   * Start the rendering loop
   */
  private startRenderingLoop() {
    /* Renderer */
    // Use canvas element in template
    this.renderer = new THREE.WebGLRenderer({canvas: this.canvas});
    this.renderer.setPixelRatio(devicePixelRatio);
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

    this.renderer.setClearColor(this.scene.fog.color);
    console.log('renderer width=%d, height=%d', this.renderer.getSize().width, this.renderer.getSize().height);
    this.createControls();

    const component: GraphRendererComponent = this;
    (function render() {
      requestAnimationFrame(render);
      component.animateObjects();
      component.renderer.render(component.scene, component.camera);
    }());
  }


  /* EVENTS */

  /**
   * Update scene after resizing.
   */
  public onResize() {
    this.camera.aspect = this.getAspectRatio();
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
  }

  @HostListener('document:keyup', ['$event'])
  onKeyUp(ev: KeyboardEvent) {
    // do something meaningful with it
    console.log(`The user just pressed ${ev.key}!`);
  }


  /* LIFECYCLE */

  /**
   * We need to wait until template is bound to DOM, as we need the view
   * dimensions to create the scene. We could create the cube in a Init hook,
   * but we would be unable to add it to the scene until now.
   */
  public ngAfterViewInit() {
    this.createScene();

    this.graphRenderer = new CircleAutoGraphRenderer(this.scene, this.defaultObjectSize);
    this.graphModel = new EnterpriseModelInitialDataLoader().loadGraphModel();
    this.graphRenderer.autoRender(this.graphModel);
    this.objects = this.graphRenderer.meshObjects;
    this.startRenderingLoop();
  }

  private createControls() {
    const dragControls = new THREE.DragControls(this.objects, this.camera, this.renderer.domElement);
    const component: GraphRendererComponent = this;

    dragControls.addEventListener('dragstart', function (event) {
      component.controls.enabled = false;
    });
    dragControls.addEventListener('dragend', function (event) {
      component.controls.enabled = true;
    });
  }
}
