import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {premiumTexture} from './PremiumArt.js';

const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
const TAU=Math.PI*2;
const fadeMaterials=(materials,opacity)=>{for(const m of materials){
  m.opacity=opacity;m.depthWrite=opacity>.8;
}};

function armourSurface(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const c=canvas.getContext('2d');c.fillStyle='#b4bec0';c.fillRect(0,0,256,256);
  let seed=7193;
  for(let i=0;i<12000;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed&255,y=(seed>>>8)&255;
    c.fillStyle=i%2?'rgba(255,255,255,.035)':'rgba(20,29,32,.045)';c.fillRect(x,y,1,1);
  }
  c.strokeStyle='#58666b';c.lineWidth=2;c.strokeRect(12,14,232,228);
  c.fillStyle='#879397';c.fillRect(20,24,76,6);c.fillRect(20,34,54,2);
  c.fillStyle='#33434a';for(let i=0;i<7;i++)c.fillRect(174,168+i*6,58,3);
  c.fillStyle='#d9dedd';for(const x of [21,235])for(const y of [23,234])c.fillRect(x-2,y-2,4,4);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}

function sectorGeometry(inner,outer,half,depth){
  const shape=new THREE.Shape();
  shape.moveTo(outer*Math.cos(-half),outer*Math.sin(-half));
  shape.absarc(0,0,outer,-half,half,false);
  shape.lineTo(inner*Math.cos(half),inner*Math.sin(half));
  shape.absarc(0,0,inner,half,-half,true);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.006,bevelThickness:.006,curveSegments:3});
  geometry.translate(-1,0,-depth/2);
  geometry.computeBoundingBox();
  const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv,box=geometry.boundingBox,size=box.getSize(new THREE.Vector3());
  for(let i=0;i<p.count;i++){
    const side=Math.abs(n.getZ(i))<.5;
    uv.setXY(i,(p.getY(i)-box.min.y)/size.y,side?(p.getZ(i)-box.min.z)/size.z:(p.getX(i)-box.min.x)/size.x);
  }
  return geometry;
}

// Render-only machinery. The combat model and projected target coordinates stay in Pixi.
export class PlanetfallFoundryView{
  constructor(){
    try{this.initialize();}catch(error){this.destroy();throw error;}
  }
  initialize(){
    this.canvas=document.createElement('canvas');this.context=this.canvas.getContext('2d',{alpha:true});
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
    this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.94;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-2,2,1,-1,.1,30);
    this.camera.position.z=12;this.camera.lookAt(0,0,0);
    this.station=new THREE.Group();this.scene.add(this.station);
    this.ring=new THREE.Group();this.station.add(this.ring);
    this.scene.add(new THREE.HemisphereLight(0xd8e9ee,0x253445,.55));
    for(const [color,intensity,x,y,z]of [[0xffedce,2.3,-3,4,6],[0xb0d8eb,.75,4,-1,3],[0xe9f5ff,1.4,0,-3,-4]]){
      const light=new THREE.DirectionalLight(color,intensity);light.position.set(x,y,z);this.scene.add(light);
      if(x===-3){light.castShadow=true;light.shadow.mapSize.set(1536,1536);
        Object.assign(light.shadow.camera,{left:-1.8,right:1.8,top:1.8,bottom:-1.8,near:.1,far:15});light.shadow.bias=-.0002;light.shadow.normalBias=.003;}
    }
    const room=this.room=new RoomEnvironment(),pmrem=this.pmrem=new THREE.PMREMGenerator(this.renderer);
    // Match the existing fleet renderer's r185 ANGLE precision correction.
    const apply=pmrem._applyPMREM.bind(pmrem);
    pmrem._applyPMREM=(...args)=>{
      pmrem._ggxMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader
        .replace('sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2))','sqrt(max(0.0, 1.0 - Xi.x))')
        .replace('t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;','// Normal incidence: s = 1, t2 unchanged.');};
      return apply(...args);
    };
    this.environment=pmrem.fromScene(room,.04);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.38;
    room.dispose();pmrem.dispose();this.room=null;this.pmrem=null;
    this.surface=armourSurface();
    const hull=premiumTexture('dreadnought');
    if(hull?.source.resource){
      this.hullSurface=new THREE.Texture(hull.source.resource);this.hullSurface.colorSpace=THREE.SRGBColorSpace;
      this.hullSurface.offset.set((hull.frame.x+300)/hull.source.width,1-(hull.frame.y+400)/hull.source.height);
      this.hullSurface.repeat.set(240/hull.source.width,190/hull.source.height);this.hullSurface.needsUpdate=true;
    }
    this.materials={
      armour:new THREE.MeshStandardMaterial({color:0xa9bec5,map:this.hullSurface||this.surface,metalness:.42,roughness:.57}),
      dark:new THREE.MeshStandardMaterial({color:0x28353d,map:this.surface,metalness:.52,roughness:.48}),
      steel:new THREE.MeshStandardMaterial({color:0x69818e,map:this.surface,metalness:.71,roughness:.34}),
      copper:new THREE.MeshStandardMaterial({color:0x9d764f,metalness:.65,roughness:.48}),
      energy:new THREE.MeshStandardMaterial({color:0x498c91,emissive:0x3aaaba,emissiveIntensity:1.25,metalness:.25,roughness:.32}),
      heat:new THREE.MeshStandardMaterial({color:0xee9b3f,emissive:0xff701b,emissiveIntensity:2,metalness:.12,roughness:.4})
    };
    this.box=new RoundedBoxGeometry(1,1,1,2,.065);
    this.cylinder=new THREE.CylinderGeometry(1,1,1,12,1);
    this.sectors=[];this.bridges=[];this.anchors=[];this.shutters=[];this.rotors=[];
    this.makeHull();this.makeBridges();this.makeReactor();this.makeAnchors();this.makeDetails();
    this.onContextLost=event=>{event.preventDefault();this.failed=true;};
    this.renderer.domElement.addEventListener('webglcontextlost',this.onContextLost);
    this.ready=true;
  }
  mesh(parent,geometry,material,position=[0,0,0],scale=[1,1,1]){
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.scale.set(...scale);mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  block(parent,material,x,y,z,w,h,d){return this.mesh(parent,this.box,material,[x,y,z],[w,h,d]);}
  disc(parent,material,radius,depth,z=0){
    const mesh=this.mesh(parent,this.cylinder,material,[0,0,z],[radius,depth,radius]);mesh.rotation.x=Math.PI/2;return mesh;
  }
  ownMaterials(group){
    const owned=new Map();group.traverse(object=>{if(!object.material)return;
      const source=object.material;if(!owned.has(source)){
        const material=source.clone();material.transparent=true;owned.set(source,material);
      }object.material=owned.get(source);
    });return [...owned.values()];
  }
  makeHull(){
    const hull=sectorGeometry(.87,1.07,Math.PI/32*.91,.12),skin=sectorGeometry(.89,1.055,Math.PI/32*.79,.035);
    const rail=sectorGeometry(.845,.873,Math.PI/32*.98,.07);
    for(let i=0;i<32;i++){
      const group=new THREE.Group(),quadrant=Math.floor(i/8),a=(i+.5)*TAU/32;this.ring.add(group);
      const armour=this.materials.armour.clone(),dark=this.materials.dark.clone(),steel=this.materials.steel.clone();
      // Fading must not compile a new shader in the middle of a breakup.
      for(const material of [armour,dark,steel])material.transparent=true;
      this.mesh(group,hull,dark).castShadow=true;this.mesh(group,skin,armour,[0,0,.075]);this.mesh(group,rail,steel,[0,0,.006]);
      const inset=this.block(group,this.materials.copper,-.016,0,.102,.065,.035,.018);
      if(i%4===1||i%4===2){inset.scale.y*=2;inset.position.x=.008;}
      this.block(group,dark,.025,0,.113,.052,.09,.026);
      this.block(group,this.materials.energy,.027,0,.129,.009,.064,.006);
      if(i%2===0)this.block(group,steel,.088,0,.002,.026,.084,.16);
      this.sectors.push({group,index:i,quadrant,a,materials:[armour,dark,steel]});
    }
  }
  makeBridges(){
    for(let q=0;q<4;q++){
      const group=new THREE.Group(),a=q*Math.PI/2+Math.PI/4;group.rotation.z=-a;this.ring.add(group);
      for(const side of [-1,1]){
        this.block(group,this.materials.dark,.55,side*.048,-.015,.66,.044,.092);
        this.block(group,this.materials.armour,.59,side*.064,.035,.52,.026,.035);
        this.block(group,this.materials.steel,.50,side*.044,.062,.47,.009,.012);
        for(let j=0;j<3;j++){
          const brace=this.block(group,this.materials.copper,.36+j*.16,side*.025,.03,.025,.067,.035);brace.rotation.z=side*.7;
        }
      }
      this.block(group,this.materials.dark,.78,0,.04,.12,.18,.09);
      this.block(group,this.materials.armour,.79,0,.098,.10,.12,.027);
      const carriage=this.block(group,this.materials.steel,.47,0,.07,.12,.09,.06);
      this.block(carriage,this.materials.energy,0,0,.55,.65,.12,.12);
      this.bridges.push({group,a,carriage,materials:this.ownMaterials(group)});
    }
  }
  makeReactor(){
    this.reactor=new THREE.Group();this.station.add(this.reactor);
    this.hub=new THREE.Group();this.reactor.add(this.hub);this.frameSections=[];
    this.disc(this.hub,this.materials.dark,.235,.105,-.045).castShadow=true;
    this.disc(this.hub,this.materials.copper,.204,.052,.018);
    this.disc(this.hub,this.materials.dark,.177,.083,.058);
    for(let i=0;i<8;i++){
      const a=i*TAU/8,frame=new THREE.Group();frame.rotation.z=a;this.reactor.add(frame);
      frame.position.set(Math.cos(a)*.145,Math.sin(a)*.145,0);
      this.block(frame,this.materials.armour,.060,0,.062,.11,.072,.12).castShadow=true;
      this.block(frame,this.materials.steel,.058,0,.13,.075,.014,.022);
      this.block(frame,this.materials.copper,.025,0,.06,.013,.071,.03);
      this.frameSections.push({group:frame,a,index:i,materials:this.ownMaterials(frame)});
    }
    this.plasmaMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0},strength:{value:1}},
      vertexShader:'varying vec3 p; varying vec3 n; void main(){p=position;n=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec3 p; varying vec3 n; uniform float time; uniform float strength;
      float hash(vec3 v){return fract(sin(dot(v,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 v){vec3 i=floor(v),f=fract(v);f=f*f*(3.-2.*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){vec3 v=p*65.+vec3(time*.4,-time*.7,time*.3);float f=noise(v)*.65+noise(v*2.1)*.25+noise(v*4.)*.10;
        float vein=pow(1.-abs(f*2.-1.),5.);float rim=pow(max(.0,n.z),.5);
        vec3 col=mix(vec3(.08,.025,.018),vec3(1.6,.38,.055),vein)*(.5+.5*rim);
        col+=vec3(1.,.68,.24)*pow(vein,8.)*.9;gl_FragColor=vec4(col*strength,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.plasma=this.mesh(this.reactor,new THREE.IcosahedronGeometry(.09,3),this.plasmaMaterial,[0,0,.12]);
    for(let layer=0;layer<2;layer++){
      const rotor=new THREE.Group();rotor.position.z=.095+layer*.02;this.hub.add(rotor);
      for(let i=0;i<8;i++){
        const a=i*TAU/8,fin=this.block(rotor,layer?this.materials.steel:this.materials.copper,Math.cos(a)*.127,Math.sin(a)*.127,0,.047,.013,.02);fin.rotation.z=a;
      }
      this.rotors.push(rotor);
    }
    this.hubMaterials=this.ownMaterials(this.hub);
    const blade=new THREE.Shape();blade.moveTo(-.045,-.034);blade.lineTo(.074,-.046);blade.lineTo(.10,.012);blade.lineTo(.016,.065);blade.lineTo(-.034,.028);blade.closePath();
    const geometry=new THREE.ExtrudeGeometry(blade,{depth:.03,steps:1,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:2});
    for(let i=0;i<8;i++){
      const group=new THREE.Group(),a=i*TAU/8;this.reactor.add(group);
      this.mesh(group,geometry,this.materials.armour);this.block(group,this.materials.dark,.02,0,.037,.065,.013,.012);
      this.shutters.push({group,a,index:i,materials:this.ownMaterials(group)});
    }
    this.coreLight=new THREE.PointLight(0xffb558,1.3,1.25,2);this.coreLight.position.z=.4;this.reactor.add(this.coreLight);
  }
  makeAnchors(){
    for(let q=0;q<4;q++){
      const group=new THREE.Group(),a=q*Math.PI/2+Math.PI/4;this.station.add(group);
      this.disc(group,this.materials.dark,.088,.09,-.025);
      this.disc(group,this.materials.steel,.067,.04,.037);
      const inner=new THREE.Group();group.add(inner);
      this.disc(inner,this.materials.energy,.037,.035,.063);
      for(const side of [-1,1]){
        this.block(group,this.materials.armour,side*.065,0,.06,.041,.14,.09);
        this.block(group,this.materials.copper,side*.068,.01,.108,.014,.068,.016);
        this.block(group,this.materials.dark,0,side*.068,.055,.07,.035,.08);
      }
      const barrel=this.block(inner,this.materials.dark,0,-.018,.102,.028,.07,.045);
      this.block(barrel,this.materials.steel,0,-.48,.10,.5,.1,.8);
      this.anchors.push({group,inner,barrel,a,q});
    }
  }
  makeDetails(){
    this.detailMatrix=new THREE.Matrix4();this.detailRows=[];
    const bolt=new THREE.CylinderGeometry(1,1,1,6),vent=new THREE.BoxGeometry(1,1,1);
    this.bolts=new THREE.InstancedMesh(bolt,this.materials.steel,256);
    this.vents=new THREE.InstancedMesh(vent,this.materials.dark,128);
    for(const mesh of [this.bolts,this.vents]){mesh.frustumCulled=false;mesh.receiveShadow=true;this.ring.add(mesh);}
    const pose=new THREE.Object3D();let b=0,v=0;
    for(const piece of this.sectors){
      for(const x of [-.080,-.037,.018,.063])for(const y of [-.066,.066]){
        pose.position.set(x,y,.104);pose.rotation.set(Math.PI/2,0,0);pose.scale.set(.004,.009,.004);pose.updateMatrix();
        this.detailRows.push({piece,mesh:this.bolts,index:b++,matrix:pose.matrix.clone()});
      }
      for(let i=0;i<4;i++){
        pose.position.set(-.062+i*.019,0,.108);pose.rotation.set(0,.18,0);pose.scale.set(.009,.082,.016);pose.updateMatrix();
        this.detailRows.push({piece,mesh:this.vents,index:v++,matrix:pose.matrix.clone()});
      }
    }
  }
  updateDetails(){
    for(const p of this.sectors)p.group.updateMatrix();
    for(const d of this.detailRows){
      this.detailMatrix.multiplyMatrices(d.piece.group.matrix,d.matrix);
      if(!d.piece.group.visible||d.piece.materials[0].opacity<.5)this.detailMatrix.makeScale(0,0,0);
      d.mesh.setMatrixAt(d.index,this.detailMatrix);
    }
    this.bolts.instanceMatrix.needsUpdate=true;this.vents.instanceMatrix.needsUpdate=true;
  }
  resize(layout,width,height){
    const key=`${width}:${height}`;if(this.size===key)return;this.size=key;this.layout=layout;
    // One bounded surface, independent of devicePixelRatio and desktop resolution.
    const scale=Math.min(1,1440/width,960/height),rw=Math.ceil(width*scale),rh=Math.ceil(height*scale);
    this.canvas.width=rw;this.canvas.height=rh;this.renderer.setSize(rw,rh,false);
    const halfW=width/layout.rx/2,halfH=height/layout.rx/2;
    Object.assign(this.camera,{left:-halfW,right:halfW,top:halfH,bottom:-halfH});this.camera.updateProjectionMatrix();
    this.station.position.set((layout.cx-width/2)/layout.rx,(height/2-layout.cy)/layout.rx,0);
    this.ring.rotation.x=-Math.acos(layout.ry/layout.rx);
  }
  poseSector(piece,age,detached,reduced,fireAge){
    const {group,a,index:i,quadrant:q}=piece,cos=Math.cos(a),sin=Math.sin(a);
    const start=.12+q*.11+Math.abs(i%8-3.5)*.055,join=reduced?1:smooth((age-start)/2.05);
    const settle=reduced?0:Math.sin(clamp((age-start-1.75)/.65)*Math.PI*3)*Math.max(0,1-(age-start-1.75)/.65)*.025;
    let radius=1+(1-join)*.65+settle,z=(1-join)*-.48,turn=(1-join)*1.1;
    const delay=Math.abs(i%8-3.5)*.08,elapsed=detached==null?-1:age-detached,t=Math.max(0,elapsed-delay);
    const recoilTime=age-fireAge-(i%8)*.018;
    if(!reduced&&recoilTime>0&&recoilTime<.42)z-=Math.sin(recoilTime/.42*Math.PI)*.018;
    if(elapsed>=delay&&!reduced){
      const peel=smooth(t/.32),flight=Math.max(0,t-.30);turn+=peel*(i%2?-.65:.85)+flight*(.28+i%3*.14);
      radius+=flight*(.11+i%3*.05);z+=peel*.035+flight*.18-flight*flight*.15;
    }
    group.visible=elapsed<2.2;group.position.set(cos*radius,-sin*radius-(reduced?0:Math.max(0,t-.3)**2*.045),z);
    group.rotation.set(0,reduced?0:turn,-a+(reduced?0:Math.max(0,t-.32)*(i%2?-.10:.08)));
    const alpha=elapsed<0?1:1-smooth((elapsed-1.45)/.75);
    fadeMaterials(piece.materials,alpha);
  }
  update(model,layout,width,height,{reduced=false,flash=1,detachedAt,recoilAt=-100,delta=1,hits}={}){
    if(this.disposed||this.failed)return false;this.resize(layout,width,height);this.lastAge=model.age;this.lastReduced=reduced;this.lastFlash=flash;
    const age=model.age,ratio=layout.ry/layout.rx;
    this.detachedAt=detachedAt;
    for(const piece of this.sectors)this.poseSector(piece,age,detachedAt.get(piece.quadrant),reduced,recoilAt);
    for(const [q,b]of this.bridges.entries()){
      const broken=detachedAt.has(q),t=broken?age-detachedAt.get(q):0,extension=reduced?1:smooth((age-.8-q*.13)/1.45);
      b.group.visible=!broken||t<.55;b.group.scale.x=.32+.68*extension;
      b.group.rotation.z=-b.a+(broken&&!reduced?Math.min(1,t/.55)*.18:0);
      b.carriage.position.x=.39+(reduced?0:(Math.sin(age*.75+q)*.5+.5)*.16);
    }
    this.opening=(this.opening??0)+(Number(model.irisOpen)-(this.opening??0))*(1-Math.exp(-14*Math.max(0,delta)/60));
    const open=this.opening,entry=reduced?1:smooth((age-.8)/1.65),fire=age-recoilAt;
    this.reactor.position.z=(1-entry)*-.45-(reduced||fire<0||fire>.32?0:Math.sin(fire/.32*Math.PI)*.045);
    this.reactor.rotation.x=reduced?0:(1-entry)*-.8;
    this.reactor.scale.setScalar(.8+.2*entry);
    for(const {group,a,index}of this.shutters){
      const r=.066+open*.08;group.position.set(Math.cos(a)*r,Math.sin(a)*r,.163+open*.024);
      group.rotation.set(0,reduced?0:open*.28,a+.30+(reduced?0:open*.17));
    }
    for(let i=0;i<this.rotors.length;i++)this.rotors[i].rotation.z=reduced?0:age*(i?-.27:.17);
    this.plasma.rotation.set(reduced?0:age*.22,reduced?0:age*.35,0);
    this.plasmaMaterial.uniforms.time.value=reduced?0:age;this.plasmaMaterial.uniforms.strength.value=flash>0?1.15:.45;
    this.materials.heat.emissiveIntensity=flash>0?1.5+open*.9+Math.sin(age*2.4)*.12:0;
    this.coreLight.intensity=flash>0?open*1.6:0;
    for(const anchor of this.anchors){
      const {group,a,q,inner,barrel}=anchor;group.visible=model.parts[q].health>0;
      group.position.set(Math.cos(a),-Math.sin(a)*ratio,Math.sin(a)*Math.sqrt(1-ratio*ratio)+.12);
      const dock=reduced?1:smooth((age-1.1-q*.13)/1.4);group.position.z+=(1-dock)*.45;
      group.rotation.x=reduced?0:(1-dock)*.7;inner.rotation.z=reduced?0:Math.sin(age*.6+q)*.08;
      barrel.position.z=.102-(reduced||fire<0||fire>.24?0:Math.sin(fire/.24*Math.PI)*.025);
      const hit=age-(hits?.get(`anchor_${q}`)??-100);
      if(!reduced&&hit>=0&&hit<.28)inner.position.z=-Math.sin(hit/.28*Math.PI)*.017;
      else inner.position.z=0;
    }
    this.updateDetails();
    this.render();return true;
  }
  beginCollapse(){
    this.collapsing=true;this.collapseAge=0;
    this.sectors.forEach(p=>{p.collapseVisible=p.group.visible;p.startPosition=p.group.position.clone();p.startRotation=p.group.rotation.clone();});
    for(const p of [...this.bridges,...this.frameSections,...this.shutters]){
      p.collapseVisible=p.group.visible;p.startPosition=p.group.position.clone();p.startRotation=p.group.rotation.clone();
    }
  }
  updateCollapse(age,reduced,flash){
    if(this.disposed||this.failed)return false;this.collapseAge=age;
    // Connections resist, hinge, then separate; the heavy frame never pulses as one piece.
    for(const p of this.frameSections){
      const delay=.50+(1+Math.sin(p.a))*.19+(p.index%2)*.035,t=Math.max(0,age-delay),flight=Math.max(0,t-.52);
      p.group.position.copy(p.startPosition);p.group.rotation.copy(p.startRotation);
      if(!reduced){
        p.group.rotation.y+=smooth(t/.36)*(p.index%2?-.48:.58)+flight*(p.index%2?-.24:.18);
        p.group.position.x+=Math.cos(p.a)*flight*(.054+p.index%3*.016);
        p.group.position.y+=Math.sin(p.a)*flight*.036-flight*flight*.043;
        p.group.position.z+=flight*(p.index%2?.025:-.035);p.group.rotation.z+=flight*(p.index%2?-.12:.09);
      }
      const opacity=1-smooth((age-(2.1+(delay-.5)*.6))/.82);fadeMaterials(p.materials,opacity);p.group.visible=opacity>0;
    }
    const hubFall=Math.max(0,age-.65);this.hub.position.y=reduced?0:-hubFall*hubFall*.045;
    this.hub.rotation.x=reduced?0:smooth(hubFall/.8)*.26;fadeMaterials(this.hubMaterials,1-smooth((age-1.35)/1.25));
    this.hub.visible=age<2.6;
    this.coreLight.intensity=flash===0?0:age<.2?.1:Math.max(0,1-(age-.2)/.7)*4;
    this.plasma.visible=flash>0&&age>.18&&age<.85;
    this.plasmaMaterial.uniforms.time.value=reduced?0:this.lastAge+age;
    this.plasma.scale.setScalar(reduced?1:age<.2?1-smooth(age/.2)*.35:.65+smooth((age-.2)/.5)*2.7);
    for(const p of this.shutters){const {group,a,index}=p,t=Math.max(0,age-.23-index*.022);
      group.position.copy(p.startPosition);group.rotation.copy(p.startRotation);
      if(!reduced){group.position.x+=Math.cos(a)*t*.10;group.position.y+=Math.sin(a)*t*.10-t*t*.06;
        group.position.z+=t*.08;group.rotation.y+=t*(index%2?.9:-.75);}
      const opacity=1-smooth((t-1.45)/.75);fadeMaterials(p.materials,opacity);group.visible=opacity>0;
    }
    for(const p of this.sectors){
      const t=Math.max(0,age-.24-p.quadrant*.11-Math.abs(p.index%8-3.5)*.035),flight=Math.max(0,t-.22);
      p.group.visible=p.collapseVisible&&t<2.75;p.group.position.copy(p.startPosition);p.group.rotation.copy(p.startRotation);
      if(!reduced){p.group.position.x+=Math.cos(p.a)*flight*(.13+p.index%3*.04);p.group.position.y-=flight*flight*.16;
        p.group.position.z+=Math.sin(p.a)*flight*.12;p.group.rotation.y+=smooth(t/.26)*.35+flight*(p.index%2?-.8:.65);p.group.rotation.z+=flight*(p.index%2?.1:-.12);}
      const opacity=1-smooth((t-1.9)/.85);fadeMaterials(p.materials,opacity);
    }
    for(const [q,b]of this.bridges.entries()){
      const t=Math.max(0,age-.25-(q%2)*.14),release=smooth(t/.25),fall=Math.max(0,t-.35);
      b.group.position.copy(b.startPosition);b.group.rotation.copy(b.startRotation);
      if(!reduced){b.group.position.x+=Math.cos(b.a)*release*.026;b.group.position.y-=Math.sin(b.a)*release*.026;
        b.group.rotation.z+=fall*fall*(q%2?.20:-.20);b.group.position.z-=fall*fall*.11;}
      const opacity=1-smooth((t-1.2)/.8);fadeMaterials(b.materials,opacity);b.group.visible=b.collapseVisible&&opacity>0;
    }
    for(const a of this.anchors)a.group.visible=false;
    this.updateDetails();
    this.render();return true;
  }
  render(){
    this.renderer.render(this.scene,this.camera);
    this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
    this.context.drawImage(this.renderer.domElement,0,0);
  }
  destroy(){
    if(this.disposed)return;this.disposed=true;this.ready=false;
    const geometries=new Set([this.box,this.cylinder].filter(Boolean)),materials=new Set(Object.values(this.materials||{}));
    this.scene?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [].concat(o.material||[]))materials.add(m);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.surface?.dispose();this.hullSurface?.dispose();this.environment?.dispose();
    this.room?.dispose();this.pmrem?.dispose();this.scene?.traverse(o=>o.shadow?.dispose());
    this.renderer?.domElement.removeEventListener('webglcontextlost',this.onContextLost);this.renderer?.dispose();this.renderer?.forceContextLoss();
    this.scene?.clear();if(this.canvas)this.canvas.width=this.canvas.height=1;
  }
}
