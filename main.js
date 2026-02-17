import * as THREE from 'three';
import { GUI } from 'lil-gui';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";



///////////////////////////////////////////////////////////////////////////////
//
//        --- 1. ASSET IMPORT & SHADER PREPARATION  ---
//
///////////////////////////////////////////////////////////////////////////////

import vertexShader from './shaders/vertex.glsl?raw';

const baseShaderFile = import.meta.glob('./shaders/base-shader.glsl', { query: '?raw', eager: true });
const baseShaderSource = Object.values(baseShaderFile)[0].default;

const mode3dShaderFile = import.meta.glob('./shaders/mode-3d.glsl', { query: '?raw', eager: true });
const mode3dShaderSource = Object.values(mode3dShaderFile)[0].default;

const modeNormalShaderFile = import.meta.glob('./shaders/mode-normal.glsl', { query: '?raw', eager: true });
const modeNormalShaderSource = Object.values(modeNormalShaderFile)[0].default;

const fractalFiles = import.meta.glob('./shaders/fractals/*.glsl', { query: '?raw', eager: true });
const effectFiles = import.meta.glob('./shaders/effects/*.glsl', { query: '?raw', eager: true });
const coloringFiles = import.meta.glob('./shaders/colorings/*.glsl', { query: '?raw', eager: true });

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



///////////////////////////////////////////////////////////////////////////////
//
//        --- 2. INITIAL CONFIGURATION & UNIFORMS  ---
//
///////////////////////////////////////////////////////////////////////////////

const config = {
    time_speed: 1.0,
    movement_speed: 1.0,
    mouse_sensitivity: 1.0,
    activeFractal: Object.values(fractalOptions)[0],
    activeEffect: Object.values(effectOptions)[0],
    activeColor: Object.values(coloringOptions)[0],
    effectIntensity: 0.0,

    cameraAnimationEnabled: false,
    cameraAnimationParams: { x: 0, y: 0, z: 0 },
    fractalAnimationEnabled: false,
    fractalAnimationParams: { speed: 1, powerMin: 1, powerMax: 2, xMin: -0.5, xMax: 0.5, yMin: -0.5, yMax: 0.5, zMin: -0.5, zMax: 0.5, wMin: -0.5, wMax: 0.5 },
    holographicModeEnabled: false,
    anaglyph3DEnabled: false
};

const uniforms = {
    // Standard
    u_time: { value: 0 },
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },

    // Camera
    u_pos: { value: new THREE.Vector3(-3.0, 0.0, 0.0) },
    u_fov: { value: 1.0 },
    u_forward: { value: new THREE.Vector3(1.0, 0.0, 0.0) },
    u_up: { value: new THREE.Vector3(0.0, 1.0, 0.0) },
    u_right: { value: new THREE.Vector3(0.0, 0.0, 1.0) },

    // Fractal
    u_power: { value: 5 },
    u_constant: { value: new THREE.Vector4(0.0, 0.0, 0.0, 0.0) },

    // Render
    u_iterations: { value: 10 },
    u_steps: { value: 150 },
    u_accuracy: { value: 1 },
    u_bailout: { value: 5.0 },
    u_threshold: { value: 0.001 },

    // Super 3D
    u_leye: { value: new THREE.Vector3() },
    u_reye: { value: new THREE.Vector3() },
    u_ipd: { value: 0.08 }
};



///////////////////////////////////////////////////////////////////////////////
//
//        --- 3. STATE MANAGEMENT  ---
//
///////////////////////////////////////////////////////////////////////////////

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
            u_threshold: uniforms.u_threshold.value,

            u_leye: uniforms.u_leye.value.clone(),
            u_reye: uniforms.u_reye.value.clone(),
            u_ipd: uniforms.u_ipd.value
        }
    };
});

let prevFractal = config.activeFractal;

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

    state.uniforms.u_leye.copy(uniforms.u_leye.value);
    state.uniforms.u_reye.copy(uniforms.u_leye.value);
    state.uniforms.u_ipd = uniforms.u_ipd.value;
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
    config.holographicModeEnabled = savedConfig.holographicModeEnabled;
    config.anaglyph3DEnabled = savedConfig.anaglyph3DEnabled;

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

    uniforms.u_leye.value.copy(state.uniforms.u_leye);
    uniforms.u_reye.value.copy(state.uniforms.u_leye);
    uniforms.u_ipd.value = state.uniforms.u_ipd;
    
    gui.controllersRecursive().forEach(c => c.updateDisplay());
}



///////////////////////////////////////////////////////////////////////////////
//
//        --- 4. RENDERING & SHADER ASSEMBLY  ---
//
///////////////////////////////////////////////////////////////////////////////

function getComposedShader() {
    let shader = baseShaderSource;
    const fractalCode = fractals[config.activeFractal];

    shader = shader.replace('#include <FRACTAL_DE>', fractalCode);
    shader = shader.replace('#include <COLORING_LOGIC>', colorings[config.activeColor]);
    if(config.anaglyph3DEnabled) shader = shader.replace('#include <SHADER_MODE>', mode3dShaderSource);
    else shader = shader.replace('#include <SHADER_MODE>', modeNormalShaderSource);

    return shader;
}

function syncShader() {
    mesh.material.fragmentShader = getComposedShader();
    mesh.material.needsUpdate = true;
}

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

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

function updateCustomPass()
{
    customPass.uniforms.u_time.value = uniforms.u_time.value;
    customPass.uniforms.u_resolution.value = uniforms.u_resolution.value;

    customPass.uniforms.u_intensity.value = config.effectIntensity;

    customPass.uniforms.u_pos.value = uniforms.u_pos.value;
    customPass.uniforms.u_fov.value = uniforms.u_fov.value;
    customPass.uniforms.u_forward.value = uniforms.u_forward.value;
    customPass.uniforms.u_up.value = uniforms.u_up.value;
    customPass.uniforms.u_right.value = uniforms.u_right.value;
}

///////////////////////////////////////////////////////////////////////////////
//
//        --- 5. USER INTERFACE (GUI)  ---
//
///////////////////////////////////////////////////////////////////////////////

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
addDynamicSliderAbs(cameraFolder, uniforms.u_ipd, 'value', 0, 1, 0.01).name('Ipd');

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
            fractalAnimationFolder.show().open();
            fractalFolder.hide();
        }
        else
        {
            fractalFolder.show().open();
            fractalAnimationFolder.hide();
        }
        if(!config.holographicModeEnabled) anaglyphController.hide();
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
folderEffect.add(config, 'effectIntensity', 0, 1).name('Effect intensity').listen();

const folderSpecial = gui.addFolder('Special');
folderSpecial.add(config, 'cameraAnimationEnabled').name('Camera Animation').onChange();
folderSpecial.add(config, 'fractalAnimationEnabled').name('Fractal Animation').onChange( enabled => {
    if(enabled)
    {
        fractalAnimationFolder.show().open();
        fractalFolder.hide();
    }
    else
    {
        fractalFolder.show().open();
        fractalAnimationFolder.hide();
    }
});

folderSpecial.add(config, 'holographicModeEnabled')
    .name('Holographic Mode')
    .listen()
    .onChange((enabled) => {
        if (enabled) {
            anaglyphController.show();
        } else {
            config.anaglyph3DEnabled = false;
            anaglyphController.hide();
        }
        syncShader();
    });

const anaglyphController = folderSpecial.add(config, 'anaglyph3DEnabled')
    .name('Anaglyph 3D')
    .onChange(syncShader)
    .listen()
    .disable()
    .hide();



///////////////////////////////////////////////////////////////////////////////
//
//        --- 6. INPUT HANDLING & EVENT LISTENERS  ---
//
///////////////////////////////////////////////////////////////////////////////

const world_up = new THREE.Vector3(0.0, 1.0, 0.0);
const keys = {};

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



///////////////////////////////////////////////////////////////////////////////
//
//        --- 7. FACE TRACKING (VISION AR)  ---
//
///////////////////////////////////////////////////////////////////////////////

let faceData = {
    x: 0.5,
    y: 0.5,
    distance: 0,
    detected: false
};

let faceLandmarker;
let isInitializing = false;
let video;

async function setupFaceTracking() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numFaces: 1
    });

    video = document.createElement('video');
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.play();
    anaglyphController.enable();
}

function updateFaceTracking() {
    if (!faceLandmarker || !video || video.readyState < 2)
    {
        faceData.detected = false;
        return;
    }

    const results = faceLandmarker.detectForVideo(video, performance.now());
    
    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const points = results.faceLandmarks[0];
        const leftEye = points[468]; 
        const rightEye = points[473];

        faceData.x = (leftEye.x + rightEye.x) / 2;
        faceData.y = (leftEye.y + rightEye.y) / 2;
        faceData.roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
        faceData.leftEyeRaw = leftEye;
        faceData.rightEyeRaw = rightEye;

        faceData.distance = Math.sqrt(
            Math.pow(rightEye.x - leftEye.x, 2) +
            Math.pow(rightEye.y - leftEye.y, 2) +
            Math.pow(rightEye.z - leftEye.z, 2)
        );
        
        faceData.detected = true;
    } else {
        faceData.detected = false;
    }
}



///////////////////////////////////////////////////////////////////////////////
//
//        --- 8. ANIMATION LOOP & CORE LOGIC  ---
//
///////////////////////////////////////////////////////////////////////////////

let time = 0.0;
let prev_t = performance.now();

let smoothedFace = { x: 0.5, y: 0.5, z: 0.1 };
const FACE_LERP = 0.5;
let startFaceDist = -1;

function animate(t) {
    requestAnimationFrame(animate);
    if (!t) return;

    const dt = (t - prev_t) * 0.001;
    prev_t = t;
    time += dt * config.time_speed;

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

    let base_pos = uniforms.u_pos.value.clone();
    let base_fwd = uniforms.u_forward.value.clone();
    let base_rgt = uniforms.u_right.value.clone();
    let base_up = uniforms.u_up.value.clone();

    if(config.holographicModeEnabled) 
    {
        console.log(config.anaglyph3DEnabled,config.holographicModeEnabled, faceData.detected, uniforms.u_ipd.value);
        if(!video && !isInitializing)
        {
            setupFaceTracking();
            isInitializing = true;
        }
        updateFaceTracking(); 
        if (faceData.detected) {
            smoothedFace.x += (faceData.x - smoothedFace.x) * FACE_LERP;
            smoothedFace.y += (faceData.y - smoothedFace.y) * FACE_LERP;
            smoothedFace.z += (faceData.distance - smoothedFace.z) * 0.1;

            if (startFaceDist === -1) startFaceDist = faceData.distance;

            const sensitivity = 5.0; 
            const dx = (0.5 - smoothedFace.x) * sensitivity;
            const dy = (0.5 - smoothedFace.y) * sensitivity;
            const dz = (smoothedFace.z - startFaceDist) * 10.0;

            let temp_pos = base_pos.clone()
                .addScaledVector(base_rgt, dx)
                .addScaledVector(base_up, dy)
                .addScaledVector(base_fwd, dz);

            const focusDist = 5.0; 
            let screen_center = base_pos.clone().addScaledVector(base_fwd, focusDist);
            let temp_fwd = screen_center.clone().sub(temp_pos).normalize();

            let eyeL = temp_pos.clone().addScaledVector(base_rgt, uniforms.u_ipd.value * 0.5); 
            let eyeR = temp_pos.clone().addScaledVector(base_rgt, -uniforms.u_ipd.value * 0.5);

            uniforms.u_pos.value.copy(temp_pos);
            uniforms.u_forward.value.copy(temp_fwd);
            uniforms.u_right.value.copy(base_rgt);
            uniforms.u_up.value.copy(base_up);

            if (uniforms.u_leye?.value) uniforms.u_leye.value.copy(eyeL);
            if (uniforms.u_reye?.value) uniforms.u_reye.value.copy(eyeR);

        } else {
            startFaceDist = -1;
        }
    }

    if (config.fractalAnimationEnabled) {
        const ap = config.fractalAnimationParams;
        const wave = (Math.sin(time) + 1.0) * 0.5; 

        uniforms.u_power.value = ap.powerMin + (ap.powerMax - ap.powerMin) * wave;
        uniforms.u_constant.value.x = ap.xMin + (ap.xMax - ap.xMin) * wave;
        uniforms.u_constant.value.y = ap.yMin + (ap.yMax - ap.yMin) * wave;
        uniforms.u_constant.value.z = ap.zMin + (ap.zMax - ap.zMin) * wave;
        uniforms.u_constant.value.w = ap.wMin + (ap.wMax - ap.wMin) * wave;
    }

    uniforms.u_time.value = time;
    updateCustomPass();
    composer.render();

    uniforms.u_pos.value.copy(base_pos);
    uniforms.u_forward.value.copy(base_fwd);
    uniforms.u_right.value.copy(base_rgt);
    uniforms.u_up.value.copy(base_up);
}

animate();