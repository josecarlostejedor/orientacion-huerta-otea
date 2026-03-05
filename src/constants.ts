export interface Baliza {
  id: number;
  correctCode: string;
  description: string;
}

export interface Route {
  id: number;
  name: string;
  mapUrl: string;
  balizas: Baliza[];
}

export const ROUTES: Route[] = [
  {
    id: 1,
    name: "Recorrido 1",
    mapUrl: "https://raw.githubusercontent.com/josecarlostejedor/orientacion-huerta-otea/main/Recorrido1.jpg", 
    balizas: [
      { id: 1, correctCode: "Cajas nido para aves insectivoras", description: "Baliza 1" },
      { id: 2, correctCode: "Arcos Florales", description: "Baliza 2" },
      { id: 3, correctCode: "Talud Avión Zapador", description: "Baliza 3" },
      { id: 4, correctCode: "Vegetación Atlantica", description: "Baliza 4" },
      { id: 5, correctCode: "Laberinto Vegetal", description: "Baliza 5" },
      { id: 6, correctCode: "Medidas para el fomento de pequeños mamíferos", description: "Baliza 6" },
    ],
  },
  {
    id: 2,
    name: "Recorrido 2",
    mapUrl: "https://raw.githubusercontent.com/josecarlostejedor/orientacion-huerta-otea/main/Recorrido2.jpg",
    balizas: [
      { id: 1, correctCode: "Talud Avion Zapador", description: "Baliza 1" },
      { id: 2, correctCode: "Vegetación Atlántica", description: "Baliza 2" },
      { id: 3, correctCode: "Medidas para el fomento de pequeños mamíferos", description: "Baliza 3" },
      { id: 4, correctCode: "Laberinto Vegetal", description: "Baliza 4" },
      { id: 5, correctCode: "Cajas nido para aves insectivoras", description: "Baliza 5" },
      { id: 6, correctCode: "Arcos Florales", description: "Baliza 6" },
    ],
  },
  {
    id: 3,
    name: "Recorrido 3",
    mapUrl: "https://raw.githubusercontent.com/josecarlostejedor/orientacion-huerta-otea/main/Recorrido3.jpg",
    balizas: [
      { id: 1, correctCode: "Cajas nido para aves insectivoras", description: "Baliza 1" },
      { id: 2, correctCode: "Arcos Florales", description: "Baliza 2" },
      { id: 3, correctCode: "Laberinto Vegetal", description: "Baliza 3" },
      { id: 4, correctCode: "Medidas para el fomento de pequeños mamíferos", description: "Baliza 4" },
      { id: 5, correctCode: "Vegetación Atlántica", description: "Baliza 5" },
      { id: 6, correctCode: "Talud Avion Zapador", description: "Baliza 6" },
    ],
  },
];

export const COURSES = [
  "1º ESO",
  "2º ESO",
  "3º ESO",
  "1º BACHILLERATO",
  "2º BACHILLERATO",
  "FP BÁSICA",
  "Otro nivel educativo",
];

export const GROUPS = ["1", "2", "3", "4", "5", "6", "7", "8"];
