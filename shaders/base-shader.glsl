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


varying vec2 vUv;

// --- MODULES ---
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

// --- MAIN LOGIC ---
void main() {
    // 1. Coords Mapping
    float aspect = u_resolution.x / u_resolution.y;
    vec2 screen_coords = (vUv * 2.0 - 1.0);
    screen_coords.x *= aspect;

    // 2. Ray Direction
    vec3 ray_dir = normalize(u_forward + screen_coords.x * u_fov * u_right + screen_coords.y * u_fov * u_up);

    // 3. Raymarching
    vec3 z = u_pos;
    float step_multiplier = 1.0 / u_accuracy;
    float total_dist = 0.0;
    bool hit = false;

    for (int i = 0; i < int(u_steps); i++) 
    {
        float dist = fractalDE(z);
        z += ray_dir * dist * step_multiplier;
        total_dist += dist * step_multiplier;

        if (dist * step_multiplier < u_threshold) {
            hit = true;
            break;
        }
        
        if (total_dist > u_bailout) break;
    }

    // 4. Final color
    gl_FragColor = calculate_color(hit, z);
}