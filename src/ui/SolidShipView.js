import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// A single shared WebGL context serves the selected ship, never one context per
// hangar card. Each visible Pixi view owns only its model and canvas texture.
let renderer, environment;
let resident = 0;
function getRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    environment = pmrem.fromScene(room, .04).texture;
    room.dispose(); pmrem.dispose();
  }
  return renderer;
}
function disposeModel(model) {
  const geometries = new Set(), materials = new Set();
  model?.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [].concat(object.material || [])) materials.add(material);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}
export class SolidShipView {
  constructor(index, size) {
    this.size = size;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-3, 3, 3, -3, .1, 100);
    this.camera.position.set(4.5, 6, -7); this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.HemisphereLight(0xcceeff, 0x24313c, .35));
    for (const [color, intensity, position] of [[0xd9f0ff, 3.2, [-4,7,-3]], [0xffbd79, 1.8, [5,2,3]], [0x59ccff, 1, [-4,1,4]]]) {
      const light = new THREE.DirectionalLight(color, intensity); light.position.set(...position); this.scene.add(light);
      if (color === 0xd9f0ff) {
        light.castShadow = true; light.shadow.mapSize.set(2048,2048);
        Object.assign(light.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.1,far:30});
        light.shadow.bias = -.0001; light.shadow.normalBias = .015;
      }
    }
    this.promise = new GLTFLoader().loadAsync(`/art/solid-fleet-20260908/${String(index+1).padStart(2,'0')}.glb`).then(gltf => {
      if (this.disposed) { disposeModel(gltf.scene); return; }
      getRenderer(); this.scene.environment = environment; this.scene.environmentIntensity = .3;
      this.model = gltf.scene;
      this.model.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});
      const box = new THREE.Box3().setFromObject(this.model), center = box.getCenter(new THREE.Vector3());
      this.model.position.sub(center);
      this.pivot = new THREE.Group(); this.pivot.add(this.model); this.scene.add(this.pivot);
      const dimensions = box.getSize(new THREE.Vector3());
      const radius = Math.sqrt(dimensions.x ** 2 + dimensions.z ** 2) * .52;
      this.camera.left = this.camera.bottom = -radius;
      this.camera.right = this.camera.top = radius;
      this.camera.updateProjectionMatrix();
      resident++; this.ready = true;
    });
  }
  render(angle, pitch=0) {
    if (!this.ready || this.disposed) return false;
    const r = getRenderer();
    if (r.domElement.width !== this.size) r.setSize(this.size, this.size, false);
    this.pivot.rotation.y = angle;
    this.pivot.rotation.x = pitch;
    r.render(this.scene, this.camera);
    this.ctx.clearRect(0,0,this.size,this.size);
    this.ctx.drawImage(r.domElement,0,0);
    return true;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.ready) resident--;
    disposeModel(this.model);
    this.scene.traverse(object=>object.shadow?.dispose());
    this.scene.clear();
    this.canvas.width = this.canvas.height = 1;
  }
  static get resident() { return resident; }
}
