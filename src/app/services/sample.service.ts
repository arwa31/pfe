import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SampleService {
  private apiUrl = 'http://localhost:8081/api/samples';

  constructor(private http: HttpClient) {}


  getTotalsamples(): Observable<number> {
   return this.http.get<number>(`${this.apiUrl}/ts`);
  }
 
}
