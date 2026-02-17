vec4 calculate_color(bool hit, vec3 z) 
{
    if (!hit) return vec4(0.0, 0.0, 0.0, 1.0);

    vec3 normal = calc_normal(z);
    if (length(normal) < 0.1) normal = vec3(0.0, 1.0, 0.0); // Zabezpieczenie przed zerową normalną

    vec3 light_dir = normalize(vec3(0.5, 1.0, 0.3));
    vec3 view_dir = normalize(u_pos - z);

    // Lambert + Rim Lighting (podświetlenie krawędzi)
    float diff = max(dot(normal, light_dir), 0.0);
    float rim = pow(1.0 - max(dot(normal, view_dir), 0.0), 3.0);

    // Zamiast AO pętlą, używamy cieniowania opartego na normalnej Y (pseudo-AO)
    float ambient = 0.2 + 0.3 * normal.y; 

    vec3 base_col = vec3(0.7, 0.75, 0.8); // Jasny, neutralny kolor
    vec3 final_rgb = base_col * (diff + ambient) + (rim * 0.4);

    return vec4(final_rgb, 1.0);
}