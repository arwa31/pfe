import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PesticideConcentration } from '../model/pesticideConcentration';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PesticideConcentrationService {



  private apiUrl = 'http://localhost:8081/api/pesticidesConcentration';

  constructor(private http: HttpClient) { }

  findTotalConcentrations(): Observable<PesticideConcentration[]> {
    return this.http.get<PesticideConcentration[]>(this.apiUrl);
  }

   findPesticideConcentrations(pesticideName:string): Observable<PesticideConcentration[]> {
    return this.http.get<PesticideConcentration[]>(this.apiUrl+'/pesticide?pesticideName='+pesticideName);
  } 
}
