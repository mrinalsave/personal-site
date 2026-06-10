'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GUI } from 'lil-gui'

const VERTEX_SHADER = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float pnoise(vec3 P, vec3 rep) {
  vec3 Pi0 = mod(floor(P), rep);
  vec3 Pi1 = mod(Pi0 + vec3(1.0), rep);
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;
  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);
  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
  vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);
  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000,n100,n010,n110), vec4(n001,n101,n011,n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}

uniform float u_frequency;
uniform float u_time;
varying vec3 v_position;

void main() {
  float noise = 5. * pnoise(position + u_time, vec3(10.));
  float displacement = (u_frequency / 30.) * (noise / 10.) * 1.5;
  vec3 newPosition = position + normal * displacement;
  v_position = newPosition;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`

const FRAGMENT_SHADER = `
uniform vec3 u_topHalf;
uniform vec3 u_bottomHalf;
varying vec3 v_position;

void main() {
  float gradient = (v_position.y + 4.) / 8.;
  vec3 color = mix(u_bottomHalf, u_topHalf, gradient);
  gl_FragColor = vec4(color, 1.);
}
`

export default function AudioVisualizerCanvas() {
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    // Force dark mode, tracking whether user already had it so cleanup can restore correctly
    const wasDark = document.body.classList.contains('dark')
    document.body.classList.add('dark', 'audio-page')
    document.documentElement.classList.add('dark')

    // ── Renderer ──────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 0)
    const visualizerEl = document.getElementById('visualizer')
    if (!visualizerEl) return
    visualizerEl.appendChild(renderer.domElement)

    // ── Scene ─────────────────────────────────────────────────────────
    // Background is provided via CSS on #visualizer; renderer uses alpha: true
    const scene = new THREE.Scene()

    // ── Camera + Controls ─────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(10, 10, 10)
    camera.lookAt(0, 0, 0)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.03

    // ── Params + Uniforms ─────────────────────────────────────────────
    const params = {
      topHalf:    '#438fd6',
      bottomHalf: '#e56cac',
      threshold:  0.14,
      strength:   0.176,
      radius:     0.309,
      volume:     0.8,
      audio:      '/audio-visualizer/assets/audio/Resonance_Home.mp3',
      toggle() {
        if (!sound.buffer) { loadAudio(params.audio, true); return }
        if (sound.isPlaying) sound.pause(); else sound.play()
      },
      upload() { (document.getElementById('audio-file') as HTMLInputElement)?.click() },
      default() { loadAudio(params.audio, true) },
    }

    const uniforms: Record<string, { value: any }> = {
      u_time:       { value: 0.0 },
      u_frequency:  { value: 0.0 },
      u_bass:       { value: 0.0 },
      u_topHalf:    { value: new THREE.Color(params.topHalf) },
      u_bottomHalf: { value: new THREE.Color(params.bottomHalf) },
    }

    // ── Blob Mesh ─────────────────────────────────────────────────────
    const mat = new THREE.ShaderMaterial({
      wireframe: true,
      uniforms,
      vertexShader:   VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    })

    const isMobile = window.innerWidth <= 768
    const geo  = new THREE.IcosahedronGeometry(isMobile ? 3 : 5, isMobile ? 20 : 32)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.y = -0.65
    scene.add(mesh)

    // ── Audio ─────────────────────────────────────────────────────────
    const listener = new THREE.AudioListener()
    listener.setMasterVolume(params.volume)
    camera.add(listener)

    let userInteracted = false
    const sound       = new THREE.Audio(listener)
    const audioLoader = new THREE.AudioLoader()

    function loadAudio(url: string, autoplay = false) {
      if (sound.isPlaying || sound.offset > 0) sound.stop()
      sound.offset = 0
      audioLoader.load(url, (buffer) => {
        sound.setBuffer(buffer)
        sound.setLoop(true)
        sound.setVolume(params.volume)
        if (autoplay) sound.play()
      })
    }

    const onFirstClick = () => {
      if (!userInteracted && sound.buffer) {
        sound.play()
        userInteracted = true
      }
    }
    window.addEventListener('click', onFirstClick)

    const fileInput = document.getElementById('audio-file') as HTMLInputElement
    const onFileChange = function (this: HTMLInputElement) {
      const file = this.files?.[0]
      if (!file) return
      loadAudio(URL.createObjectURL(file), true)
      this.value = ''
    }
    fileInput?.addEventListener('change', onFileChange)

    // ── Post-Processing ───────────────────────────────────────────────
    const renderScene = new RenderPass(scene, camera)
    const bloomPass   = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      params.strength * 1.25,
      params.radius,
      params.threshold,
    )

    const outputPass = new OutputPass()
    const composer   = new EffectComposer(renderer)
    composer.addPass(renderScene)
    composer.addPass(bloomPass)
    composer.addPass(outputPass)

    // ── Animation ─────────────────────────────────────────────────────
    const clock    = new THREE.Clock()
    const analyser = new THREE.AudioAnalyser(sound, 64)
    let animId = 0

    function animate() {
      controls.update()
      uniforms.u_time.value      = clock.getElapsedTime()
      uniforms.u_frequency.value = analyser.getAverageFrequency()
      composer.render()
      animId = requestAnimationFrame(animate)
    }
    animate()

    // ── GUI ───────────────────────────────────────────────────────────
    const gui = new GUI({ autoPlace: false, closeFolders: false })
    gui.title('controls')
    gui.domElement.style.setProperty('--font-family', 'audio')
    ;(gui as any).remembers = false

    const guiContainer = document.getElementById('gui-container')
    guiContainer?.appendChild(gui.domElement)

    const audioFolder  = gui.addFolder('audio')
    audioFolder.add(params, 'upload').name('upload')
    audioFolder.add(params, 'default').name('use default')
    audioFolder.add(params, 'toggle').name('pause/play')
    audioFolder.add(params, 'volume', 0, 2).onChange((v: number) => listener.setMasterVolume(v))

    const colorsFolder = gui.addFolder('colors')
    colorsFolder.addColor(params, 'topHalf').name('top half').onChange((v: string) => uniforms.u_topHalf.value.set(v))
    colorsFolder.addColor(params, 'bottomHalf').name('bottom half').onChange((v: string) => uniforms.u_bottomHalf.value.set(v))

    const bloomFolder = gui.addFolder('bloom')
    bloomFolder.add(params, 'threshold', 0, 1).onChange((v: number) => { bloomPass.threshold = v })
    bloomFolder.add(params, 'strength',  0, 1).onChange((v: number) => { bloomPass.strength  = v })
    bloomFolder.add(params, 'radius',    0, 3).onChange((v: number) => { bloomPass.radius    = v })

    if (window.innerWidth <= 768) gui.close()

    function scaleGui() {
      const guiEl = document.getElementById('gui-container')
      if (!guiEl) return
      const available = window.innerHeight - 68 - 16
      const scale = guiEl.offsetHeight > available ? available / guiEl.offsetHeight : 1
      guiEl.style.transform = `scale(${scale})`
    }

    const onResize = () => {
      if (window.innerWidth <= 768) gui.close(); else gui.open()
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      composer.setSize(window.innerWidth, window.innerHeight)
      scaleGui()
    }
    window.addEventListener('resize', onResize)

    // Mobile popup
    const closePopup = document.getElementById('close-popup')
    const mobilePopup = document.getElementById('mobile-popup')
    closePopup?.addEventListener('click', () => mobilePopup?.classList.add('hidden'))
    if (window.innerWidth > 768) mobilePopup?.classList.add('hidden')

    return () => {
      cancelAnimationFrame(animId)
      if (sound.isPlaying) sound.stop()
      window.removeEventListener('click', onFirstClick)
      window.removeEventListener('resize', onResize)
      fileInput?.removeEventListener('change', onFileChange)
      gui.destroy()
      renderer.dispose()
      geo.dispose()
      mat.dispose()
      if (!wasDark) {
        document.body.classList.remove('dark')
        document.documentElement.classList.remove('dark')
      }
      document.body.classList.remove('audio-page')
      initRef.current = false
    }
  }, [])

  return (
    <>
      <div id="gui-container"></div>

      <main id="main" className="audio-main">
        <div id="visualizer"></div>
        <input type="file" id="audio-file" accept="audio/*" style={{ display: 'none' }} />

        <footer className="footer-strip">
          &copy; 2026 &bull; all rights reserved. &bull; &ldquo;繋 (つな) ぐ&rdquo;ということ
        </footer>
      </main>

      <div id="mobile-popup" className="mobile-popup">
        <div className="popup-header">
          <h4 className="popup-title">hey listen!</h4>
          <button id="close-popup" className="popup-close">ok</button>
        </div>
        <div className="popup-body">
          <p>this site is best experienced on desktop, so some functionality may be impacted on mobile. please check it out on desktop when you get the chance !</p>
        </div>
      </div>
    </>
  )
}
