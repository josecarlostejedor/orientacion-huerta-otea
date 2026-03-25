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
  partialTime?: number;
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
