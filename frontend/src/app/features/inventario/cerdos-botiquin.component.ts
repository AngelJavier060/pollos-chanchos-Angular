import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cerdos-botiquin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cerdos-botiquin-container">
      <div class="header">
        <h1>🏥 BOTIQUÍN VETERINARIO ESENCIAL PARA CERDOS</h1>
        <p>Productos recomendados disponibles en Ecuador - 2025</p>
      </div>

      <div class="info-section">
        <h2>📍 Dónde Comprar en Ecuador</h2>
        <div class="info-grid">
          <div class="info-card">
            <h3>🏪 Almacenes INDIA (PRONACA)</h3>
            <p><strong>Teléfono:</strong> 1800-776622<br>
            <strong>Ubicación:</strong> Red nacional (8 almacenes)<br>
            <strong>Productos:</strong> Línea INDIA, vitaminas, antibióticos</p>
          </div>
          <div class="info-card">
            <h3>🏪 AGRIPAC</h3>
            <p><strong>Teléfono:</strong> (04) 3703870 - 2560400<br>
            <strong>Ubicación:</strong> Guayaquil y sucursales<br>
            <strong>Productos:</strong> Medicamentos importados</p>
          </div>
          <div class="info-card">
            <h3>🏪 ECUAFARVET</h3>
            <p><strong>Teléfono:</strong> 022800966 / 0997019269<br>
            <strong>Email:</strong> farmacos&#64;ecuafarvet.com.ec<br>
            <strong>Productos:</strong> Meloxicam, antiinflamatorios</p>
          </div>
          <div class="info-card">
            <h3>🏪 VETFARM Ecuador</h3>
            <p><strong>Web:</strong> www.vetfarm.ec<br>
            <strong>Productos:</strong> Antianémicos, vitaminas, desparasitantes</p>
          </div>
        </div>
      </div>

      <div class="content">
        <!-- NIVEL 1: EMERGENCIAS VITALES -->
        <div class="category-section">
          <div class="category-header">
            <h2>🚨 NIVEL 1: EMERGENCIAS VITALES</h2>
            <span class="priority-badge priority-high">PRIORIDAD CRÍTICA</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Uso Principal</th>
                <th>Dosis</th>
                <th>Vía</th>
                <th>Dónde Comprar</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="product-name">Difenhidramina o Clorfeniramina (Histamin)</td>
                <td>Shock anafiláctico, alergias severas</td>
                <td><span class="dosage">1-2 mg/kg</span></td>
                <td>IM o IV</td>
                <td><span class="provider">Veterinarias</span></td>
                <td>⚠️ Indispensable para emergencias</td>
              </tr>
              <tr>
                <td class="product-name">Dexametasona</td>
                <td>Shock, inflamación severa, edemas</td>
                <td><span class="dosage">0.5-1 mg/kg</span></td>
                <td>IM o IV</td>
                <td><span class="provider">INDIA / Agripac</span></td>
                <td>Solo emergencias - Corticoide</td>
              </tr>
              <tr>
                <td class="product-name">Oxitocina 10 UI/ml</td>
                <td>Retención placentaria, inercia uterina</td>
                <td><span class="dosage">20-30 UI</span></td>
                <td>IM o IV</td>
                <td><span class="provider">INDIA / Veterinarias</span></td>
                <td>⚠️ ESENCIAL si tienes cerdas</td>
              </tr>
              <tr>
                <td class="product-name">Gluconato de Calcio 20%</td>
                <td>Hipocalcemia, parálisis puerperal</td>
                <td><span class="dosage">50-100 ml</span></td>
                <td>IV lento</td>
                <td><span class="provider">INDIA / Agripac</span></td>
                <td>Aplicar tibio y MUY LENTO</td>
              </tr>
              <tr>
                <td class="product-name">Dextrosa 50% + Aminoácidos</td>
                <td>Hipoglucemia, debilidad extrema</td>
                <td><span class="dosage">10-20 ml</span></td>
                <td>IV lento</td>
                <td><span class="provider">Veterinarias</span></td>
                <td>Reconstituyente energético</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- NIVEL 2: USO FRECUENTE -->
        <div class="category-section">
          <div class="category-header">
            <h2>💊 NIVEL 2: USO FRECUENTE</h2>
            <span class="priority-badge priority-high">PRIORIDAD ALTA</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Uso Principal</th>
                <th>Dosis</th>
                <th>Vía</th>
                <th>Dónde Comprar</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="product-name">Meloxicam 2% inyectable</td>
                <td>Dolor, fiebre, inflamación, cojeras</td>
                <td><span class="dosage">0.4 mg/kg (1 ml/50 kg)</span></td>
                <td>IM o IV</td>
                <td><span class="provider">ECUAFARVET</span></td>
                <td>⭐ MUY IMPORTANTE - Más seguro</td>
              </tr>
              <tr>
                <td class="product-name">Flunixin Meglumine</td>
                <td>Dolor intenso, cólicos, fiebre alta</td>
                <td><span class="dosage">2.2 mg/kg</span></td>
                <td>IM</td>
                <td><span class="provider">Veterinarias</span></td>
                <td>Para dolor severo</td>
              </tr>
              <tr>
                <td class="product-name">Shotapen LA (Penicilina)</td>
                <td>Infecciones respiratorias, heridas</td>
                <td><span class="dosage">1 ml/10-15 kg</span></td>
                <td>IM profunda</td>
                <td><span class="provider">INDIA / Agripac</span></td>
                <td>Retiro: 21-28 días</td>
              </tr>
              <tr>
                <td class="product-name">Oxitetraciclina LA</td>
                <td>Infecciones bacterianas generales</td>
                <td><span class="dosage">1 ml/10 kg</span></td>
                <td>IM</td>
                <td><span class="provider">INDIA / Agripac</span></td>
                <td>Acción prolongada (3 días)</td>
              </tr>
              <tr>
                <td class="product-name">Clortetraciclina 12.5% (Línea INDIA)</td>
                <td>Infecciones en aves, cerdos, bovinos</td>
                <td><span class="dosage">Según indicación</span></td>
                <td>Oral/IM</td>
                <td><span class="provider">INDIA (PRONACA)</span></td>
                <td>Producto nacional</td>
              </tr>
              <tr>
                <td class="product-name">Hierro Dextrano 200 mg/ml</td>
                <td>Anemia ferropénica en lechones</td>
                <td><span class="dosage">1 ml (200 mg)</span></td>
                <td>IM cuello</td>
                <td><span class="provider">VETFARM / INDIA</span></td>
                <td>⚠️ CRÍTICO: Aplicar 2-3 días nacidos</td>
              </tr>
              <tr>
                <td class="product-name">Ivermectina 1% inyectable</td>
                <td>Parásitos internos y externos</td>
                <td><span class="dosage">1 ml/33 kg</span></td>
                <td>SC (NO IM)</td>
                <td><span class="provider">INDIA / Agripac</span></td>
                <td>⚠️ SOLO subcutánea. Retiro: 28 días</td>
              </tr>
              <tr>
                <td class="product-name">Levamisol o Fenbendazol</td>
                <td>Parásitos gastrointestinales</td>
                <td><span class="dosage">Según fabricante</span></td>
                <td>Oral</td>
                <td><span class="provider">Veterinarias</span></td>
                <td>Rotación con ivermectina</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="warning">
          <strong>⚠️ ADVERTENCIA CRÍTICA:</strong> La Ivermectina se aplica EXCLUSIVAMENTE vía SUBCUTÁNEA (bajo la piel del cuello o base de oreja), NUNCA intramuscular. Tiempo de retiro: 28 días antes del sacrificio.
        </div>

        <!-- NIVEL 3: VITAMINAS Y APOYO -->
        <div class="category-section">
          <div class="category-header">
            <h2>💉 NIVEL 3: VITAMINAS Y RECONSTITUYENTES</h2>
            <span class="priority-badge priority-medium">IMPORTANTE</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Uso Principal</th>
                <th>Dosis</th>
                <th>Vía</th>
                <th>Dónde Comprar</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="product-name">Complejo B inyectable</td>
                <td>Estrés, anorexia, recuperación</td>
                <td><span class="dosage">2-5 ml</span></td>
                <td>IM</td>
                <td><span class="provider">INDIA / VETFARM</span></td>
                <td>Apoya sistema nervioso</td>
              </tr>
              <tr>
                <td class="product-name">ADE inyectable</td>
                <td>Inmunidad, crecimiento</td>
                <td><span class="dosage">1-2 ml</span></td>
                <td>IM</td>
                <td><span class="provider">INDIA / Veterinarias</span></td>
                <td>Vitaminas liposolubles</td>
              </tr>
              <tr>
                <td class="product-name">Electrolitos orales en polvo</td>
                <td>Deshidratación, diarreas</td>
                <td><span class="dosage">Según fabricante</span></td>
                <td>Oral (agua)</td>
                <td><span class="provider">INDIA / Agripac</span></td>
                <td>⚠️ ESENCIAL para lechones</td>
              </tr>
              <tr>
                <td class="product-name">Sulfato de Neomicina oral</td>
                <td>Diarreas bacterianas</td>
                <td><span class="dosage">Según fabricante</span></td>
                <td>Oral</td>
                <td><span class="provider">Veterinarias</span></td>
                <td>Combinar con electrolitos</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ANTISÉPTICOS Y DESINFECTANTES -->
        <div class="category-section">
          <div class="category-header">
            <h2>🧴 ANTISÉPTICOS Y DESINFECTANTES</h2>
            <span class="priority-badge priority-normal">NECESARIO</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Uso</th>
                <th>Aplicación</th>
                <th>Dónde Comprar</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="product-name">Clorhexidina 2-4%</td>
                <td>Piel, heridas, ombligos</td>
                <td>Tópico</td>
                <td><span class="provider">Farmacias</span></td>
                <td>Para animales</td>
              </tr>
              <tr>
                <td class="product-name">Yodo povidona 10%</td>
                <td>Desinfección heridas</td>
                <td>Tópico</td>
                <td><span class="provider">Farmacias</span></td>
                <td>Alternativa económica</td>
              </tr>
              <tr>
                <td class="product-name">Amonio cuaternario</td>
                <td>Instalaciones, equipos</td>
                <td>Según dilución</td>
                <td><span class="provider">INDIA / Agripac</span></td>
                <td>Para infraestructura</td>
              </tr>
              <tr>
                <td class="product-name">Sulfato de plata spray</td>
                <td>Heridas, colas cortadas</td>
                <td>Directo</td>
                <td><span class="provider">Veterinarias</span></td>
                <td>Cicatrizante</td>
              </tr>
              <tr>
                <td class="product-name">Reverin (Violeta de genciana)</td>
                <td>Heridas superficiales</td>
                <td>Directo</td>
                <td><span class="provider">Farmacias</span></td>
                <td>Efecto secante</td>
              </tr>
              <tr>
                <td class="product-name">Terramicina spray</td>
                <td>Heridas infectadas</td>
                <td>Directo</td>
                <td><span class="provider">Veterinarias</span></td>
                <td>Antibiótico tópico</td>
              </tr>
              <tr>
                <td class="product-name">Cipermetrina o Permetrina spray</td>
                <td>Control de moscas</td>
                <td>Instalaciones</td>
                <td><span class="provider">INDIA / Agripac</span></td>
                <td>No en lechones pequeños</td>
              </tr>
              <tr>
                <td class="product-name">Alcohol 70%</td>
                <td>Desinfección general</td>
                <td>Tópico</td>
                <td><span class="provider">Farmacias</span></td>
                <td>Limpieza de equipos</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- MATERIAL E INSTRUMENTAL -->
        <div class="category-section">
          <div class="category-header">
            <h2>🔧 MATERIAL E INSTRUMENTAL</h2>
            <span class="priority-badge priority-normal">NECESARIO</span>
          </div>
          
          <h3>Jeringas</h3>
          <div class="supplies-grid">
            <div class="supply-item">
              <span class="supply-name">Jeringas 5 ml</span>
              <span class="supply-qty">10 unidades</span>
            </div>
            <div class="supply-item">
              <span class="supply-name">Jeringas 10 ml</span>
              <span class="supply-qty">10 unidades</span>
            </div>
            <div class="supply-item">
              <span class="supply-name">Jeringas 20 ml</span>
              <span class="supply-qty">5 unidades</span>
            </div>
          </div>

          <h3>Agujas Hipodérmicas</h3>
          <div class="supplies-grid">
            <div class="supply-item">
              <span class="supply-name">21G x 1" (lechones)</span>
              <span class="supply-qty">50 unidades</span>
            </div>
            <div class="supply-item">
              <span class="supply-name">18G x 1.5" (crecimiento)</span>
              <span class="supply-qty">50 unidades</span>
            </div>
            <div class="supply-item">
              <span class="supply-name">16G x 2" (adultos)</span>
              <span class="supply-qty">50 unidades</span>
            </div>
          </div>

          <h3>Instrumental</h3>
          <div class="supplies-grid">
            <div class="supply-item">
              <span class="supply-name">Termómetro digital</span>
              <span class="supply-qty">2 unidades</span>
            </div>
            <div class="supply-item">
              <span class="supply-name">Sonda nasogástrica</span>
              <span class="supply-qty">2 tamaños</span>
            </div>
            <div class="supply-item">
              <span class="supply-name">Pinzas hemostáticas</span>
              <span class="supply-qty">2 unidades</span>
            </div>
            <div class="supply-item">
              <span class="supply-name">Tijeras quirúrgicas</span>
              <span class="supply-qty">1 unidad</span>
            </div>
            <div class="supply-item">
              <span class="supply-name">Guantes desechables</span>
              <span class="supply-qty">1 caja</span>
            </div>
            <div class="supply-item">
              <span class="supply-name">Linterna LED</span>
              <span class="supply-qty">1 unidad</span>
            </div>
          </div>

          <h3>Material de Curación</h3>
          <div class="supplies-grid">
            <div class="supply-item">
              <span class="supply-name">Gasas estériles</span>
              <span class="supply-qty">2 paquetes</span>
            </div>
            <div class="supply-item">
              <span class="supply-name">Algodón</span>
              <span class="supply-qty">1 rollo</span>
            </div>
            <div class="supply-item">
              <span class="supply-name">Vendas elásticas</span>
              <span class="supply-qty">3 unidades</span>
            </div>
            <div class="supply-item">
              <span class="supply-name">Esparadrapo</span>
              <span class="supply-qty">2 rollos</span>
            </div>
            <div class="supply-item">
              <span class="supply-name">Suero fisiológico 250ml</span>
              <span class="supply-qty">5 bolsas</span>
            </div>
            <div class="supply-item">
              <span class="supply-name">Papel absorbente</span>
              <span class="supply-qty">2 rollos</span>
            </div>
          </div>
        </div>

        <!-- NOTAS IMPORTANTES -->
        <div class="notes-section">
          <h3>📝 NOTAS IMPORTANTES</h3>
          <ul>
            <li><strong>Almacenamiento:</strong> 15-25°C, lugar seco, protegido de la luz</li>
            <li><strong>Caducidades:</strong> Revisar mensualmente todos los medicamentos</li>
            <li><strong>Registro:</strong> Llevar libro de control de medicamentos aplicados</li>
            <li><strong>Tiempos de retiro:</strong> Respetar SIEMPRE antes del sacrificio</li>
            <li><strong>Refrigeración:</strong> Algunos productos requieren frío (verificar etiqueta)</li>
            <li><strong>Emergencias:</strong> Tener teléfonos de veterinarios disponibles 24/7</li>
          </ul>
        </div>

        <!-- CONTACTOS DE EMERGENCIA -->
        <div class="contacts-section">
          <h3>📞 CONTACTOS DE EMERGENCIA</h3>
          <div class="contacts-grid">
            <div>
              <strong>Veterinario cabecera:</strong><br>
              <input type="text" placeholder="Nombre y teléfono">
            </div>
            <div>
              <strong>Veterinario alternativo:</strong><br>
              <input type="text" placeholder="Nombre y teléfono">
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./cerdos-botiquin.component.scss']
})
export class CerdosBotiquinComponent {
  constructor() {}
}
