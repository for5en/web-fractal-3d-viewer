float aspect = u_resolution.x / u_resolution.y;
vec2 screen_coords = (vUv * 2.0 - 1.0);
screen_coords.x *= aspect;

// Kierunek promienia (taki sam dla obu oczu, bo patrzymy na ten sam piksel monitora)
vec3 ray_dir = normalize(u_forward + screen_coords.x * u_fov * u_right + screen_coords.y * u_fov * u_up);

float step_multiplier = 1.0 / u_accuracy;

// --- RENDERING LEWEGO OKA (CZERWONY) ---
vec3 zL = u_leye; // Startujemy z pozycji lewego oka
float total_distL = 0.0;
bool hitL = false;

for (int i = 0; i < int(u_steps); i++) 
{
    float dist = fractalDE(zL);
    zL += ray_dir * dist * step_multiplier;
    total_distL += dist * step_multiplier;
    if (dist * step_multiplier < u_threshold) {
        hitL = true;
        break;
    }
    if (total_distL > u_bailout) break;
}
vec3 colorL = calculate_color(hitL, zL).rgb;

// --- RENDERING PRAWEGO OKA (TURKUSOWY) ---
vec3 zR = u_reye; // Startujemy z pozycji prawego oka
float total_distR = 0.0;
bool hitR = false;

for (int i = 0; i < int(u_steps); i++) 
{
    float dist = fractalDE(zR);
    zR += ray_dir * dist * step_multiplier;
    total_distR += dist * step_multiplier;
    if (dist * step_multiplier < u_threshold) {
        hitR = true;
        break;
    }
    if (total_distR > u_bailout) break;
}
vec3 colorR = calculate_color(hitR, zR).rgb;

// --- SKŁADANIE ANAGLIFU ---
// Czerwony z lewego oka, Zielony i Niebieski z prawego
gl_FragColor = vec4(colorL.r, colorR.g, colorR.b, 1.0);