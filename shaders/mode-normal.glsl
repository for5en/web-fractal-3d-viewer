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