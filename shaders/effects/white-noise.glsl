precision highp float;

// Standard
uniform float u_time;
uniform vec2 u_resolution;

// Effect
uniform sampler2D tDiffuse; // To jest obraz z Twojego pierwszego, kolorowego shadera
uniform float u_intensity;




varying vec2 vUv;

void main() {
    // 1. POBIERZ KOLOR Z PIERWSZEGO SHADERA
    vec4 previousColor = texture2D(tDiffuse, vUv);

    // 2. DODAJ EFEKT (np. ziarno/szum)
    float noise = (fract(sin(dot(vUv, vec2(12.9898, 78.233) * u_time)) * 43758.5453)) * u_intensity;

    // 3. POŁĄCZ JE (np. dodaj szum do koloru)
    vec3 finalColor = previousColor.rgb + vec3(noise);

    gl_FragColor = vec4(finalColor, 1.0);
}