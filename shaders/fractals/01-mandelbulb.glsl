float fractalDE(vec3 p) 
{
    vec3 z = p;
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
        theta *= u_power;
        phi *= u_power;

        z = zr * vec3(
            sin(theta) * cos(phi),
            sin(theta) * sin(phi),
            cos(theta)
        ) + p;
    }
    return 0.5 * log(r) * r / dr;
}