vec4 calculate_color(bool hit, vec3 z) 
{
    if (!hit) return vec4(0.0, 0.0, 0.0, 1.0);

    vec3 cam_pos = u_pos;
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