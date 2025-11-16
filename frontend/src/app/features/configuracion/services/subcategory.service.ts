import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { ApiUrlService } from '../../../core/services/api-url.service';
import { Subcategory } from '../interfaces/subcategory.interface';

@Injectable({ providedIn: 'root' })
export class SubcategoryService {
  private apiUrl: string;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.buildUrl('subcategory');
  }

  getAll(): Observable<Subcategory[]> {
    return this.http.get<Subcategory[]>(this.apiUrl, this.httpOptions).pipe(retry(1), catchError(this.handleError));
  }

  getByCategory(categoryId: number): Observable<Subcategory[]> {
    return this.http.get<Subcategory[]>(`${this.apiUrl}/by-category/${categoryId}`, this.httpOptions).pipe(retry(1), catchError(this.handleError));
  }

  getGrouped(): Observable<Record<string, Subcategory[]>> {
    return this.http.get<Record<string, Subcategory[]>>(`${this.apiUrl}/grouped`, this.httpOptions).pipe(retry(1), catchError(this.handleError));
  }

  create(sub: Subcategory): Observable<Subcategory> {
    return this.http.post<Subcategory>(this.apiUrl, sub, this.httpOptions).pipe(retry(1), catchError(this.handleError));
  }

  update(id: number, sub: Subcategory): Observable<Subcategory> {
    return this.http.put<Subcategory>(`${this.apiUrl}/${id}`, sub, this.httpOptions).pipe(retry(1), catchError(this.handleError));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.httpOptions).pipe(retry(1), catchError(this.handleError));
  }

  private handleError(error: any) {
    const msg = (error && error.error && typeof error.error === 'string') ? error.error : 'Ocurrió un error en la operación.';
    return throwError(() => new Error(msg));
  }
}
