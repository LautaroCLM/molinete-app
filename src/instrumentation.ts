/**
 * Corre una vez al arrancar el servidor. Vercel usa UTC: fijamos la zona horaria de
 * Argentina para que "hoy", los vencimientos y las horas coincidan con las del gimnasio.
 * (Cuando haya gimnasios en otras zonas, se pasa a usar gyms.zona_horaria.)
 */
export function register() {
  process.env.TZ = process.env.ZONA_HORARIA ?? "America/Argentina/Buenos_Aires"
}
