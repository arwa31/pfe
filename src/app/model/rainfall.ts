import { StudySite } from "./StudySite";

export interface Rainfall {
  rainfallId: number;
  measurementDate: string;    
  rainfallMm: number;         
  stationName: string;
  studySite: StudySite;
}