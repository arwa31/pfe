import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { RiverFlow } from '../model/riverflow';

@Injectable({
  providedIn: 'root'
})
export class RiverflowService {
  private apiUrl = 'http://localhost:8081/api/riverflow';

  constructor(private http: HttpClient) {}

  getRiverFlow(): Observable<RiverFlow[]> {
    return this.http.get<RiverFlow[]>(this.apiUrl);
  }

}
