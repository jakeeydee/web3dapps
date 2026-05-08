var scene,
  camera,
  renderer,
  clock,
  mixer,
  controls,
  light,
  isRotating = false,
  actions = [],
  mode;

var currentModel = null;

const ampSound = new Audio("./assets/guitar_amp_sound.mp3");
const strumSound = new Audio("./assets/guitar_strum_sound.mp3");

let ampIsOn = false;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

function init() {
  const assetPath = "./";

  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(0, 0, 2);

  const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820, 4);
  scene.add(ambient);

  light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(0, 10, 2);
  scene.add(light);

  const container = document.getElementById("canvas-container");
  const canvas = document.getElementById("threeContainer");
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();

  mode = "strum";
  const btn = document.getElementById("btn");
  if (btn) {
    btn.addEventListener("click", function () {
      if (mode === "strum") {
        strumSound.currentTime = 0;
        strumSound.play();

        if (actions.length > 0) {
          actions.forEach((action) => {
            action.timeScale = 1;
            action.reset();
            action.clampWhenFinished = true;
            action.setLoop(THREE.LoopOnce);
            action.play();
          });
        }
      } else if (mode === "amp") {
        if (!ampIsOn) {
          ampIsOn = true;
          btn.textContent = "Turn Off";

          currentModel.traverse(function (child) {
            if (child.isMesh && child.name === 'Sphere') { // match your object name in Blender
              child.material.emissive.set(0xff0000); // red glow
              child.material.emissiveIntensity = 2;
            }
          });

          actions.forEach((action) => {
            action.timeScale = 1;
            action.paused = false;
            if (!action.isRunning()) {
              action.reset();
              action.clampWhenFinished = true;
              action.setLoop(THREE.LoopOnce);
              action.play();
            }
          });
        } else {
          ampIsOn = false;
          btn.textContent = "Turn On";

          currentModel.traverse(function (child) {
            if (child.isMesh && child.name === 'Sphere') {
              child.material.emissive.set(0x000000); // no glow
              child.material.emissiveIntensity = 0;
            }
          });

          actions.forEach((action) => {
            action.timeScale = -1;
            action.paused = false;
            if (!action.isRunning()) {
              action.time = action.getClip().duration;
              action.clampWhenFinished = true;
              action.setLoop(THREE.LoopOnce);
              action.play();
            }
          });
        }
      }
    });
  }

  loadModel("acoustic_guitar");
  window.addEventListener("resize", resize, false);
  animate();
}

function loadModel(name) {
  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }
  actions = [];
  mixer = null;
  ampIsOn = false;

  const btn = document.getElementById("btn");
  const loader = new THREE.GLTFLoader();


  loader.load("./assets/" + name + ".glb", function (gltf) {
    currentModel = gltf.scene;
    scene.add(currentModel);

    const box = new THREE.Box3().setFromObject(currentModel);
    const centre = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    currentModel.scale.setScalar(scale);
    currentModel.position.sub(centre.multiplyScalar(scale));

    mixer = new THREE.AnimationMixer(currentModel);
    gltf.animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      actions.push(action); // Store actions to trigger via button
    });

    console.log("Model loaded:", name);

    if (name === "acoustic_guitar") {
      mode = "strum";
      btn.textContent = "Strum 🎵";
      btn.className = "btn btn-warning btn-sm w-100 mb-2";

      camera.position.set(0, 0, 3);
      controls.target.set(0, 0, 0);
      controls.update();
    } else if (name === "amp") {
      mode = "amp";
      btn.textContent = "Turn On";
      btn.className = "btn btn-success btn-sm w-100 mb-2";

      camera.position.set(1, 2, 1);
      controls.target.set(0, 0, 0);
      controls.update();
    }

    renderer.render(scene, camera);
  });
}



window.loadModel = loadModel;

window.toggleWireframe = function () {
  if (currentModel) {
    currentModel.traverse(function (child) {
      if (child.isMesh) {
        child.material.wireframe = !child.material.wireframe;
      }
    });
  }
};

function animate() {
  requestAnimationFrame(animate);

  if (isRotating && currentModel) {
    currentModel.rotation.y += 0.01;
  }

  if (mixer) {
    mixer.update(clock.getDelta());
  }

  renderer.render(scene, camera);
}

function resize() {
  const container = document.getElementById("canvas-container");
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

window.toggleRotate = function () {
  isRotating = !isRotating;
};