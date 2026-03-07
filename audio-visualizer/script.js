// TODO: Figure out if doubly importing here is necessary.
// (it was using only one style.css when building locally)
import '../style.css';
import './style.css';

/*
    Source: Wael Yasmina
    https://github.com/WaelYasmina/audiovisualizer/tree/main.
*/
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import { GUI } from 'lil-gui';
// import { HalftonePass } from 'three/addons/postprocessing/HalftonePass.js';

// #region Scene Setup

// Set up the renderer.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('visualizer').appendChild(renderer.domElement);

// Set up the scene.
const scene = new THREE.Scene();

// Set up the camera.
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(6, 8, 14);

// Let the blob move a little with the mouse.
let mouseX = 0;
let mouseY = 0;
document.addEventListener('mousemove', function (e) {
  let windowHalfX = window.innerWidth / 2;
  let windowHalfY = window.innerHeight / 2;
  mouseX = (e.clientX - windowHalfX) / 100;
  mouseY = (e.clientY - windowHalfY) / 100;
});

// Define uniforms and material for the scene.
// Includes audio and post-processing parameters.
const params = {
  // Default colors are hot pink and cyan.
  topHalf: '#c29aea', 
  bottomHalf: '#ff8d85',

  // Default bloom parameters after tweaking.
  threshold: 0.361,   
  strength: 0.152,
  radius: 0.603,

  // Default audio is "Resonance" by HOME.
  volume: 0.8,
  audio: './assets/audio/Resonance_Home.mp3', 

  // GUI functions.
  // Includes play/pause, audio upload, and resetting to default audio.
  toggle: function () {
    if (!sound.buffer) {
      loadAudio(params.audio, true);
      return;
    };

    if (sound.isPlaying) {
      sound.pause();
    } else {
      sound.play();
    }
  },

  upload: function () {
    document.getElementById('audio').click();
  },

  default: function () {
    loadAudio(params.audio, true);
  }
};

const uniforms = {
  u_time: { value: 0.0 },
  u_frequency: { value: 0.0 },
  u_bass: { value: 0.0 },
  u_topHalf: { value: new THREE.Color(params.topHalf) },
  u_bottomHalf: { value: new THREE.Color(params.bottomHalf) },
  u_audio: { value: params.audio }
};

// #endregion Scene Setup

// #region Blob Setup

// Create the blob material, geometry, and mesh.
const mat = new THREE.ShaderMaterial({
  // See individual vertices.
  wireframe: true, 
  uniforms,
  vertexShader: document.getElementById('vertexshader').textContent,
  fragmentShader: document.getElementById('fragmentshader').textContent,
});

const geo = new THREE.IcosahedronGeometry(4, 30);
const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);

// Shift the blob down a little so it's centered better.
mesh.position.y = -0.65; 

// #endregion Blob Setup

// #region Audio Setup

// Animate the blob with audio frequencies.
const listener = new THREE.AudioListener();
listener.setMasterVolume(params.volume);
camera.add(listener);

// Use selected audio, if provided. Otherwise, play default audio.
let userInteracted = false;
const sound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();

function loadAudio(url, autoplay = false) {
  // Stop current audio completely if it's playing or paused.
  if (sound.isPlaying || sound.offset > 0) {
    sound.stop();
  }

  // Reset offset (to prevent case of new audio resuming from previous audio's offset).
  sound.offset = 0;

  // Load new audio.
  audioLoader.load(url, function (buffer) {
    // Set the new audio buffer and play, if autoplaying.
    sound.setBuffer(buffer);
    sound.setLoop(true);
    sound.setVolume(params.volume);

    if (autoplay) {
      sound.play();
    }
  });
}

// Requires user interaction to play audio, so play on first click, if not already played.
window.addEventListener('click', function () {
  if (!userInteracted && sound.buffer) {
    sound.play();
    userInteracted = true;
  }
});

// Handle audio file uploads.
const fileInput = document.getElementById("audio");
fileInput.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  loadAudio(url, true);

  // Reset file input to allow same file to be uploaded again, if desired.
  this.value = "";
});

// #endregion Audio Setup

// #region Post-Processing

// Use sRGB color space for more vibrant colors.
renderer.outputColorSpace = THREE.SRGBColorSpace;
const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight));
bloomPass.threshold = params.threshold;
bloomPass.strength = params.strength * 1.25;
bloomPass.radius = params.radius;

const outputPass = new OutputPass();

// Set up halftone pass with parameters defined below.
// Separated out from initialization for better readability and easier tweaking.
// const halfToneParams = {
// 	shape: 2, // 1 = Dot, 2 = Ellipse, 3 = Line, 4 = Square, 5 = Diamond
// 	radius: 1,
// 	rotateR: Math.PI / 12,
// 	rotateB: Math.PI / 12 * 2,
// 	rotateG: Math.PI / 12 * 3,
// 	scatter: 0.25,
// 	blending: 1,
// 	blendingMode: 1, // 1 = Linear, 2 = Multiply, 3 = Add, 4 = Lighter, 5 = Darker
// 	opacity: 0.15, // Adjust opacity to make halftone effect more subtle.
//   greyscale: false,
// 	disable: false
// };
// const halftonePass = new HalftonePass( halfToneParams );

// Set up the effect composer to apply all post-processing effects.
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);
composer.addPass(outputPass);
// composer.addPass(halftonePass);

// Animate the scene.
const clock = new THREE.Timer();
const analyser = new THREE.AudioAnalyser(sound, 32);
function animate() {
  camera.position.x += (mouseX - camera.position.x) * 0.05;
  camera.position.y += (-mouseY - camera.position.y) * 0.5;
  camera.lookAt(scene.position);

  uniforms.u_time.value = clock.getElapsed();
  uniforms.u_frequency.value = analyser.getAverageFrequency();
  composer.render();
  requestAnimationFrame(animate);
}
animate();

// #endregion Post-Processing

// #region GUI

const gui = new GUI({ autoPlace: false, closeFolders: false });
gui.title('controls');
gui.domElement.style.setProperty('--font-family', 'audio');
gui.remembers = false

document.getElementById('gui-container').appendChild(gui.domElement);
gui.domElement.addEventListener('click', (e) => e.stopPropagation());

// Set up audio controls in the GUI.
const audioFolder = gui.addFolder('audio');
audioFolder.add(params, 'upload').name('upload');
audioFolder.add(params, 'default').name('use default');
audioFolder.add(params, 'toggle').name('pause/play');
audioFolder.add(params, 'volume', 0, 2).onChange(function (value) {
  listener.setMasterVolume(value);
});

// Set up color controls in the GUI.
const colorsFolder = gui.addFolder('colors');
colorsFolder.addColor(params, 'topHalf').name('top half').onChange((value) => {
  uniforms.u_topHalf.value.set(value);
});
colorsFolder.addColor(params, 'bottomHalf').name('bottom half').onChange((value) => {
  uniforms.u_bottomHalf.value.set(value);
});

// Set up bloom controls in the GUI.
const bloomFolder = gui.addFolder('bloom');
bloomFolder.add(params, 'threshold', 0, 1).onChange(function (value) {
  bloomPass.threshold = Number(value);
});
bloomFolder.add(params, 'strength', 0, 1).onChange(function (value) {
  bloomPass.strength = Number(value);
});
bloomFolder.add(params, 'radius', 0, 3).onChange(function (value) {
  bloomPass.radius = Number(value);
});

// Resize the renderer and camera on window resize to maintain aspect ratio and fill the screen.
window.addEventListener('resize', function () {
  // Default to a closed GUI on smaller screens for better screen space.
  if (window.innerWidth <= 768) {
    gui.close();
  } else {
    gui.open();
  }

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// #endregion GUI