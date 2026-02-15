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
uniform float u_bailout;
uniform float u_threshold;


varying vec2 vUv;

// --- FUNKCJA DYSTANSU (DE) ---
float juliabulbDE(vec3 p) {
    vec3 z = p;
    vec3 c = u_constant.xyz;
    float dr = 1.0;
    float r = 0.0;

    for (int i = 0; i < 1000; i++) { // W GLSL pętla musi mieć stały limit lub break
        if (i >= u_iterations) break;

        r = length(z);
        if (r > 4.0) break;

        // Konwersja na współrzędne sferyczne
        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x); // atan2 w WGSL to atan(y, x) w GLSL

        // Pochodna (Distance Estimation)
        dr = pow(r, u_power - 1.0) * u_power * dr + 1.0;

        // Podniesienie do potęgi (Scale & Rotate)
        float zr = pow(r, u_power);
        float theta_p = theta * u_power;
        float phi_p = phi * u_power;

        z = zr * vec3(
            sin(theta_p) * cos(phi_p),
            sin(theta_p) * sin(phi_p),
            cos(theta_p)
        ) + c;
    }

    return 0.5 * log(r) * r / dr;
}

// --- OBLICZANIE NORMALNYCH ---
vec3 calc_normal(vec3 p) {
    float eps = u_threshold;
    vec3 n = vec3(
        juliabulbDE(p + vec3(eps, 0.0, 0.0)) - juliabulbDE(p - vec3(eps, 0.0, 0.0)),
        juliabulbDE(p + vec3(0.0, eps, 0.0)) - juliabulbDE(p - vec3(0.0, eps, 0.0)),
        juliabulbDE(p + vec3(0.0, 0.0, eps)) - juliabulbDE(p - vec3(0.0, 0.0, eps))
    );
    return normalize(n);
}

// --- KOLOROWANIE (RAINBOW GLOSS) ---
vec4 rainbow_gloss(bool hit, vec3 z, vec3 cam_pos) {
    if (!hit) return vec4(0.0, 0.0, 0.0, 1.0); // Czarny kosmos

    vec3 normal = calc_normal(z);
    vec3 light_dir = normalize(vec3(-0.5, 1.0, -0.5));
    vec3 view_dir = normalize(cam_pos - z);

    float fresnel = pow(1.0 - max(dot(normal, view_dir), 0.0), 3.0);
    vec3 base_color = 0.5 + 0.5 * normal;
    
    vec3 rainbow = vec3(
        0.5 + 0.5 * sin(z.x * 3.0 + u_time),
        0.5 + 0.5 * sin(z.y * 5.0 + u_time),
        0.5 + 0.5 * sin(z.z * 7.0 + u_time)
    );

    float diffuse = max(dot(normal, light_dir), 0.0);
    vec3 final_color = mix(base_color * (0.2 + 0.7 * diffuse), rainbow, fresnel);
    
    return vec4(final_color, 1.0);
}

// --- MAIN LOOP ---
void main() {
    // 1. Mapowanie UV na zakres -1 do 1 z zachowaniem proporcji (16:9)
    float aspect = u_resolution.x / u_resolution.y;
    vec2 screen_coords = (vUv * 2.0 - 1.0);
    screen_coords.x *= aspect;

    // 2. Ustalenie kierunku promienia (Ray Direction)
    // forward + (prawo * x * fov) + (góra * y * fov)
    vec3 ray_dir = normalize(u_forward + screen_coords.x * u_fov * u_right + screen_coords.y * u_fov * u_up);

    // 3. Raymarching
    vec3 z = u_pos;
    float total_dist = 0.0;
    bool hit = false;

    for (int i = 0; i < int(u_steps); i++) { // Limit bezpieczeństwa
        float dist = juliabulbDE(z);
        z += ray_dir * dist;
        total_dist += dist;

        if (dist < u_threshold) {
            hit = true;
            break;
        }
        
        // Optymalizacja: jeśli promień ucieknie za daleko, przerywamy
        if (total_dist > u_bailout) break;
    }

    // 4. Finalny kolor
    gl_FragColor = rainbow_gloss(hit, z, u_pos);
}