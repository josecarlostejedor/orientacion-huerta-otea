Mira lo que teníamos antes de que hicieses los cambios y que funcionaba: 

a) types.ts 

export interface UserData {
  firstName: string;
  lastName: string;
  age: string;
  course: string;
  group: string;
}

export interface BalizaResult {
  balizaId: number;
  enteredCode: string;
  isCorrect: boolean;
  correctCode: string;
  description: string;
}

export interface RaceResult {
  userData: UserData;
  routeId: number;
  routeName: string;
  startTime: number;
  endTime: number;
  totalTime: number;
  results: BalizaResult[];
  score: number;
  borgScale: number;
  date: string;
}



El otro que has cambiado es App.tsx en el anterior que funcionaba perfectamente tenía este código: 


Puedes chequear para encontrar la solución
??? No estropees nada manten todo como estaba


