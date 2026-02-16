float fractalDE(vec3 p) 
{
    vec3 z = p;
    vec3 c = u_constant.xyz;
    float dr = 1.0;
    float r = 0.0;

    for (int i = 0; i < int(u_iterations); i++) 
    {
        r = length(z);
        if (r > 4.0) break;

        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);

        dr = pow(r, u_power - 1.0) * u_power * dr + 1.0;

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