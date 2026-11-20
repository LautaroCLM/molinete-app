/** Ejercicios comunes que se sugieren al armar una rutina (nombres genéricos, editables por cada gimnasio en su biblioteca). */
export interface EjercicioBase {
  nombre: string
  grupo: string
}

const g = (grupo: string, nombres: string[]): EjercicioBase[] => nombres.map((nombre) => ({ nombre, grupo }))

export const EJERCICIOS_BASE: EjercicioBase[] = [
  ...g("Pecho", [
    "Press de banca plano con barra",
    "Press de banca plano con mancuernas",
    "Press inclinado con barra",
    "Press inclinado con mancuernas",
    "Aperturas con mancuernas",
    "Aperturas en polea",
    "Cruces en polea",
    "Peck deck",
    "Press en máquina",
    "Flexiones de brazos",
    "Fondos en paralelas",
  ]),
  ...g("Espalda", [
    "Dominadas",
    "Jalón al pecho",
    "Jalón tras nuca",
    "Remo con barra",
    "Remo con mancuerna",
    "Remo en polea baja",
    "Remo en máquina",
    "Remo en T",
    "Pullover con mancuerna",
    "Peso muerto",
    "Hiperextensiones",
  ]),
  ...g("Hombros", [
    "Press militar con barra",
    "Press de hombros con mancuernas",
    "Elevaciones laterales",
    "Elevaciones frontales",
    "Pájaros (deltoides posterior)",
    "Remo al mentón",
    "Face pull",
    "Encogimientos de hombros",
  ]),
  ...g("Bíceps", ["Curl con barra", "Curl con mancuernas", "Curl martillo", "Curl en banco scott", "Curl en polea", "Curl concentrado"]),
  ...g("Tríceps", ["Press francés", "Extensión de tríceps en polea", "Patada de tríceps", "Fondos en banco", "Extensión de tríceps sobre la cabeza", "Press cerrado"]),
  ...g("Piernas", [
    "Sentadilla con barra",
    "Sentadilla frontal",
    "Sentadilla búlgara",
    "Prensa de piernas",
    "Peso muerto rumano",
    "Estocadas con mancuernas",
    "Zancadas caminando",
    "Extensión de cuádriceps",
    "Curl femoral acostado",
    "Curl femoral sentado",
    "Sentadilla goblet",
    "Elevación de talones (gemelos)",
    "Abductores en máquina",
    "Aductores en máquina",
  ]),
  ...g("Glúteos", ["Hip thrust", "Puente de glúteos", "Patada de glúteo en polea", "Sentadilla sumo", "Abducción de cadera con banda"]),
  ...g("Abdominales", ["Plancha", "Plancha lateral", "Crunch abdominal", "Elevación de piernas", "Rueda abdominal", "Bicicleta abdominal", "Russian twist", "Abdominales en polea"]),
  ...g("Cardio", ["Cinta de correr", "Bicicleta fija", "Elíptico", "Remo ergómetro", "Soga (saltar)", "Escalera (stairmaster)"]),
  ...g("Cuerpo completo", ["Burpees", "Kettlebell swing", "Thruster", "Clean y press", "Peso muerto con kettlebell"]),
]

/** Nombre normalizado para comparar (sin tildes ni mayúsculas). */
export const claveEjercicio = (nombre: string) =>
  nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
