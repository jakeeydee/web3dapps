var scene, camera, renderer, clock, mixer, actions = [], mode;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  const assetPath = './'; 

  clock = new THREE.Clock(); 

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 2);

  const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(0, 10, 2);
  scene.add(light);

  const container = document.getElementById('canvas-container');
  const canvas = document.getElementById('threeContainer');
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();

  mode = 'strum';
  const btn = document.getElementById("btn");
  if (btn) {
    btn.addEventListener('click', function () {
      if (actions.length > 0) {
        actions.forEach(action => {
          action.timeScale = 1;
          action.reset();
          action.play();
        });
      }
    });
  }

  const loader = new THREE.GLTFLoader();
  loader.load(assetPath + 'acoustic_guitar.glb', function (gltf) {
    const model = gltf.scene;
    scene.add(model);


    const box = new THREE.Box3().setFromObject(model);
    const centre = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    model.scale.setScalar(scale);
    model.position.sub(centre.multiplyScalar(scale));


    mixer = new THREE.AnimationMixer(model);
    const animations = gltf.animations;
    animations.forEach(clip => {
      const action = mixer.clipAction(clip);
      actions.push(action); // Store actions to trigger via button
    });
  });

  window.toggleWireframe = function () {
    scene.traverse(function (child) {
      if (child.isMesh) {
        child.material.wireframe = !child.material.wireframe;
      }
    });
  };

  window.addEventListener('resize', resize, false);

  animate();
}

function animate() {
  requestAnimationFrame(animate);

  if (mixer) {
    mixer.update(clock.getDelta());
  }

  renderer.render(scene, camera);
}

function resize() {
  const container = document.getElementById('canvas-container');
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}