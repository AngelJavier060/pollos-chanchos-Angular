import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Componente exclusivamente para diagnóstico del problema con la API de lotes
 */
@Component({
  selector: 'app-lote-test',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4">
      <h1>Prueba de API de Lotes</h1>
      
      <div class="my-4 flex flex-wrap gap-2">
        <button (click)="testGetRaces()" class="bg-blue-500 text-white px-4 py-2 rounded">
          1. Probar GET races
        </button>
        
        <button (click)="testGetLotes()" class="bg-green-500 text-white px-4 py-2 rounded">
          2. Probar GET lotes
        </button>
        
        <button (click)="testCreateLoteMinimal()" class="bg-yellow-500 text-white px-4 py-2 rounded">
          3. Probar POST lote (mínimo)
        </button>
        
        <button (click)="testCreateLoteAlternative()" class="bg-purple-500 text-white px-4 py-2 rounded">
          4. Probar alternativa 1
        </button>
        
        <button (click)="testCreateLoteAlternative2()" class="bg-pink-500 text-white px-4 py-2 rounded">
          5. Probar alternativa 2
        </button>
        
        <button (click)="testCreateLoteAlternative3()" class="bg-indigo-500 text-white px-4 py-2 rounded">
          6. Probar alternativa 3
        </button>
        
        <button (click)="testDiagnostic()" class="bg-red-500 text-white px-4 py-2 rounded">
          7. Diagnóstico detallado
        </button>

        <button (click)="checkRaceExists()" class="bg-orange-500 text-white px-4 py-2 rounded">
          8. Verificar raza
        </button>
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">ID del lote:</label>
        <input [(ngModel)]="loteId" class="border rounded px-3 py-2 w-full max-w-xs" 
               placeholder="Ejemplo: loteNNN" />
        <p class="text-sm text-gray-500 mt-1">Asegúrate que el ID no exista ya en la base de datos.</p>
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">ID de la raza:</label>
        <input [(ngModel)]="raceId" type="number" class="border rounded px-3 py-2 w-full max-w-xs" 
               placeholder="ID de la raza (número)" />
      </div>
      
      <div *ngIf="loading" class="text-gray-600">Cargando...</div>
      
      <div *ngIf="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p class="font-bold">Error:</p>
        <p>{{ error }}</p>
      </div>
      
      <div *ngIf="result" class="mt-4">
        <h2 class="text-lg font-bold">Resultado:</h2>
        <pre class="bg-gray-100 p-4 rounded overflow-auto max-h-96">{{ result | json }}</pre>
      </div>
    </div>
  `
})
export class LoteTestComponent {
  loading = false;
  error: string | null = null;
  result: any = null;
  loteId = 'loteTest'; // ID predeterminado para pruebas
  raceId = 1; // ID de raza predeterminado
  
  constructor(private http: HttpClient) {}

  // Headers para asegurar el formato correcto de la petición
  private getHeaders() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      })
    };
  }
  
  testGetRaces() {
    this.loading = true;
    this.error = null;
    this.result = null;
    
    this.http.get('http://localhost:8080/race').subscribe({
      next: (data) => {
        this.result = data;
        this.loading = false;
        console.log('Razas obtenidas:', data);
      },
      error: (err) => {
        this.error = `Error al obtener razas: ${err.message}`;
        this.loading = false;
        console.error('Error completo:', err);
      }
    });
  }
  
  testGetLotes() {
    this.loading = true;
    this.error = null;
    this.result = null;
    
    this.http.get('http://localhost:8080/lote').subscribe({
      next: (data) => {
        this.result = data;
        this.loading = false;
        console.log('Lotes obtenidos:', data);
      },
      error: (err) => {
        this.error = `Error al obtener lotes: ${err.message}`;
        this.loading = false;
        console.error('Error completo:', err);
      }
    });
  }
  
  testCreateLoteMinimal() {
    this.loading = true;
    this.error = null;
    this.result = null;
    
    // Datos mínimos absolutamente necesarios según el modelo del backend
    const minimalLote = {
      id: this.loteId || "test123",
      quantity: 10,
      birthdate: new Date().toISOString().split('T')[0],
      cost: 100
    };
    
    console.log('Intentando crear lote con datos mínimos:', minimalLote);
    
    // Usamos ID de raza 1 que debe existir según la captura que compartiste
    this.http.post('http://localhost:8080/lote/1', minimalLote, this.getHeaders()).subscribe({
      next: (data) => {
        this.result = data;
        this.loading = false;
        console.log('Lote creado con éxito:', data);
      },
      error: (err) => {
        this.error = `Error al crear lote mínimo: ${err.message}`;
        this.loading = false;
        console.error('Error completo:', err);
        
        if (err.error) {
          console.error('Detalles del error:', err.error);
          try {
            if (typeof err.error === 'object') {
              this.error += ` - ${JSON.stringify(err.error)}`;
            } else if (typeof err.error === 'string') {
              const parsed = JSON.parse(err.error);
              this.error += ` - ${JSON.stringify(parsed)}`;
            }
          } catch (e) {
            console.error('No se pudo parsear el error');
          }
        }
      }
    });
  }

  // Alternativa 1: Usando formato de fecha exacto como en el ejemplo
  testCreateLoteAlternative() {
    this.loading = true;
    this.error = null;
    this.result = null;
    
    const lote = {
      id: this.loteId || "test123",
      quantity: 10,
      birthdate: "2000-05-10T00:00:00.000+00:00", // Usando el mismo formato que vemos en la respuesta GET
      cost: 100
    };
    
    console.log('Alternativa 1 - Intentando crear lote con formato de fecha específico:', lote);
    
    this.http.post('http://localhost:8080/lote/1', lote, this.getHeaders()).subscribe({
      next: (data) => {
        this.result = data;
        this.loading = false;
        console.log('Lote creado con éxito:', data);
      },
      error: (err) => {
        this.error = `Error con alternativa 1: ${err.message}`;
        this.loading = false;
        console.error('Error completo:', err);
        this.logErrorDetails(err);
      }
    });
  }

  // Alternativa 2: Usando fecha en milisegundos
  testCreateLoteAlternative2() {
    this.loading = true;
    this.error = null;
    this.result = null;
    
    const lote = {
      id: this.loteId || "test123",
      quantity: 10,
      birthdate: new Date().getTime(), // Timestamp en milisegundos
      cost: 100
    };
    
    console.log('Alternativa 2 - Intentando crear lote con timestamp:', lote);
    
    this.http.post('http://localhost:8080/lote/1', lote, this.getHeaders()).subscribe({
      next: (data) => {
        this.result = data;
        this.loading = false;
        console.log('Lote creado con éxito:', data);
      },
      error: (err) => {
        this.error = `Error con alternativa 2: ${err.message}`;
        this.loading = false;
        console.error('Error completo:', err);
        this.logErrorDetails(err);
      }
    });
  }

  // Alternativa 3: Sin fecha (que el backend use fecha actual por defecto)
  testCreateLoteAlternative3() {
    this.loading = true;
    this.error = null;
    this.result = null;
    
    const lote = {
      id: this.loteId || "test123",
      quantity: 10,
      cost: 100
      // No incluimos birthdate para ver si el backend asigna uno por defecto
    };
    
    console.log('Alternativa 3 - Intentando crear lote sin especificar fecha:', lote);
    
    this.http.post('http://localhost:8080/lote/1', lote, this.getHeaders()).subscribe({
      next: (data) => {
        this.result = data;
        this.loading = false;
        console.log('Lote creado con éxito:', data);
      },
      error: (err) => {
        this.error = `Error con alternativa 3: ${err.message}`;
        this.loading = false;
        console.error('Error completo:', err);
        this.logErrorDetails(err);
      }
    });
  }

  // Verificar si la raza existe usando el nuevo endpoint de diagnóstico
  checkRaceExists() {
    this.loading = true;
    this.error = null;
    this.result = null;

    const id = this.raceId || 1;
    
    this.http.get(`http://localhost:8080/diagnostic/race/exists/${id}`).subscribe({
      next: (data) => {
        this.result = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = `Error al verificar raza: ${err.message}`;
        this.loading = false;
        console.error('Error completo:', err);
      }
    });
  }

  // Test de diagnóstico usando el nuevo controlador backend
  testDiagnostic() {
    this.loading = true;
    this.error = null;
    this.result = null;
    
    const lote = {
      id: this.loteId || "testLote",
      quantity: 10,
      birthdate: new Date().toISOString().split('T')[0],
      cost: 100
    };

    const raceId = this.raceId || 1;
    
    console.log('Diagnóstico - Intentando crear lote:', lote);
    console.log('Con raza ID:', raceId);
    
    this.http.post(`http://localhost:8080/diagnostic/lote/test/${raceId}`, lote, this.getHeaders()).subscribe({
      next: (data) => {
        this.result = data;
        this.loading = false;
        console.log('Respuesta de diagnóstico:', data);
      },
      error: (err) => {
        this.error = `Error en diagnóstico: ${err.message}`;
        this.loading = false;
        console.error('Error completo:', err);
        
        if (err.error) {
          console.error('Detalles del error:', err.error);
          try {
            if (typeof err.error === 'object') {
              this.result = err.error;
            } else if (typeof err.error === 'string') {
              try {
                this.result = JSON.parse(err.error);
              } catch (e) {
                this.error += ` - No se pudo parsear la respuesta`;
              }
            }
          } catch (e) {
            console.error('No se pudo procesar la respuesta');
          }
        }
      }
    });
  }

  // Método auxiliar para mostrar detalles del error
  private logErrorDetails(err: any) {
    if (err.error) {
      console.error('Detalles del error:', err.error);
      try {
        if (typeof err.error === 'object') {
          this.error += ` - ${JSON.stringify(err.error)}`;
        } else if (typeof err.error === 'string') {
          const parsed = JSON.parse(err.error);
          this.error += ` - ${JSON.stringify(parsed)}`;
        }
      } catch (e) {
        console.error('No se pudo parsear el error');
      }
    }
  }
}