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


/*
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


// --- MAIN LOGIC ---
void main() {
    // 1. Coords Mapping
    float aspect = u_resolution.x / u_resolution.y;
    vec2 screen_coords = (vUv * 2.0 - 1.0);
    screen_coords.x *= aspect;

    // --- LOGIKA STEREOSKOPOWA (ANAGLIF) ---
    // Rozstaw oczu (możesz go zmienić na uniform, by sterować nim z JS)
    float eye_sep = 0.03; 
    
    // Obliczamy dwa punkty startowe (lewe i prawe oko)
    vec3 posL = u_pos - u_right * eye_sep;
    vec3 posR = u_pos + u_right * eye_sep;

    // Ray Direction (taki sam dla obu oczu dla uproszczenia, lub lekko zbieżny)
    vec3 ray_dir = normalize(u_forward + screen_coords.x * u_fov * u_right + screen_coords.y * u_fov * u_up);

    // --- RAYMARCHING LEWE OKO ---
    vec3 zL = posL;
    float total_distL = 0.0;
    bool hitL = false;
    float step_multiplier = 1.0 / u_accuracy;

    for (int i = 0; i < int(u_steps); i++) {
        float dist = fractalDE(zL);
        zL += ray_dir * dist * step_multiplier;
        total_distL += dist * step_multiplier;
        if (dist * step_multiplier < u_threshold) { hitL = true; break; }
        if (total_distL > u_bailout) break;
    }
    vec4 colL = calculate_color(hitL, zL);

    // --- RAYMARCHING PRAWE OKO ---
    vec3 zR = posR;
    float total_distR = 0.0;
    bool hitR = false;

    for (int i = 0; i < int(u_steps); i++) {
        float dist = fractalDE(zR);
        zR += ray_dir * dist * step_multiplier;
        total_distR += dist * step_multiplier;
        if (dist * step_multiplier < u_threshold) { hitR = true; break; }
        if (total_distR > u_bailout) break;
    }
    vec4 colR = calculate_color(hitR, zR);

    // --- ŁĄCZENIE (ANAGLYPH MASK) ---
    // Lewe oko (czerwone szkło) dostaje kanał czerwony z lewego renderu
    // Prawe oko (niebieskie szkło) dostaje kanały zielony i niebieski z prawego renderu
    
    float red_darkness = 0.7; // Przyciemnienie (1.0 = bez zmian, 0.5 = znacznie ciemniej)
    float red_gamma = 1.2;    // Kontrast czerwieni (podbija głębokie czerwienie, wygasza jasne)

    vec3 final_color;
    
    // Modyfikujemy kanał czerwony dla lewego oka
    float corrected_red = pow(colL.r, red_gamma) * red_darkness;
    
    final_color.r = corrected_red; 
    final_color.g = colR.g;
    final_color.b = colR.b;

    gl_FragColor = vec4(final_color, 1.0);
}
*/