import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ConsumoInventario {
  id?: number;
  loteId: number;
  productoId: number;
  nombreProducto: string;
  cantidadConsumida: number;
  fecha: Date;
  usuario: string;
  observaciones?: string;
}

export interface ActualizacionStock {
  productoId: number;
  cantidadAnterior: number;
  cantidadConsumida: number;
  cantidadNueva: number;
  fecha: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ConsumoInventarioService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) { }

  /**
   * ✅ REGISTRAR CONSUMO DE ALIMENTO Y DESCONTAR DEL INVENTARIO
   */
  registrarConsumoAlimento(consumo: ConsumoInventario): Observable<any> {
    console.log('🔄 Registrando consumo de alimento:', consumo);
    return this.http.post(`${this.apiUrl}/consumo-inventario`, consumo);
  }

  /**
   * ✅ DESCONTAR CANTIDAD DEL INVENTARIO
   */
  descontarDelInventario(productoId: number, cantidadConsumida: number): Observable<ActualizacionStock> {
    console.log(`🔄 Descontando ${cantidadConsumida} kg del producto ${productoId}`);
    
    const payload = {
      productoId,
      cantidadConsumida
    };
    
    return this.http.post<ActualizacionStock>(`${this.apiUrl}/inventario/descontar`, payload);
  }

  /**
   * ✅ BUSCAR PRODUCTO POR NOMBRE
   */
  buscarProductoPorNombre(nombreProducto: string): Observable<any> {
    console.log(`🔍 Buscando producto: ${nombreProducto}`);
    return this.http.get(`${this.apiUrl}/productos/buscar?nombre=${encodeURIComponent(nombreProducto)}`);
  }

  /**
   * ✅ OBTENER HISTORIAL DE CONSUMOS
   */
  obtenerHistorialConsumos(loteId?: number): Observable<ConsumoInventario[]> {
    const url = loteId 
      ? `${this.apiUrl}/consumo-inventario/lote/${loteId}`
      : `${this.apiUrl}/consumo-inventario/historial`;
    
    return this.http.get<ConsumoInventario[]>(url);
  }

  /**
   * ✅ VALIDAR STOCK DISPONIBLE
   */
  validarStockDisponible(productoId: number, cantidadRequerida: number): Observable<{ 
    disponible: boolean; 
    stockActual: number; 
    mensaje: string; 
  }> {
    return this.http.get<{ disponible: boolean; stockActual: number; mensaje: string; }>(
      `${this.apiUrl}/inventario/validar-stock/${productoId}/${cantidadRequerida}`
    );
  }

  /**
   * ✅ OBTENER ESTADÍSTICAS DE CONSUMO
   */
  obtenerEstadisticasConsumo(fechaInicio: Date, fechaFin: Date): Observable<any> {
    const params = {
      fechaInicio: fechaInicio.toISOString().split('T')[0],
      fechaFin: fechaFin.toISOString().split('T')[0]
    };
    
    return this.http.get(`${this.apiUrl}/consumo-inventario/estadisticas`, { params });
  }

  /**
   * ✅ PROCESAR CONSUMO AUTOMÁTICO DESDE REGISTRO DIARIO
   */
  procesarConsumoAutomatico(loteId: number, tipoAlimento: string, cantidadKg: number, usuario: string): Observable<any> {
    console.log('🔄 Procesando consumo automático:', {
      loteId,
      tipoAlimento,
      cantidadKg,
      usuario
    });

    return new Observable(observer => {
      // Primero buscar el producto por nombre
      this.buscarProductoPorNombre(tipoAlimento).subscribe({
        next: (productos) => {
          if (productos && productos.length > 0) {
            const producto = productos[0];
            
            // Validar stock disponible
            this.validarStockDisponible(producto.id, cantidadKg).subscribe({
              next: (validacion) => {
                if (validacion.disponible) {
                  // Registrar consumo
                  const consumo: ConsumoInventario = {
                    loteId,
                    productoId: producto.id,
                    nombreProducto: producto.name,
                    cantidadConsumida: cantidadKg,
                    fecha: new Date(),
                    usuario,
                    observaciones: 'Consumo automático desde registro diario'
                  };
                  
                  this.registrarConsumoAlimento(consumo).subscribe({
                    next: (resultado) => {
                      console.log('✅ Consumo registrado exitosamente:', resultado);
                      observer.next(resultado);
                      observer.complete();
                    },
                    error: (error) => {
                      console.error('❌ Error al registrar consumo:', error);
                      observer.error(error);
                    }
                  });
                } else {
                  const error = `Stock insuficiente para ${tipoAlimento}. Disponible: ${validacion.stockActual} kg, Requerido: ${cantidadKg} kg`;
                  console.error('❌', error);
                  observer.error(new Error(error));
                }
              },
              error: (error) => {
                console.error('❌ Error al validar stock:', error);
                observer.error(error);
              }
            });
          } else {
            const error = `Producto "${tipoAlimento}" no encontrado en el inventario`;
            console.error('❌', error);
            observer.error(new Error(error));
          }
        },
        error: (error) => {
          console.error('❌ Error al buscar producto:', error);
          observer.error(error);
        }
      });
    });
  }
}
