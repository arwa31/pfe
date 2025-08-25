import { StudySite } from "./StudySite";

export interface RiverFlow {
  flowId: number;
  measurementDate: string;    
  flowValue: number;          
  stationName: string;
  studySite: StudySite;
}