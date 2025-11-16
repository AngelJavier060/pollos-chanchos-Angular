import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ProductService } from './product.service';
import { MortalidadBackendService, RegistroMortalidadRequest } from './mortalidad-backend.service';
import { MorbilidadBackendService, RegistroMorbilidadRequest } from './morbilidad-backend.service';

export interface RegistroDiarioCompleto {
  loteId: string;
  loteCodigo?: string;
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

    // 1. REGISTRAR MORTALIDAD (descuenta stock en backend)
    if (registro.animalesMuertos > 0) {
      const registroMortalidad: RegistroMortalidadRequest = {
        loteId: registro.loteId,
        cantidadMuertos: registro.animalesMuertos,
        causaId: 8, // "Causas Desconocidas" por defecto
        observaciones: registro.observaciones || 'Registro desde formulario diario',
        usuarioRegistro: registro.usuario,
        confirmado: true
      };
      // Usar endpoint compatible con causaId
      operaciones.push(this.mortalidadService.registrarMortalidadConCausa(registroMortalidad));
    }

    // 2. REGISTRAR MORBILIDAD (no altera stock)
    if (registro.animalesEnfermos > 0) {
      // Derivar loteId numérico desde el código del lote (backend espera Long)
      const codigo = (registro.loteCodigo || '').toString();
      let loteIdNumerico = Number(((codigo.match(/\d+/g) || []).join('')) || 0) || 0;
      if (!loteIdNumerico) {
        // Fallback: extraer dígitos del UUID si existen
        const fromUuid = (registro.loteId || '').toString();
        loteIdNumerico = Number(((fromUuid.match(/\d+/g) || []).join('')) || 0) || 0;
      }

      const enfermedad$ = this.morbilidadService.obtenerEnfermedades().pipe(
        map((lista: any[]) => {
          // Elegir una enfermedad válida (primera activa); fallback id 1
          const id = Number(lista?.[0]?.id || 1);
          return Number.isFinite(id) && id > 0 ? id : 1;
        }),
        switchMap((enfermedadId: number) => {
          // Construir payload compatible con la entidad del backend
          const payloadMorbilidad: any = {
            loteId: loteIdNumerico > 0 ? loteIdNumerico : 0,
            fecha: registro.fecha.toISOString().split('T')[0],
            hora: new Date().toTimeString().slice(0, 8),
            cantidadEnfermos: registro.animalesEnfermos,
            enfermedad: { id: enfermedadId },
            sintomasObservados: 'No especificados',
            gravedad: 'LEVE',
            estadoTratamiento: 'EN_OBSERVACION',
            observacionesVeterinario: registro.observaciones || 'Registro desde formulario diario',
            requiereAislamiento: false,
            contagioso: false,
            usuarioRegistro: registro.usuario,
            animalesTratados: registro.animalesEnfermos
          };
          return this.morbilidadService.registrarMorbilidad(payloadMorbilidad as any);
        })
      );

      operaciones.push(enfermedad$);
    }

    // 3. DESCONTAR INVENTARIO
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

  // Eliminado: la actualización de stock se delega al backend vía Mortalidad.

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
