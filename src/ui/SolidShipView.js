import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// A single shared WebGL context serves the selected ship, never one context per
// hangar card. Each visible Pixi view owns only its model and canvas texture.
let renderer, environment, showcaseEnvironment;
let resident = 0;
function getRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    // Three r185's normal-incidence GGX sampler subtracts sin/cos squares.
    // Use their exact radius identity to avoid ANGLE constant-fold precision
    // warnings at cardinal samples. This changes no sampling distribution.
    const applyPMREM = pmrem._applyPMREM.bind(pmrem);
    pmrem._applyPMREM = (...args) => {
      pmrem._ggxMaterial.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace(
          'sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2))',
          'sqrt(max(0.0, 1.0 - Xi.x))'
        ).replace(
          't2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;',
          '// Normal-incidence PMREM call has V.z = 1, hence s = 1 and t2 is unchanged.'
        );
      };
      return applyPMREM(...args);
    };
    environment = pmrem.fromScene(room, .04).texture;
    // A darker hangar reflection field for the close-up Sparrow only. The
    // warm opening and cool ceiling strips are scene lighting, never albedo.
    const hangar = new THREE.Scene();
    const panels = [
      [0x17232c, 1, [0,0,0], [18,12,18], true],
      [0xffcb97, 3.5, [7,2,5], [1,7,7], false],
      [0xb7d5e6, 1.8, [-3,5,0], [1.2,.1,12], false],
      [0x7898ad, .65, [-7,1,-1], [.1,5,9], false]
    ];
    for (const [color, strength, position, dimensions, inside] of panels) {
      const material = new THREE.MeshBasicMaterial({color, side:inside?THREE.BackSide:THREE.FrontSide});
      material.color.multiplyScalar(strength);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material);
      mesh.position.set(...position);hangar.add(mesh);
    }
    showcaseEnvironment = pmrem.fromScene(hangar, .02).texture;
    hangar.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
    room.dispose(); pmrem.dispose();
  }
  return renderer;
}
function disposeModel(model) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  model?.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [].concat(object.material || [])) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  textures.forEach(texture => { texture.source?.data?.close?.(); texture.dispose(); });
}
export class SolidShipView {
  constructor(index, size, presentation='menu') {
    this.size = size;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-3, 3, 3, -3, .1, 100);
    this.camera.position.set(4.5, 6, -7); this.camera.lookAt(0, 0, 0);
    const showcase = true;
    this.scene.add(new THREE.HemisphereLight(0xcceeff, 0x24313c, showcase ? .24 : .28));
    const lights = showcase
      ? [[0xd9f0ff,.70,[-4,7,-3]],[0xffc38b,1.9,[presentation==='hangar'?-5:5,4,3]],[0x8bbbd2,.30,[-4,1,4]]]
      : [[0xd9f0ff, .95, [-4,7,-3]], [0xffbd79, 2.3, [5,4,3]], [0x59ccff, .45, [-4,1,4]]];
    for (const [color, intensity, position] of lights) {
      const light = new THREE.DirectionalLight(color, intensity); light.position.set(...position); this.scene.add(light);
      if (color === 0xd9f0ff) {
        light.castShadow = true; light.shadow.mapSize.set(2048,2048);
        Object.assign(light.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.1,far:30});
        light.shadow.bias = -.0001; light.shadow.normalBias = .015;
      }
    }
    const modelUrl = `/art/fleet-showcase/${String(index+1).padStart(2,'0')}.glb`;
    this.promise = new GLTFLoader().loadAsync(modelUrl).then(async gltf => {
      if (this.disposed) { disposeModel(gltf.scene); return; }
      getRenderer(); this.scene.environment = showcase ? showcaseEnvironment : environment; this.scene.environmentIntensity = showcase ? .40 : .16;
      if(showcase && presentation==='hangar')this.scene.environmentRotation.y=-Math.PI/2;
      this.model = gltf.scene;
      this.model.traverse(object=>{if(object.isMesh){
        const glazing=[].concat(object.material||[]).some(m=>m.transparent && m.opacity<1);
        // Glazing needs a readable reflection over the cabin interior. Keep this
        // material-specific; painted armor retains the restrained hangar response.
        if(glazing)for(const material of [].concat(object.material||[]))material.envMapIntensity=2.2;
        object.castShadow=!glazing;object.receiveShadow=!glazing;
        {
          // Fleet surfaces are opaque. An owned depth material avoids
          // retaining an albedo sampler in Three's shared shadow material when
          // the next untextured fleet model is selected.
          this.depthMaterial ||= new THREE.MeshDepthMaterial();
          object.customDepthMaterial = this.depthMaterial;
          object.onBeforeShadow = (_renderer, _object, _camera, _shadowCamera, _geometry, depth) => { depth.map = null; };
        }
      }});
      const box = new THREE.Box3().setFromObject(this.model), center = box.getCenter(new THREE.Vector3());
      this.model.position.sub(center);
      this.pivot = new THREE.Group(); this.pivot.add(this.model); this.scene.add(this.pivot);
      const dimensions = box.getSize(new THREE.Vector3());
      const radius = Math.sqrt(dimensions.x ** 2 + dimensions.z ** 2) * .52;
      this.camera.left = this.camera.bottom = -radius;
      this.camera.right = this.camera.top = radius;
      this.camera.updateProjectionMatrix();
      // Compile material programs before the first visible frame. Supported
      // drivers poll parallel shader compilation instead of blocking the UI.
      await getRenderer().compileAsync(this.scene, this.camera);
      if (this.disposed) return;
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
    this.depthMaterial?.dispose();
    this.scene.traverse(object=>object.shadow?.dispose());
    this.scene.clear();
    this.canvas.width = this.canvas.height = 1;
  }
  static get resident() { return resident; }
  static get diagnostics() {
    return { resident, geometries: renderer?.info.memory.geometries || 0, textures: renderer?.info.memory.textures || 0,
      calls: renderer?.info.render.calls || 0, triangles: renderer?.info.render.triangles || 0 };
  }
}
