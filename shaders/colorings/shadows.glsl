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
    if (!hit) return vec4(0.02, 0.03, 0.05, 1.0); // Jasniejsze tło, by widzieć sylwetkę fraktala

    vec3 normal = calc_normal(z);
    vec3 light_dir = normalize(vec3(-0.8, 1.0, -0.8)); 
    vec3 view_dir = normalize(u_pos - z);
    
    // 1. Oświetlenie
    float ao = calculateAO(z, normal);
    float shadow = calculateShadow(z + normal * 0.01, light_dir, 0.01, 3.0);
    float diff = max(dot(normal, light_dir), 0.0);
    
    // 2. TĘCZA - Podbijamy jasność bazową (0.7 zamiast 0.5)
    vec3 rainbow = 0.7 + 0.3 * cos(u_time * 0.3 + z.xyx * 1.2 + vec3(0,2,4));

    // 3. FRESNEL I SPEKULAR (Mocniejsze, by "wyciągnąć" detal z mroku)
    float fresnel = pow(1.0 - max(dot(normal, view_dir), 0.0), 3.0);
    vec3 half_dir = normalize(light_dir + view_dir);
    float spec = pow(max(dot(normal, half_dir), 0.0), 32.0) * 1.5;

    // --- SKŁADANIE (Jaśniejsza wersja) ---
    // Zamiast mnożyć wszystko przez shadow, używamy go jako mixa
    float light_final = mix(0.3, 1.0, shadow); // Nawet w cieniu jest 30% światła
    
    // AO niech przyciemnia tylko najgłębsze dziury (wzmacniamy ao)
    float ao_soft = mix(0.4, 1.0, ao); 
    
    vec3 direct = rainbow * diff * light_final;
    vec3 glow = rainbow * fresnel * 0.6;
    
    vec3 final_rgb = (direct + glow + spec) * ao_soft;

    // --- 4. MGŁA (KALIBRACJA) ---
    // Jeśli nie widziałeś mgły, zwiększamy jej mnożnik (np. z 0.15 na 0.8)
    // dist to odległość od kamery
    float dist = length(u_pos - z);
    float fog_density = 0.8; // ZWIĘKSZ TO, jeśli nadal nie widzisz mgły
    float fog = exp(-dist * fog_density); 
    
    // Mgła powinna mieć kolor tła
    vec3 fog_color = vec3(0.02, 0.03, 0.05);
    final_rgb = mix(fog_color, final_rgb, fog);

    // --- 5. EKSPozycja I GAMMA ---
    final_rgb *= 1.4; // Globalne podbicie jasności o 40% pod okulary
    final_rgb = pow(final_rgb, vec3(0.7)); // Mocniejsza korekcja gamma (rozjaśnia cienie)

    return vec4(final_rgb, 1.0);
}