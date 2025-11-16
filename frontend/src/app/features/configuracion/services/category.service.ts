import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { ApiUrlService } from '../../../core/services/api-url.service';
import { Category } from '../interfaces/category.interface';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private apiUrl: string;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.buildUrl('category');
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl, this.httpOptions).pipe(retry(1), catchError(this.handleError));
  }

  createCategory(category: Category): Observable<Category> {
    return this.http.post<Category>(this.apiUrl, category, this.httpOptions).pipe(retry(1), catchError(this.handleError));
  }

  updateCategory(category: Category): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}`, category, this.httpOptions).pipe(retry(1), catchError(this.handleError));
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.httpOptions).pipe(retry(1), catchError(this.handleError));
  }

  private handleError(error: any) {
    const msg = (error && error.error && typeof error.error === 'string') ? error.error : 'Ocurrió un error en la operación.';
    return throwError(() => new Error(msg));
  }
}
