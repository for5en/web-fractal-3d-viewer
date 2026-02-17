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

// Dodaj tę funkcję przed calculate_color
float calculateShadow(vec3 ro, vec3 rd, float mint, float maxt) {
    float res = 1.0;
    float t = mint;
    for(int i=0; i<24; i++) { // 24 kroki dla wydajności
        float h = fractalDE(ro + rd * t);
        res = min(res, 16.0 * h / t); // 16.0 to ostrość cienia
        t += clamp(h, 0.01, 0.2);
        if(h < 0.001 || t > maxt) break;
    }
    return clamp(res, 0.0, 1.0);
}

vec4 calculate_color(bool hit, vec3 z) 
{
    if (!hit) return vec4(0.0, 0.0, 0.0, 1.0);

    vec3 normal = calc_normal(z);
    // Światło nieco z boku i zza nas, żeby podkreślić rzeźbę
    vec3 light_dir = normalize(vec3(-0.8, 1.0, -0.8)); 
    vec3 view_dir = normalize(u_pos - z);
    
    // 1. Cienie i AO
    float ao = calculateAO(z, normal);
    float shadow = calculateShadow(z + normal * 0.01, light_dir, 0.01, 3.0);
    float diff = max(dot(normal, light_dir), 0.0);
    
    // 2. TĘCZA - Zwiększamy nasycenie i kontrast
    // Używamy funkcji cos, ale "podbijamy" jej wynik
    vec3 rainbow = 0.5 + 0.5 * cos(u_time * 0.5 + z.xyx * 1.5 + vec3(0,2,4));
    rainbow = pow(rainbow, vec3(1.5)); // Wzmocnienie nasycenia kolorów tęczy

    // 3. FRESNEL - sprawia, że krawędzie "płoną" kolorem
    float fresnel = pow(1.0 - max(dot(normal, view_dir), 0.0), 4.0);
    
    // 4. SPEKULAR - lśnienie (reaguje na głowę)
    vec3 half_dir = normalize(light_dir + view_dir);
    float spec = pow(max(dot(normal, half_dir), 0.0), 64.0);

    // --- SKŁADANIE (SOCZYSTE) ---
    
    // Ambient: ciemniejszy niż ostatnio, żeby nie "wybielał" kolorów
    vec3 ambient = vec3(0.04, 0.05, 0.07) * ao; 
    
    // Bezpośrednie światło: mieszamy rainbow z oświetleniem
    // Używamy shadow_clamped, żeby cień nie był trupio-czarny
    float shadow_clamped = mix(0.15, 1.0, shadow);
    vec3 direct = rainbow * diff * shadow_clamped;
    
    // Dodajemy fresnel jako "neonowy" blask na krawędziach
    vec3 final_rgb = ambient + direct + (rainbow * fresnel * 0.5) + (spec * shadow_clamped);

    // 5. Finalne dopieszczenie
    final_rgb *= ao; // AO na samym końcu przyciemnia tylko szczeliny
    
    // Korekcja Gamma - tym razem delikatniej, żeby nie sprać kolorów
    final_rgb = pow(final_rgb, vec3(0.6)); 
    
    // Delikatny kontrast (S-Curve)
    final_rgb = mix(final_rgb, final_rgb * final_rgb * (3.0 - 2.0 * final_rgb), 0.3);

    return vec4(final_rgb, 1.0);
}