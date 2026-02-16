import * as THREE from 'three';
import { GUI } from 'lil-gui';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// --- 1. IMPORTY ZASOBÓW (Vite ?raw) ---
import vertexShader from './shaders/vertex.glsl?raw';

const baseShaderFile = import.meta.glob('./shaders/base-shader.glsl', { query: '?raw', eager: true });
const baseShaderSource = Object.values(baseShaderFile)[0].default;

const fractalFiles = import.meta.glob('./shaders/fractals/*.glsl', { query: '?raw', eager: true });
const effectFiles = import.meta.glob('./shaders/effects/*.glsl', { query: '?raw', eager: true });
const coloringFiles = import.meta.glob('./shaders/colorings/*.glsl', { query: '?raw', eager: true });


// --- 2. PRZYGOTOWANIE DANYCH (Z zachowaniem kolejności) ---



const formatName = (name) => {
    return name
        .replace(/^\d+-/, '') 
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
};

const processFiles = (files) => {
    const data = {};
    const options = {};

    
    const sortedPaths = Object.keys(files).sort();

    sortedPaths.forEach(path => {
        const fileName = path.split('/').pop().replace('.glsl', ''); 
        const prettyName = formatName(fileName); 
        
        data[fileName] = files[path].default;
        options[prettyName] = fileName; 
    });

    return { data, options };
};


const fractalResult = processFiles(fractalFiles);
const fractals = fractalResult.data;
const fractalOptions = fractalResult.options;

const effectResult = processFiles(effectFiles);
const effects = effectResult.data;
const effectOptions = effectResult.options;

const coloringResult = processFiles(coloringFiles);
const colorings = coloringResult.data;
const coloringOptions = coloringResult.options;


// --- 3. CONFIG I UNIFORMY ---
const config = {
    time_speed: 1.0,
    movement_speed: 1.0,
    mouse_sensitivity: 1.0,
    activeFractal: Object.values(fractalOptions)[0],
    activeEffect: Object.values(effectOptions)[0],
    activeColor: Object.values(coloringOptions)[0],
    effectIntensity: 0,

    cameraAnimationEnabled: false,
    cameraAnimationParams: { x: 0, y: 0, z: 0 },
    fractalAnimationEnabled: false,
    fractalAnimationParams: { speed: 1, powerMin: 1, powerMax: 2, xMin: -0.5, xMax: 0.5, yMin: -0.5, yMax: 0.5, zMin: -0.5, zMax: 0.5, wMin: -0.5, wMax: 0.5 },
    visionAREnabled: false,
};

const uniforms = {
    u_time: { value: 0 },
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },

    u_pos: { value: new THREE.Vector3(-3.0, 0.0, 0.0) },
    u_fov: { value: 1.0 },
    u_forward: { value: new THREE.Vector3(1.0, 0.0, 0.0) },
    u_up: { value: new THREE.Vector3(0.0, 1.0, 0.0) },
    u_right: { value: new THREE.Vector3(0.0, 0.0, 1.0) },

    u_power: { value: 5 },
    u_constant: { value: new THREE.Vector4(0.0, 0.0, 0.0, 0.0) },

    u_iterations: { value: 10 },
    u_steps: { value: 150 },
    u_accuracy: { value: 1 },
    u_bailout: { value: 5.0 },
    u_threshold: { value: 0.001 },
};

const fractalStates = {};

Object.keys(fractals).forEach(key => {
    fractalStates[key] = {
        config: JSON.parse(JSON.stringify(config)), 
        uniforms: {
            u_fov: uniforms.u_fov.value,

            u_pos: uniforms.u_pos.value.clone(),
            u_forward: uniforms.u_forward.value.clone(),
            u_up: uniforms.u_up.value.clone(),
            u_right: uniforms.u_right.value.clone(),

            u_power: uniforms.u_power.value,
            u_constant: uniforms.u_constant.value.clone(),

            u_iterations: uniforms.u_iterations.value,
            u_steps: uniforms.u_steps.value,
            u_accuracy: uniforms.u_accuracy.value,
            u_bailout: uniforms.u_bailout.value,
            u_threshold: uniforms.u_threshold.value
        }
    };
});


let prevFractal = config.activeFractal;;
function saveCurrentState() {
    
    const state = fractalStates[prevFractal];
    if (!state) return;

    state.config = JSON.parse(JSON.stringify(config));

    
    state.uniforms.u_fov = uniforms.u_fov.value;

    state.uniforms.u_pos.copy(uniforms.u_pos.value);
    state.uniforms.u_forward.copy(uniforms.u_forward.value);
    state.uniforms.u_up.copy(uniforms.u_up.value);
    state.uniforms.u_right.copy(uniforms.u_right.value);

    state.uniforms.u_power = uniforms.u_power.value;
    state.uniforms.u_constant.copy(uniforms.u_constant.value);

    state.uniforms.u_iterations = uniforms.u_iterations.value;
    state.uniforms.u_steps = uniforms.u_steps.value;
    state.uniforms.u_accuracy = uniforms.u_accuracy.value;
    state.uniforms.u_bailout = uniforms.u_bailout.value;
    state.uniforms.u_threshold = uniforms.u_threshold.value;
}

function loadFractalState(selectedKey) {
    const state = fractalStates[selectedKey];
    if (!state) return;

    
    const savedConfig = JSON.parse(JSON.stringify(state.config));
    
    
    config.time_speed = savedConfig.time_speed;
    config.movement_speed = savedConfig.movement_speed;
    config.mouse_sensitivity = savedConfig.mouse_sensitivity;
    config.effectIntensity = savedConfig.effectIntensity;
    config.activeColor = savedConfig.activeColor;
    config.activeEffect = savedConfig.activeEffect;
    
    
    Object.assign(config.fractalAnimationParams, savedConfig.fractalAnimationParams);
    
    
    config.fractalAnimationEnabled = savedConfig.fractalAnimationEnabled;
    config.cameraAnimationEnabled = savedConfig.cameraAnimationEnabled;
    config.visionAREnabled = savedConfig.visionAREnabled;

    
    uniforms.u_fov.value = state.uniforms.u_fov;
    uniforms.u_power.value = state.uniforms.u_power;
    uniforms.u_iterations.value = state.uniforms.u_iterations;
    uniforms.u_steps.value = state.uniforms.u_steps;
    uniforms.u_accuracy.value = state.uniforms.u_accuracy;
    uniforms.u_bailout.value = state.uniforms.u_bailout;
    uniforms.u_threshold.value = state.uniforms.u_threshold;

    uniforms.u_pos.value.copy(state.uniforms.u_pos);
    uniforms.u_forward.value.copy(state.uniforms.u_forward);
    uniforms.u_up.value.copy(state.uniforms.u_up);
    uniforms.u_right.value.copy(state.uniforms.u_right);
    uniforms.u_constant.value.copy(state.uniforms.u_constant);

    
    gui.controllersRecursive().forEach(c => c.updateDisplay());
}

const world_up = new THREE.Vector3(0.0, 1.0, 0.0);
const keys = {};

// --- 4. FUNKCJE SYSTEMOWE (Assembler i Sync) ---
function getComposedShader() {
    let shader = baseShaderSource;
    shader = shader.replace('#include <FRACTAL_DE>', fractals[config.activeFractal]);
    shader = shader.replace('#include <COLORING_LOGIC>', colorings[config.activeColor]);
    return shader;
}

function syncShader() {
    mesh.material.fragmentShader = getComposedShader();
    mesh.material.needsUpdate = true;
}

// --- 5. INICJALIZACJA THREE.JS (Core) ---
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- 6. OBIEKTY SCENY I POST-PROCESSING ---
const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: getComposedShader(),
        uniforms
    })
);
scene.add(mesh);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const customPass = new ShaderPass({
    uniforms: {
        'u_time': { value: 0 },
        'u_resolution': { value: uniforms.u_resolution.value },

        'tDiffuse': { value: null },
        'u_intensity': { value: config.effectIntensity },

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

// --- 7. GUI (Interfejs) ---
const gui = new GUI();

const addDynamicSliderAbs = (folder, target, prop, min, max, step, name) => {
    const controller = folder.add(target, prop, min, max, step).name(name).listen();
    controller.onFinishChange(value => {
        controller.max(Math.min(Math.max(value * 1.5, max), max * 20));
        controller.updateDisplay();
    });
    return controller;
};

const addDynamicSlider = (folder, target, prop, min, max, step, name) => {
    const controller = folder.add(target, prop, min, max, step).name(name).listen();
    controller.onFinishChange(val => {
        const v = Math.abs(val);
        controller.max(Math.max(max, Math.min(max * 20, v * 1.5)));
        controller.min(Math.min(min, Math.max(min * 20, -v * 1.5)));
        controller.updateDisplay();
    });
    return controller;
};

const addRangeSlider = (folder, target, propMin, propMax, min, max, step, name) => {
    
    const controllers = {};

    
    controllers.min = folder.add(target, propMin, min, max, step).name(name + ' Min').listen();
    controllers.min.onFinishChange(val => {
        const v = Math.abs(val);
        
        controllers.min.max(Math.max(max, Math.min(max * 20, v * 1.5)));
        controllers.min.min(Math.min(min, Math.max(min * 20, -v * 1.5)));
        
        
        if (target[propMin] > target[propMax]) {
            target[propMax] = target[propMin];
        }
        
        
    });

    
    controllers.max = folder.add(target, propMax, min, max, step).name(name + ' Max').listen();
    controllers.max.onFinishChange(val => {
        const v = Math.abs(val);
        
        controllers.max.max(Math.max(max, Math.min(max * 20, v * 1.5)));
        controllers.max.min(Math.min(min, Math.max(min * 20, -v * 1.5)));
        
        
        if (target[propMax] < target[propMin]) {
            target[propMin] = target[propMax];
        }

        
    });

    return controllers;
};


const cameraFolder = gui.addFolder('Camera');
addDynamicSliderAbs(cameraFolder, uniforms.u_fov, 'value', 0, 3, 0.01).name('Fov');
addDynamicSliderAbs(cameraFolder, config, 'time_speed', 0, 5, 0.01).name('Time speed');
addDynamicSliderAbs(cameraFolder, config, 'mouse_sensitivity', 1, 5, 0.1).name('Mouse Sensitivity');
addDynamicSliderAbs(cameraFolder, config, 'movement_speed', 1, 5, 0.1).name('Movement Speed');

const shaderFolder = gui.addFolder('Fractal');
shaderFolder.add(config, 'activeFractal', fractalOptions)
    .name('Choose fractal')
    .onChange((newFractalKey) => {
        
        saveCurrentState(); 

        
        loadFractalState(newFractalKey);

        
        prevFractal = newFractalKey;

        
        syncShader();
        if(config.fractalAnimationEnabled)
        {
            fractalAnimationFolder.show();
            fractalAnimationFolder.open();
            fractalFolder.hide();
        }
        else
        {
            fractalFolder.show();
            fractalFolder.open();
            fractalAnimationFolder.hide();
        }
    });

shaderFolder.add(config, 'activeColor', coloringOptions).name('Coloring Style').onChange(syncShader);

const fractalFolder = shaderFolder.addFolder('Fractal parameters');
addDynamicSlider(fractalFolder, uniforms.u_power, 'value', -5, 5).name('Power').decimals(3);
addDynamicSlider(fractalFolder, uniforms.u_constant.value, 'x', -2, 2).decimals(3).name('X');
addDynamicSlider(fractalFolder, uniforms.u_constant.value, 'y', -2, 2).decimals(3).name('Y');
addDynamicSlider(fractalFolder, uniforms.u_constant.value, 'z', -2, 2).decimals(3).name('Z');
addDynamicSlider(fractalFolder, uniforms.u_constant.value, 'w', -2, 2).decimals(3).name('W');

const fractalAnimationFolder = shaderFolder.addFolder('Fractal animation parameters');
fractalAnimationFolder.add(uniforms.u_power, 'value').name('Power').decimals(3).listen().disable();
addRangeSlider(fractalAnimationFolder, config.fractalAnimationParams, 'powerMin', 'powerMax', 0, 10, 0.1, 'Power');
fractalAnimationFolder.add(uniforms.u_constant.value, 'x').name('X').decimals(3).listen().disable();
addRangeSlider(fractalAnimationFolder, config.fractalAnimationParams, 'xMin', 'xMax', -2, 2, 0.01, 'Constant X');
fractalAnimationFolder.add(uniforms.u_constant.value, 'y').name('Y').decimals(3).listen().disable();
addRangeSlider(fractalAnimationFolder, config.fractalAnimationParams, 'yMin', 'yMax', -2, 2, 0.01, 'Constant Y');
fractalAnimationFolder.add(uniforms.u_constant.value, 'z').name('Z').decimals(3).listen().disable();
addRangeSlider(fractalAnimationFolder, config.fractalAnimationParams, 'zMin', 'zMax', -2, 2, 0.01, 'Constant Z');
fractalAnimationFolder.add(uniforms.u_constant.value, 'w').name('W').decimals(3).listen().disable();
addRangeSlider(fractalAnimationFolder, config.fractalAnimationParams, 'wMin', 'wMax', -2, 2, 0.01, 'Constant W');
fractalAnimationFolder.close().hide();

const renderFolder = shaderFolder.addFolder('Render settings');
addDynamicSliderAbs(renderFolder, uniforms.u_iterations, 'value', 1, 50, 1, 'Iterations');
addDynamicSliderAbs(renderFolder, uniforms.u_steps, 'value', 1, 300, 1, 'Ray Marching Steps');
addDynamicSliderAbs(renderFolder, uniforms.u_accuracy, 'value', 1, 10, 1, 'Accuracy');
addDynamicSliderAbs(renderFolder, uniforms.u_bailout, 'value', 1, 10, 0.1).name('Bailout');
addDynamicSliderAbs(renderFolder, uniforms.u_threshold, 'value', 0.0001, 0.01, 0.000001).name('Threshold');
renderFolder.close();

const folderEffect = gui.addFolder('Effect');
folderEffect.add(config, 'activeEffect', effectOptions).name('Choose effect').onChange((val) => {
    customPass.material.fragmentShader = effects[val];
    customPass.material.needsUpdate = true;
});
folderEffect.add(config, 'effectIntensity', 0, 1).name('Effect intensity');

const folderSpecial = gui.addFolder('Special');
folderSpecial.add(config, 'cameraAnimationEnabled').name('Camera animation').onChange();
folderSpecial.add(config, 'fractalAnimationEnabled').name('Fractal animation').onChange( enabled => {
    if(enabled)
    {
        fractalAnimationFolder.show();
        fractalAnimationFolder.open();
        fractalFolder.hide();
    }
    else
    {
        fractalFolder.show();
        fractalFolder.open();
        fractalAnimationFolder.hide();
    }
});
folderSpecial.add(config, 'visionAREnabled').name('Vision AR animation').onChange();


// --- 8. EVENT LISTENERS ---
window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    uniforms.u_resolution.value.set(w, h);
});

renderer.domElement.addEventListener('click', () => renderer.domElement.requestPointerLock());

window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === renderer.domElement) {
        const sensitivity = 0.002 * config.mouse_sensitivity;
        const f = uniforms.u_forward.value;
        let currentPitch = Math.asin(f.y);
        let currentYaw = Math.atan2(f.x, f.z);

        currentYaw += e.movementX * sensitivity;
        currentPitch -= e.movementY * sensitivity;
        currentPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, currentPitch));

        f.set(
            Math.sin(currentYaw) * Math.cos(currentPitch),
            Math.sin(currentPitch),
            Math.cos(currentYaw) * Math.cos(currentPitch)
        ).normalize();

        uniforms.u_right.value.crossVectors(world_up, f).normalize();
        uniforms.u_up.value.crossVectors(f, uniforms.u_right.value).normalize();
    }
});

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === ' ') e.preventDefault();
    keys[key] = true;
}, { capture: true });

window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

// --- 9. PĘTLA ANIMACJI ---
let time = 0.0;
let prev_t = performance.now();

function animate(t) {
    requestAnimationFrame(animate);
    if (!t) return;

    const dt = (t - prev_t) * 0.001;
    prev_t = t;
    time += dt * config.time_speed;

    if (config.fractalAnimationEnabled) {
        const ap = config.fractalAnimationParams;
        
        
        
        const wave = (Math.sin(time) + 1.0) * 0.5; 

        
        uniforms.u_power.value = ap.powerMin + (ap.powerMax - ap.powerMin) * wave;

        
        uniforms.u_constant.value.x = ap.xMin + (ap.xMax - ap.xMin) * wave;
        uniforms.u_constant.value.y = ap.yMin + (ap.yMax - ap.yMin) * wave;
        uniforms.u_constant.value.z = ap.zMin + (ap.zMax - ap.zMin) * wave;
        uniforms.u_constant.value.w = ap.wMin + (ap.wMax - ap.wMin) * wave;
    }

    if (document.pointerLockElement === renderer.domElement) {
        const moveSpeed = dt * config.movement_speed / 3.0;
        const pos = uniforms.u_pos.value;
        const fwd = uniforms.u_forward.value;
        const rgt = uniforms.u_right.value;

        if (keys['w']) pos.addScaledVector(fwd, moveSpeed);
        if (keys['s']) pos.addScaledVector(fwd, -moveSpeed);
        if (keys['d']) pos.addScaledVector(rgt, moveSpeed);
        if (keys['a']) pos.addScaledVector(rgt, -moveSpeed);
        if (keys[' ']) pos.addScaledVector(world_up, moveSpeed);
        if (keys['shift']) pos.addScaledVector(world_up, -moveSpeed);
    }

    uniforms.u_time.value = time;
    customPass.uniforms.u_time.value = time;
    customPass.uniforms.u_intensity.value = config.effectIntensity;

    composer.render();
}

animate();
