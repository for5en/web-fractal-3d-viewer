precision highp float;

// Standard
uniform float u_time;
uniform vec2 u_resolution;

// Camera
uniform vec3 u_pos;
uniform float u_fov;
uniform vec3 u_forward;
uniform vec3 u_up;
uniform vec3 u_right;

// Fractal
uniform float u_power;
uniform vec4 u_constant;

// Render
uniform int u_iterations;
uniform float u_steps;
uniform float u_accuracy;
uniform float u_bailout;
uniform float u_threshold;

// 3D Anaglif
uniform vec3 u_leye;
uniform vec3 u_reye;

varying vec2 vUv;

#include <FRACTAL_DE>

vec3 calc_normal(vec3 p) 
{
    float eps = u_threshold;
    vec3 n = vec3(
        fractalDE(p + vec3(eps, 0.0, 0.0)) - fractalDE(p - vec3(eps, 0.0, 0.0)),
        fractalDE(p + vec3(0.0, eps, 0.0)) - fractalDE(p - vec3(0.0, eps, 0.0)),
        fractalDE(p + vec3(0.0, 0.0, eps)) - fractalDE(p - vec3(0.0, 0.0, eps))
    );
    return normalize(n);
}

#include <COLORING_LOGIC>

void main() {
    #include <SHADER_MODE>
}