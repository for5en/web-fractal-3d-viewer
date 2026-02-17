float aspect = u_resolution.x / u_resolution.y;
vec2 screen_coords = (vUv * 2.0 - 1.0);
screen_coords.x *= aspect;

vec3 ray_dir = normalize(u_forward + screen_coords.x * u_fov * u_right + screen_coords.y * u_fov * u_up);

float step_multiplier = 1.0 / u_accuracy;

vec3 zL = u_leye;
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

vec3 zR = u_reye;
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

float left_gray  = (colorL.r * 0.30 + colorL.g * 0.59 + colorL.b * 0.11);
float right_gray = (colorR.r * 0.30 + colorR.g * 0.59 + colorR.b * 0.11);

vec4 final_col = vec4(left_gray, right_gray, right_gray, 1.0);

float ghost_fix = 0.15; 
final_col.r = clamp(final_col.r - (right_gray * ghost_fix), 0.0, 1.0);

final_col.rgb *= pow(16.0 * vUv.x * vUv.y * (1.0 - vUv.x) * (1.0 - vUv.y), 0.3);

gl_FragColor = 1.5 * pow(final_col, vec4(0.6, 0.6, 0.6, 1.0));