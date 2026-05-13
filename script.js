var scene,
  camera,
  renderer,
  clock,
  mixer,
  controls,
  light,
  lights,
  params,
  isRotating = false,
  actions = [],
  mode;

var currentModel = null;

const ampSound = new Audio("./assets/guitar_amp.mp3");
const strumSound = new Audio("./assets/guitar_strum.mp3");

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

  lights = {};

  // light = new THREE.DirectionalLight(0xffffff, 2);
  // light.position.set(0, 10, 2);
  // scene.add(light);

  lights.spot = new THREE.SpotLight(0xffffff);
  lights.spot.position.set(0, 10, 0);
  lights.spot.distance = 20;
  lights.spot.angle = Math.PI / 2;
  lights.spot.penumbra = 2;
  scene.add(lights.spot);

  lights.spotHelper = new THREE.SpotLightHelper(lights.spot);
  lights.spotHelper.visible = false;
  scene.add(lights.spotHelper);

  params = {
    spot: {
      enable: true,
      color: 0xffffff,
      distance: 20,
      angle: Math.PI / 2,
      penumbra: 0,
      helper: false,
      moving: false,
    }
  }

  const gui = new dat.GUI({ autoPlace: false });
  const guiContainer = document.getElementById("gui-container");
  guiContainer.appendChild(gui.domElement);

  const spot = gui.addFolder("Spot");
  spot.open();

  spot.add(params.spot, "enable").name("Enable").onChange((value) => {
    lights.spot.visible = value;
  });

  spot.addColor(params.spot, "color").name("Color").onChange((value) => {
    lights.spot.color = new THREE.Color(value);
  });

  spot.add(params.spot, "distance").min(0).max(20).onChange((value) => {
    lights.spot.distance = value;
  });

  spot.add(params.spot, "angle").min(0.1).max(6.28).onChange((value) => {
    lights.spot.angle = value;
  });
  
  spot.add(params.spot, "penumbra").min(0).max(1).onChange((value) => {
    lights.spot.penumbra = value;
  });

  spot.add(params.spot, "helper").onChange((value) => {
    lights.spotHelper.visible = value;
  });
  spot.add(params.spot, "moving");

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
          ampSound.currentTime = 0;
          ampSound.play();

          currentModel.traverse(function (child) {
            if (child.isMesh && child.name === 'Sphere') { 
              child.material.emissive.set(0xff0000);
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
          ampSound.pause();

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
    ampSound.pause();
    strumSound.pause();
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
      actions.push(action); 
    });

    console.log("Model loaded:", name);

    if (name === "acoustic_guitar") {
      mode = "strum";
      btn.textContent = "Strum 🎵";
      btn.className = "btn btn-warning btn-sm w-100 mb-2";
      updateInfo('acoustic_guitar');

      camera.position.set(0, 0, 1.5);
      controls.target.set(0, 0, 0);
      controls.update();
    } else if (name === "amp") {
      mode = "amp";
      btn.textContent = "Turn On";
      btn.className = "btn btn-success btn-sm w-100 mb-2";
      updateInfo('amp');
      camera.position.set(1, 2, 1);
      controls.target.set(0, 0, 0);
      controls.update();
    } else if (name === "plectrum") {
      mode = "none";
      btn.textContent = "No Action";
      btn.className = "btn btn-secondary btn-sm w-100 mb-2";
      updateInfo('plectrum');

      camera.position.set(0, 0, 3);
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

  const time = clock.getElapsedTime();
  const delta = Math.sin(time)*5;
  if (params.spot.moving) {
    lights.spot.position.x = delta;
    lights.spotHelper.update();
  }
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

const infoContent = {
  acoustic_guitar: `
  <h5 class="text-warning">Acoustic Guitar</h5>
  <p class="small">An acoustic guitar produces sound through the vibration of its strings, 
  which resonates through the hollow body. Click each part to learn more.</p>
  <hr class="border-secondary">

  <details class="mb-2">
    <summary class="text-warning" style="cursor:pointer;">Body</summary>
    <p class="small mt-1">The large hollow section of the guitar. Acts as a resonance 
    chamber — string vibrations resonate through the body to project sound. Wood type 
    (spruce, mahogany) significantly affects tone.</p>
  </details>

  <details class="mb-2">
    <summary class="text-warning" style="cursor:pointer;">Neck</summary>
    <p class="small mt-1">The long thin section extending from the body. Holds the 
    fretboard and provides a surface for the fretting hand. Usually made from maple 
    or mahogany.</p>
  </details>

  <details class="mb-2">
    <summary class="text-warning" style="cursor:pointer;">Headstock</summary>
    <p class="small mt-1">Sits at the top of the neck and holds the tuning pegs. 
    The strings are anchored here at the top of the guitar. Shape varies by manufacturer.</p>
  </details>

  <details class="mb-2">
    <summary class="text-warning" style="cursor:pointer;">Tuning Pegs</summary>
    <p class="small mt-1">Metal mechanisms on the headstock used to tighten or loosen 
    each string to change its pitch. Clockwise raises pitch, anticlockwise lowers it.</p>
  </details>

  <details class="mb-2">
    <summary class="text-warning" style="cursor:pointer;">Nut</summary>
    <p class="small mt-1">A small strip of bone, plastic or graphite at the top of the 
    fretboard. Spaces the strings evenly and sets string height. A poorly cut nut 
    causes tuning problems.</p>
  </details>

  <details class="mb-2">
    <summary class="text-warning" style="cursor:pointer;">Bridge</summary>
    <p class="small mt-1">Anchors the strings to the body at the lower end. On an 
    acoustic guitar it transfers string vibration directly into the soundboard. 
    The saddle inside the bridge sets string height and intonation.</p>
  </details>

  <details class="mb-2">
    <summary class="text-warning" style="cursor:pointer;">Soundhole</summary>
    <p class="small mt-1">The circular opening in the top of the body. Allows sound 
    to project outward from the resonating chamber. Size and position affect 
    volume and tonal balance.</p>
  </details>

  <details class="mb-2">
    <summary class="text-warning" style="cursor:pointer;">Frets</summary>
    <p class="small mt-1">Thin metal strips across the fretboard. Pressing a string 
    behind a fret shortens its vibrating length, raising the pitch by one semitone 
    per fret. The 12th fret is one octave above the open string.</p>
  </details>

  <details class="mb-2">
    <summary class="text-warning" style="cursor:pointer;">Strings</summary>
    <p class="small mt-1">The six strings are tuned E, A, D, G, B, E (low to high). 
    Acoustic strings are typically phosphor bronze. Lighter gauges are easier to play; 
    heavier gauges give more volume and sustain.</p>
  </details>
  `,

  amp: `
  <h5 class="text-success">🎛️ Guitar Amplifier</h5>
  <p class="small">A guitar amplifier boosts the weak electrical signal from an electric 
  guitar to drive a loudspeaker. Click each part to learn more.</p>
  <hr class="border-secondary">

  <details class="mb-2">
    <summary class="text-success" style="cursor:pointer;">Speaker</summary>
    <p class="small mt-1">Converts the amplified electrical signal back into sound. 
    Common sizes are 10", 12", or 15". The speaker's construction and materials 
    influence the amp's tonal characteristics.</p>
  </details>

  <details class="mb-2">
    <summary class="text-success" style="cursor:pointer;">Cabinet</summary>
    <p class="small mt-1">The enclosure that houses the speaker(s). Affects sound projection 
    and tone. Open-back cabinets provide a more airy sound, while closed-back cabinets 
    offer tighter bass response.</p>
  </details>

  <details class="mb-2">
    <summary class="text-success" style="cursor:pointer;">Controls</summary>
    <p class="small mt-1">Knobs and switches on the amp that adjust various parameters. 
    Common controls include volume, gain, bass, mid, treble, and reverb. Some amps also 
    have built-in effects like distortion or delay.</p>
  </details>

  <details class="mb-2">
    <summary class="text-success" style="cursor:pointer;">Input Jack</summary>
    <p class="small mt-1">Where you plug in your guitar cable. The input jack connects the 
    guitar's signal to the amp's preamp stage. Some amps have multiple inputs with different gain levels.</p>
  </details>

  <details class="mb-2">
    <summary class="text-success" style="cursor:pointer;">Power Switch</summary>
    <p class="small mt-1">Turns the amplifier on and off. Always turn the amp on before plugging in your guitar to avoid loud pops that can damage speakers.</p>
  </details>

  `,

  plectrum: `
  <h5 class="text-secondary">🎵 Guitar Plectrum (Pick)</h5>
  <p class="small">A plectrum, or guitar pick, is a small flat tool used to pluck or strum the strings of a guitar. 
  </p>
  <hr class="border-secondary">
  `
};


function updateInfo(name) {
  const panel = document.getElementById("info-section");

  if (infoContent[name]) {
    panel.innerHTML = infoContent[name];
  }
}

console.log('infoContent loaded:', typeof infoContent);
console.log('updateInfo loaded:', typeof updateInfo);