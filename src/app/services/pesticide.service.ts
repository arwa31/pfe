import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Pesticide } from '../model/pesticide';

@Injectable({
  providedIn: 'root'
})

export class PesticideService {

  private apiUrl = 'http://localhost:8081/api/pesticides';

  constructor(private http: HttpClient) {}

  getPesticides(): Observable<Pesticide[]> {
    return this.http.get<Pesticide[]>(this.apiUrl);
  }
  getUniquePesticidesDetected(): Observable<number> {
   return this.http.get<number>(`${this.apiUrl}/upd`);
  }
}

