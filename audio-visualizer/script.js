// Both imports are intentional in the Vite build output.
// Locally, Vite serves a single merged stylesheet; the production bundle
// splits root and page styles into separate chunks, so both are needed here.
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
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// import { HalftonePass } from 'three/addons/postprocessing/HalftonePass.js';

// #region Scene Setup

// Set up the renderer.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('visualizer').appendChild(renderer.domElement);

// Set up the scene.
const scene = new THREE.Scene();

const textureLoader = new THREE.TextureLoader();
const bgTexture = textureLoader.load('./assets/images/bg-texture.png', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
});
scene.background = bgTexture;

// Set up the camera.
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(10, 10, 10);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;

// Let the blob move a little with the mouse.
// let mouseX = 0;
// let mouseY = 0;
// document.addEventListener('mousemove', function (e) {
//   let windowHalfX = window.innerWidth / 2;
//   let windowHalfY = window.innerHeight / 2;
//   mouseX = (e.clientX - windowHalfX) / 100;
//   mouseY = (e.clientY - windowHalfY) / 100;
// });

// Define uniforms and material for the scene.
// Includes audio and post-processing parameters.
const params = {
    // Default colors are hot pink and yellow.
    topHalf:    '#438fd6',
    bottomHalf: '#e56cac',

    // Default bloom parameters after tweaking.
    threshold: 0.14,
    strength:  0.176,
    radius:    0.309,

    // Default audio is "Resonance" by HOME.
    volume: 0.8,
    audio:  './assets/audio/Resonance_Home.mp3',

    // GUI functions.
    // Includes play/pause, audio upload, and resetting to default audio.
    toggle: function () {
        if (!sound.buffer) {
            loadAudio(params.audio, true);
            return;
        }
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
    u_time:      { value: 0.0 },
    u_frequency: { value: 0.0 },
    u_bass:      { value: 0.0 },
    u_topHalf:   { value: new THREE.Color(params.topHalf) },
    u_bottomHalf:{ value: new THREE.Color(params.bottomHalf) },
    u_audio:     { value: params.audio }
};

// #endregion Scene Setup

// #region Blob Setup

// Create the blob material, geometry, and mesh.
const mat = new THREE.ShaderMaterial({
    wireframe: true, // See individual vertices.
    uniforms,
    vertexShader:   document.getElementById('vertexshader').textContent,
    fragmentShader: document.getElementById('fragmentshader').textContent,
});

const isMobile = window.innerWidth <= 768;
const geo  = new THREE.IcosahedronGeometry(isMobile ? 3 : 5, isMobile ? 20 : 32);
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
const sound       = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();

function loadAudio(url, autoplay = false) {
    // Stop current audio completely if it's playing or paused.
    if (sound.isPlaying || sound.offset > 0) sound.stop();

    // Reset offset to prevent new audio resuming from the previous track's position.
    sound.offset = 0;

    audioLoader.load(url, function (buffer) {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(params.volume);
        if (autoplay) sound.play();
    });
}

// Audio requires a user gesture — play on first click if not already started.
window.addEventListener('click', function () {
    if (!userInteracted && sound.buffer) {
        sound.play();
        userInteracted = true;
    }
});

// Handle audio file uploads.
const fileInput = document.getElementById('audio');
fileInput.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;

    loadAudio(URL.createObjectURL(file), true);

    // Reset so the same file can be uploaded again if desired.
    this.value = '';
});

// #endregion Audio Setup

// #region Post-Processing

// Use sRGB color space for more vibrant colors.
renderer.outputColorSpace = THREE.SRGBColorSpace;
const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight));
bloomPass.threshold = params.threshold;
bloomPass.strength  = params.strength * 1.25;
bloomPass.radius    = params.radius;

const outputPass = new OutputPass();

// Set up halftone pass with parameters defined below.
// Separated out from initialization for better readability and easier tweaking.
// const halfToneParams = {
//     shape: 2,           // 1 = Dot, 2 = Ellipse, 3 = Line, 4 = Square, 5 = Diamond
//     radius: 1,
//     rotateR: Math.PI / 12,
//     rotateB: Math.PI / 12 * 2,
//     rotateG: Math.PI / 12 * 3,
//     scatter: 0.25,
//     blending: 1,
//     blendingMode: 1,    // 1 = Linear, 2 = Multiply, 3 = Add, 4 = Lighter, 5 = Darker
//     opacity: 0.15,
//     greyscale: false,
//     disable: false
// };
// const halftonePass = new HalftonePass(halfToneParams);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);
composer.addPass(outputPass);
// composer.addPass(halftonePass);

// Animate the scene.
const clock    = new THREE.Clock();
const analyser = new THREE.AudioAnalyser(sound, 64);

function animate() {
    controls.update();
    uniforms.u_time.value      = clock.getElapsedTime();
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
gui.remembers = false;

document.getElementById('gui-container').appendChild(gui.domElement);
gui.domElement.addEventListener('click', e => e.stopPropagation());

const audioFolder = gui.addFolder('audio');
audioFolder.add(params, 'upload').name('upload');
audioFolder.add(params, 'default').name('use default');
audioFolder.add(params, 'toggle').name('pause/play');
audioFolder.add(params, 'volume', 0, 2).onChange(value => listener.setMasterVolume(value));

const colorsFolder = gui.addFolder('colors');
colorsFolder.addColor(params, 'topHalf').name('top half').onChange(value => {
    uniforms.u_topHalf.value.set(value);
});
colorsFolder.addColor(params, 'bottomHalf').name('bottom half').onChange(value => {
    uniforms.u_bottomHalf.value.set(value);
});

const bloomFolder = gui.addFolder('bloom');
bloomFolder.add(params, 'threshold', 0, 1).onChange(value => { bloomPass.threshold = Number(value); });
bloomFolder.add(params, 'strength',  0, 1).onChange(value => { bloomPass.strength  = Number(value); });
bloomFolder.add(params, 'radius',    0, 3).onChange(value => { bloomPass.radius    = Number(value); });

// Default to closed GUI on smaller screens to preserve screen space.
if (window.innerWidth <= 768) gui.close();

window.addEventListener('resize', function () {
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

// #region Draggable GUI

(function makeDraggable(el) {
    let startX, startY, startLeft, startTop, didDrag;

    const handle = el.querySelector('.lil-gui.root > .title') || el;
    handle.style.cursor = 'grab';

    handle.addEventListener('mousedown', onDragStart);
    handle.addEventListener('touchstart', onDragStart, { passive: false });

    function onDragStart(e) {
        e.stopPropagation();

        // Switch from right-anchored to left-anchored on first drag
        if (el.style.left === '') {
            const rect = el.getBoundingClientRect();
            el.style.left  = rect.left + 'px';
            el.style.right = 'unset';
        }

        const touch  = e.touches ? e.touches[0] : e;
        startX    = touch.clientX;
        startY    = touch.clientY;
        startLeft = parseInt(el.style.left, 10) || 0;
        startTop  = parseInt(el.style.top,  10) || 0;
        didDrag   = false;

        handle.style.cursor = 'grabbing';
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup',   onDragEnd);
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('touchend',  onDragEnd);
    }

    function onDragMove(e) {
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const dx    = touch.clientX - startX;
        const dy    = touch.clientY - startY;

        // Only count it as a drag if the cursor actually moved
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag = true;
        if (!didDrag) return;

        const maxLeft = window.innerWidth  - el.offsetWidth;
        const maxTop  = window.innerHeight - el.offsetHeight;

        el.style.left = Math.max(0, Math.min(startLeft + dx, maxLeft)) + 'px';
        el.style.top  = Math.max(0, Math.min(startTop  + dy, maxTop))  + 'px';
    }

    function onDragEnd() {
        handle.style.cursor = 'grab';
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup',   onDragEnd);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('touchend',  onDragEnd);

        // If the mouse moved at all, swallow the click that lil-gui would
        // otherwise receive and use to toggle the panel open/closed
        if (didDrag) {
            handle.addEventListener('click', suppressClick, { capture: true, once: true });
        }
    }

    function suppressClick(e) {
        e.stopImmediatePropagation();
        e.preventDefault();
    }
})(document.getElementById('gui-container'));

// #endregion Draggable GUI