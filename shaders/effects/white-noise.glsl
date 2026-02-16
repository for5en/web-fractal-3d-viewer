precision highp float;

// Standard
uniform float u_time;
uniform vec2 u_resolution;

// Effect
uniform sampler2D tDiffuse;
uniform float u_intensity;

// Camera
uniform vec3 u_pos;
uniform float u_fov;
uniform vec3 u_forward;
uniform vec3 u_up;
uniform vec3 u_right;


varying vec2 vUv;

void main() 
{
    vec4 previousColor = texture2D(tDiffuse, vUv);
    float noise = (fract(sin(dot(vUv, vec2(12.9898, 78.233) * u_time)) * 43758.5453)) * u_intensity;
    vec3 finalColor = previousColor.rgb + vec3(noise);
    
    gl_FragColor = vec4(finalColor, 1.0);
}