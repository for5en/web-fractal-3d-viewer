import * as THREE from 'three';
import { GUI } from 'lil-gui';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// --- 1. DYNAMICZNY IMPORT SHADERÓW (Vite) ---
import vertexShader from './shaders/vertex.glsl?raw';

const world_up = new THREE.Vector3(0.0, 1.0, 0.0);

// Automatyczne skanowanie folderów
const fractalFiles = import.meta.glob('./shaders/fractals/*.glsl', { query: '?raw', eager: true });
const effectFiles = import.meta.glob('./shaders/effects/*.glsl', { query: '?raw', eager: true });

const fractals = {};
for (const path in fractalFiles) {
    const name = path.split('/').pop().replace('.glsl', '');
    fractals[name] = fractalFiles[path].default;
}

const effects = {};
for (const path in effectFiles) {
    const name = path.split('/').pop().replace('.glsl', '');
    effects[name] = effectFiles[path].default;
}

// Funkcja formatująca nazwy (np. "neon-lava" -> "Neon Lava")
const formatName = (name) => {
    return name
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

// Mapowanie dla GUI: { "Ładna Nazwa": "techniczny-klucz" }
const fractalOptions = {};
Object.keys(fractals).forEach(key => fractalOptions[formatName(key)] = key);

const effectOptions = {};
Object.keys(effects).forEach(key => effectOptions[formatName(key)] = key);

// --- 2. KONFIGURACJA SCENY ---
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- 3. PARAMETRY I UNIFORMY ---
const config = {
    time_speed: 1.0,
    movement_speed: 1.0,
    mouse_sensitivity: 1.0,
    activeFractal: fractalOptions[Object.keys(fractalOptions)[0]], // Pobiera klucz pierwszego elementu
    activeEffect: effectOptions[Object.keys(effectOptions)[0]],   // Pobiera klucz pierwszego elementu
    effectIntensity: 0,
};

const uniforms = {
    // Standard
    u_time: { value: 0 },
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },

    // Camera
    u_pos: { value: new THREE.Vector3(-3.0, 0.0, 0.0) },
    u_fov: { value: 1.5 },
    u_forward: { value: new THREE.Vector3(1.0, 0.0, 0.0) },
    u_up: { value: new THREE.Vector3(0.0, 1.0, 0.0) },
    u_right: { value: new THREE.Vector3(0.0, 0.0, 1.0) },
    
    // Fractal
    u_power: { value: 10 },
    u_constant: { value: new THREE.Vector4(0.0, 0.0, 0.0, 0.0) },

    // Render
    u_iterations: { value: 10 },
    u_steps: { value: 150 },
    u_bailout: { value: 5.0 },
    u_threshold: { value: 0.001 },
};

// --- 4. OBIEKTY I COMPOSER ---
// Shader 1: Główny Mesh
const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: fractals[config.activeFractal],
        uniforms
    })
);
scene.add(mesh);

// Setup Composera (Post-processing)
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const customPass = new ShaderPass({
    uniforms: {
        // Standard
        'u_time': { value: 0 },
        'u_resolution': { value: uniforms.u_resolution.value },

        // Effect
        'tDiffuse': { value: null },
        'u_intensity': { value: config.effectIntensity },

        // Camera
        'u_pos': { value: new THREE.Vector3(0.0, 0.0, 0.0) },
        'u_fov': { value: 0 },
        'u_forward': { value: new THREE.Vector3(0.0, 0.0, 0.0) },
        'u_up': { value: new THREE.Vector3(0.0, 0.0, 0.0) },
        'u_right': { value: new THREE.Vector3(0.0, 0.0, 0.0) },
    },
    vertexShader,
    fragmentShader: effects[config.activeEffect]
});
composer.addPass(customPass);

// --- 5. GUI (Interfejs użytkownika) ---
const gui = new GUI();
const addDynamicSliderAbs = (folder, target, prop, min, max, step, name) => {
    const controller = folder.add(target, prop, min, max, step).name(name).listen();
    
    controller.onFinishChange(value => {
        const defaultMax = max;
        const maxMax = max * 20;
        
        // "controller" zawsze odnosi się do tego konkretnego suwaka
        const newMax = Math.min(Math.max(value * 1.5, defaultMax), maxMax);
        
        controller.max(newMax);
        controller.updateDisplay();
    });
    
    return controller;
};

const addDynamicSlider = (folder, target, prop, min, max, step, name) => {
    const controller = folder.add(target, prop, min, max, step).name(name).listen();
    
    controller.onFinishChange(val => {
        const value = Math.abs(val);

        const defaultMax = max;
        const defaultMin = min;
        const maxMax = max * 20;
        const maxMin = min * 20;
        
        // "controller" zawsze odnosi się do tego konkretnego suwaka
        const newMax = Math.max(defaultMax, Math.min(maxMax, value * 1.5));
        const newMin = Math.min(defaultMin, Math.max(maxMin, -value * 1.5));
        
        controller.max(newMax);
        controller.min(newMin);
        controller.updateDisplay();
    });
    
    return controller;
};

const folderCamera = gui.addFolder('Camera');
addDynamicSliderAbs(folderCamera, uniforms.u_fov, 'value', 0, 5).name('Fov');
addDynamicSliderAbs(folderCamera, config, 'time_speed', 0, 5).name('Time speed');
addDynamicSliderAbs(folderCamera, config, 'mouse_sensitivity', 1, 5, 0.1).name('Mouse Sensitivity');
addDynamicSliderAbs(folderCamera, config, 'movement_speed', 1, 5, 0.1).name('Movement Speed');
folderCamera.open();

const folderShader = gui.addFolder('Fractal');
folderShader.add(config, 'activeFractal', fractalOptions).name('Choose fractal').onChange((val) => {
    mesh.material.fragmentShader = fractals[val];
    mesh.material.needsUpdate = true;
});

addDynamicSlider(folderShader, uniforms.u_power, 'value', -5, 5).name('Power');

const constantFolder = folderShader.addFolder('Fractal constant');
addDynamicSlider(constantFolder, uniforms.u_constant.value, 'x', -2, 2).name('X');
addDynamicSlider(constantFolder, uniforms.u_constant.value, 'y', -2, 2).name('Y');
addDynamicSlider(constantFolder, uniforms.u_constant.value, 'z', -2, 2).name('Z');
addDynamicSlider(constantFolder, uniforms.u_constant.value, 'w', -2, 2).name('W');
constantFolder.open();

addDynamicSliderAbs(folderShader, uniforms.u_iterations, 'value', 1, 50, 1, 'Iterations');
addDynamicSliderAbs(folderShader, uniforms.u_steps, 'value', 1, 300, 1, 'Ray Marching Steps');
addDynamicSliderAbs(folderShader, uniforms.u_bailout, 'value', 1, 10, 0.1).name('Bailout');
addDynamicSliderAbs(folderShader, uniforms.u_threshold, 'value', 0.0001, 0.01, 0.000001).name('Threshold');
folderShader.open();

const folderEffect = gui.addFolder('Special Effect');
folderEffect.add(config, 'activeEffect', effectOptions).name('Choose effect').onChange((val) => {
    customPass.material.fragmentShader = effects[val];
    customPass.material.needsUpdate = true;
});
folderEffect.add(config, 'effectIntensity', 0, 1).name('Effect intensity');
folderEffect.open();

// --- 6. OBSŁUGA ZDARZEŃ I ANIMACJA ---
window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    uniforms.u_resolution.value.set(w, h);
});

// --- 7. MYSZ - RUCH KAMERY ---
renderer.domElement.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== renderer.domElement) {
        console.log('Myszka zwolniona');
    } else {
        console.log('Myszka zablokowana');
    }
});

window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === renderer.domElement) {
        const sensitivity = 0.002 * config.mouse_sensitivity;
        const f = uniforms.u_forward.value;

        // 1. Rekonstrukcja kątów z aktualnego wektora Forward
        // Pitch (góra/dół) to arkus sinus składowej Y
        let currentPitch = Math.asin(f.y);
        
        // Yaw (lewo/prawo) to arkus tangens składowych X i Z
        let currentYaw = Math.atan2(f.x, f.z);

        // 2. Dodanie ruchu myszy
        currentYaw += e.movementX * sensitivity;
        currentPitch -= e.movementY * sensitivity;

        // 3. Clamp (blokada góra/dół)
        currentPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, currentPitch));

        // 4. Aktualizacja u_forward
        f.set(
            Math.sin(currentYaw) * Math.cos(currentPitch),
            Math.sin(currentPitch),
            Math.cos(currentYaw) * Math.cos(currentPitch)
        ).normalize();

        // 5. Aktualizacja bazy (u_right i u_up)
        uniforms.u_right.value.crossVectors(world_up, f).normalize();
        uniforms.u_up.value.crossVectors(f, uniforms.u_right.value).normalize();
    }
});

// --- 8. KLAWIATURA - RUCH KAMERY ---
const keys = {};

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    
    // Blokujemy tylko Spację, żeby nie skakała strona
    if (key === ' ') e.preventDefault();
    
    keys[key] = true;
}, { capture: true });

window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

let time = 0.0;
let prev_t = performance.now();

function animate(t) {
    if (!t) { // Jeśli t jest undefined (pierwsze wywołanie)
        requestAnimationFrame(animate);
        return;
    }

    const dt = (t - prev_t) * 0.001; 
    prev_t = t;

    time += dt * config.time_speed;
    
    // --- OBSŁUGA RUCHU ---
    if (document.pointerLockElement === renderer.domElement)
    {
        const moveSpeed = dt * config.movement_speed / 3.0; // Prędkość z Twojego GUI
        const pos = uniforms.u_pos.value;
        const fwd = uniforms.u_forward.value;
        const rgt = uniforms.u_right.value;

        if (keys['w']) pos.addScaledVector(fwd, moveSpeed);
        if (keys['s']) pos.addScaledVector(fwd, -moveSpeed);
        if (keys['d']) pos.addScaledVector(rgt, moveSpeed);
        if (keys['a']) pos.addScaledVector(rgt, -moveSpeed);
        if (keys[' ']) pos.addScaledVector(world_up, moveSpeed);  // Lot w górę
        if (keys['shift']) pos.addScaledVector(world_up, -moveSpeed); // Lot w dół
    }

    // Synchronizacja czasu i parametrów
    uniforms.u_time.value = time;
    customPass.uniforms.u_time.value = time;
    customPass.uniforms.u_intensity.value = config.effectIntensity;

    composer.render();
    requestAnimationFrame(animate);
}

animate();