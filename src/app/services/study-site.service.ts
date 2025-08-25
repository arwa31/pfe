import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StudySite } from '../model/StudySite';


@Injectable({
  providedIn: 'root'
})
export class StudySiteService {

  private apiUrl = 'http://localhost:8081/api/studySite';

  constructor(private http: HttpClient) {}


  getTotalsamples(): Observable<number> {
   return this.http.get<number>(`${this.apiUrl}/ts`);
  }
  getStudySite(): Observable<StudySite[]> {
      return this.http.get<StudySite[]>(this.apiUrl);
  }
 
}