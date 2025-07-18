import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoteService } from '../../features/lotes/services/lote.service';
import { ProductService } from './product.service';
import { MortalidadBackendService, RegistroMortalidadRequest } from './mortalidad-backend.service';
import { MorbilidadBackendService, RegistroMorbilidadRequest } from './morbilidad-backend.service';

export interface RegistroDiarioCompleto {
  loteId: number;
  fecha: Date;
  animalesMuertos: number;
  animalesEnfermos: number;
  tipoAlimento?: string;
  cantidadAlimento?: number;
  observaciones: string;
  usuario: string;
}

export interface ResultadoProcesamiento {
  success: boolean;
  message: string;
  resultados: {
    loteActualizado?: boolean;
    mortalidadRegistrada?: boolean;
    morbilidadRegistrada?: boolean;
    inventarioDescontado?: boolean;
  };
  errores?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RegistroDiarioService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(
    private http: HttpClient,
    private loteService: LoteService,
    private productService: ProductService,
    private mortalidadService: MortalidadBackendService,
    private morbilidadService: MorbilidadBackendService
  ) { }

  /**
   * ✅ PROCESAR REGISTRO DIARIO COMPLETO
   * Esta es la función principal que integra todo
   */
  procesarRegistroDiarioCompleto(registro: RegistroDiarioCompleto): Observable<ResultadoProcesamiento> {
    console.log('🔄 Iniciando procesamiento completo del registro diario:', registro);
    
    const resultados: ResultadoProcesamiento = {
      success: true,
      message: 'Procesamiento completado',
      resultados: {},
      errores: []
    };

    // Crear array de observables para ejecutar en paralelo
    const operaciones: Observable<any>[] = [];

    // 1. ACTUALIZAR CANTIDAD DE ANIMALES EN LOTE
    if (registro.animalesMuertos > 0 || registro.animalesEnfermos > 0) {
      operaciones.push(this.actualizarCantidadLote(registro.loteId, registro.animalesMuertos + registro.animalesEnfermos));
    }

    // 2. REGISTRAR MORTALIDAD
    if (registro.animalesMuertos > 0) {
      const registroMortalidad: RegistroMortalidadRequest = {
        loteId: registro.loteId,
        cantidadMuertos: registro.animalesMuertos,
        causaId: 8, // "Causas Desconocidas" por defecto
        observaciones: registro.observaciones || 'Registro desde formulario diario',
        usuarioRegistro: registro.usuario,
        confirmado: true
      };
      operaciones.push(this.mortalidadService.registrarMortalidad(registroMortalidad));
    }

    // 3. REGISTRAR MORBILIDAD
    if (registro.animalesEnfermos > 0) {
      const registroMorbilidad: RegistroMorbilidadRequest = {
        loteId: registro.loteId,
        fecha: registro.fecha.toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        cantidadEnfermos: registro.animalesEnfermos,
        enfermedadId: 8, // "Problemas Respiratorios" por defecto
        sintomasObservados: 'No especificados',
        gravedad: 'leve',
        estadoTratamiento: 'en_observacion',
        observacionesVeterinario: registro.observaciones || 'Registro desde formulario diario',
        requiereAislamiento: false,
        contagioso: false,
        usuarioRegistro: registro.usuario,
        animalesTratados: registro.animalesEnfermos
      };
      operaciones.push(this.morbilidadService.registrarMorbilidad(registroMorbilidad));
    }

    // 4. DESCONTAR INVENTARIO
    if (registro.cantidadAlimento && registro.cantidadAlimento > 0 && registro.tipoAlimento) {
      operaciones.push(this.descontarInventario(registro.tipoAlimento, registro.cantidadAlimento, registro.usuario));
    }

    // Ejecutar todas las operaciones
    if (operaciones.length === 0) {
      return new Observable(observer => {
        resultados.success = false;
        resultados.message = 'No hay operaciones para procesar';
        observer.next(resultados);
        observer.complete();
      });
    }

    return forkJoin(operaciones).pipe(
      map((respuestas: any[]) => {
        console.log('✅ Respuestas de todas las operaciones:', respuestas);
        
        // Procesar resultados
        let indice = 0;
        
        // Resultado actualización lote
        if (registro.animalesMuertos > 0 || registro.animalesEnfermos > 0) {
          resultados.resultados.loteActualizado = respuestas[indice]?.success || false;
          if (!resultados.resultados.loteActualizado) {
            resultados.errores?.push('Error al actualizar cantidad del lote');
          }
          indice++;
        }

        // Resultado mortalidad
        if (registro.animalesMuertos > 0) {
          resultados.resultados.mortalidadRegistrada = respuestas[indice]?.success || false;
          if (!resultados.resultados.mortalidadRegistrada) {
            resultados.errores?.push('Error al registrar mortalidad');
          }
          indice++;
        }

        // Resultado morbilidad
        if (registro.animalesEnfermos > 0) {
          resultados.resultados.morbilidadRegistrada = respuestas[indice]?.success || false;
          if (!resultados.resultados.morbilidadRegistrada) {
            resultados.errores?.push('Error al registrar morbilidad');
          }
          indice++;
        }

        // Resultado inventario
        if (registro.cantidadAlimento && registro.cantidadAlimento > 0) {
          resultados.resultados.inventarioDescontado = respuestas[indice]?.success || false;
          if (!resultados.resultados.inventarioDescontado) {
            resultados.errores?.push('Error al descontar inventario');
          }
        }

        // Evaluar éxito general
        resultados.success = (resultados.errores?.length || 0) === 0;
        
        if (resultados.success) {
          resultados.message = 'Registro diario procesado exitosamente';
        } else {
          resultados.message = `Procesamiento completado con ${resultados.errores?.length} errores`;
        }

        return resultados;
      })
    );
  }

  /**
   * ✅ ACTUALIZAR CANTIDAD DE ANIMALES EN LOTE
   */
  private actualizarCantidadLote(loteId: number, cantidadAReducir: number): Observable<any> {
    return this.loteService.getLotes().pipe(
      switchMap((lotes: any) => {
        let lotesArray = lotes;
        
        // Si viene envuelto en un objeto response
        if (lotes.status === 200 && lotes.object) {
          lotesArray = lotes.object;
        }
        
        const lote = lotesArray.find((l: any) => l.id === loteId);
        
        if (!lote) {
          throw new Error(`Lote con ID ${loteId} no encontrado`);
        }

        const nuevaCantidad = Math.max(0, lote.quantity - cantidadAReducir);
        
        console.log(`🔄 Actualizando lote ${loteId}: ${lote.quantity} → ${nuevaCantidad} (-${cantidadAReducir})`);
        
        const loteActualizado = { ...lote, quantity: nuevaCantidad };
        return this.loteService.updateLote(loteActualizado);
      }),
      map((response: any) => ({
        success: response?.status === 200 || response?.id,
        message: (response?.status === 200 || response?.id) ? 'Lote actualizado exitosamente' : 'Error al actualizar lote'
      }))
    );
  }

  /**
   * ✅ DESCONTAR DEL INVENTARIO
   */
  private descontarInventario(tipoAlimento: string, cantidad: number, usuario: string): Observable<any> {
    console.log(`🔄 Buscando producto "${tipoAlimento}" para descontar ${cantidad} kg`);
    
    return this.productService.getProducts().pipe(
      switchMap((productos: any[]) => {
        const producto = productos.find(p => 
          p.name?.toLowerCase().includes(tipoAlimento.toLowerCase()) ||
          tipoAlimento.toLowerCase().includes(p.name?.toLowerCase())
        );

        if (!producto) {
          throw new Error(`Producto "${tipoAlimento}" no encontrado en inventario`);
        }

        if (producto.quantity < cantidad) {
          throw new Error(`Stock insuficiente para ${tipoAlimento}. Disponible: ${producto.quantity} kg, Requerido: ${cantidad} kg`);
        }

        const nuevaCantidad = producto.quantity - cantidad;
        console.log(`🔄 Descontando ${cantidad} kg de ${producto.name}: ${producto.quantity} → ${nuevaCantidad}`);

        const productoActualizado = { ...producto, quantity: nuevaCantidad };
        return this.productService.updateProduct(productoActualizado);
      }),
      map((response: any) => ({
        success: true,
        message: `Inventario descontado: ${cantidad} kg de ${tipoAlimento}`
      }))
    );
  }
}
