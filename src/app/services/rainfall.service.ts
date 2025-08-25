import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Rainfall } from '../model/rainfall';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RainfallService {

  private apiUrl = 'http://localhost:8081/api/rainfall';

  constructor(private http: HttpClient) {}

  getRainfall(): Observable<Rainfall[]> {
    return this.http.get<Rainfall[]>(this.apiUrl);
  }

}
