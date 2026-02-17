float calculateAO(vec3 p, vec3 n) {
    float occ = 0.0;
    float sca = 1.0;
    for(int i=0; i<5; i++) {
        float h = 0.01 + 0.12 * float(i)/4.0;
        float d = fractalDE(p + n * h);
        occ += (h - d) * sca;
        sca *= 0.95;
    }
    return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

float calculateShadow(vec3 ro, vec3 rd, float mint, float maxt) {
    float res = 1.0;
    float t = mint;
    for(int i=0; i<24; i++) {
        float h = fractalDE(ro + rd * t);
        res = min(res, 16.0 * h / t);
        t += clamp(h, 0.01, 0.2);
        if(h < 0.001 || t > maxt) break;
    }
    return clamp(res, 0.0, 1.0);
}


vec4 calculate_color(bool hit, vec3 z) 
{
    if (!hit) return vec4(0.02, 0.03, 0.05, 1.0);

    vec3 normal = calc_normal(z);
    vec3 light_dir = normalize(vec3(-0.8, 1.0, -0.8)); 
    vec3 view_dir = normalize(u_pos - z);
    
    float ao = calculateAO(z, normal);
    float shadow = calculateShadow(z + normal * 0.01, light_dir, 0.01, 3.0);
    float diff = max(dot(normal, light_dir), 0.0);
    
    vec3 rainbow = 0.7 + 0.3 * cos(u_time * 0.3 + z.xyx * 1.2 + vec3(0,2,4));

    float fresnel = pow(1.0 - max(dot(normal, view_dir), 0.0), 3.0);
    vec3 half_dir = normalize(light_dir + view_dir);
    float spec = pow(max(dot(normal, half_dir), 0.0), 32.0) * 1.5;

    float light_final = mix(0.3, 1.0, shadow);
    
    float ao_soft = mix(0.4, 1.0, ao); 
    
    vec3 direct = rainbow * diff * light_final;
    vec3 glow = rainbow * fresnel * 0.6;
    
    vec3 final_rgb = (direct + glow + spec) * ao_soft;

    float dist = length(u_pos - z);
    float fog_density = 0.8;
    float fog = exp(-dist * fog_density); 
    
    vec3 fog_color = vec3(0.02, 0.03, 0.05);
    final_rgb = mix(fog_color, final_rgb, fog);

    final_rgb *= 1.4;
    final_rgb = pow(final_rgb, vec3(0.7));

    return vec4(final_rgb, 1.0);
}