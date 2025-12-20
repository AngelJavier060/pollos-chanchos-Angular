import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pollos-botiquin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pollos-botiquin-container">
      <div class="header">
        <h1>🐓 BOTIQUÍN VETERINARIO PARA POLLOS CRIOLLOS</h1>
        <p>Productos recomendados disponibles en Ecuador - Especial para crianza de campo</p>
      </div>

      <div class="info-section">
        <h2>📍 Dónde Comprar en Ecuador</h2>
        <div class="info-grid">
          <div class="info-card">
            <h3>🏪 Almacenes INDIA (PRONACA)</h3>
            <p><strong>Teléfono:</strong> 1800-776622<br>
            <strong>Productos:</strong> AVISOL, Antibióticos INDIA, Vacunas, Vitaminas<br>
            <strong>Ventaja:</strong> Red nacional, productos nacionales económicos</p>
          </div>
          <div class="info-card">
            <h3>🏪 AGRIPAC</h3>
            <p><strong>Teléfono:</strong> (04) 3703870<br>
            <strong>Productos:</strong> Enrofloxacina, Oxitetraciclina, Vacunas importadas<br>
            <strong>Ventaja:</strong> Amplio catálogo especializado</p>
          </div>
          <div class="info-card">
            <h3>🏪 VETFARM Ecuador</h3>
            <p><strong>Web:</strong> www.vetfarm.ec<br>
            <strong>Productos:</strong> Vitaminas, Anticoccidiales, Desparasitantes<br>
            <strong>Ventaja:</strong> Productos específicos para aves</p>
          </div>
          <div class="info-card">
            <h3>🏪 Veterinarias Locales</h3>
            <p><strong>Productos:</strong> Medicamentos básicos, inyectables<br>
            <strong>Ventaja:</strong> Acceso inmediato en emergencias<br>
            <strong>Consejo:</strong> Buscar veterinarias con sección avícola</p>
          </div>
        </div>
      </div>

      <div class="content">
        <div class="alert-info">
          <strong>ℹ️ IMPORTANTE PARA POLLOS CRIOLLOS DE CAMPO:</strong> Los pollos de campo son más resistentes pero también más expuestos a parásitos y enfermedades por contacto con el suelo. Prioriza desparasitación, vacunación y vitaminas. La mayoría de medicamentos se administran VÍA ORAL en el agua de bebida.
        </div>

        <!-- NIVEL 1: ANTIBIÓTICOS Y ANTIINFECCIOSOS -->
        <div class="category-section">
          <div class="category-header">
            <h2>💊 NIVEL 1: ANTIBIÓTICOS Y ANTIINFECCIOSOS</h2>
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
                <td class="product-name">Enrofloxacina 10% soluble</td>
                <td>CRD, Colibacilosis, Salmonelosis, Cólera aviar, Coriza</td>
                <td><span class="dosage">0.5-1 ml/litro agua</span></td>
                <td>Oral (agua)</td>
                <td><span class="provider">AGRIPAC / Veterinarias</span></td>
                <td>⭐ ESENCIAL. 3-5 días tratamiento. Retiro: 5 días</td>
              </tr>
              <tr>
                <td class="product-name">Oxitetraciclina LA inyectable</td>
                <td>Infecciones respiratorias severas, Septicemias</td>
                <td><span class="dosage">1 ml/kg peso</span></td>
                <td>IM (pechuga)</td>
                <td><span class="provider">INDIA / Veterinarias</span></td>
                <td>Acción prolongada. Retiro: 10 días</td>
              </tr>
              <tr>
                <td class="product-name">Oxitetraciclina soluble</td>
                <td>Infecciones respiratorias, CRD, Cólera</td>
                <td><span class="dosage">2-3 g/litro agua</span></td>
                <td>Oral (agua)</td>
                <td><span class="provider">INDIA / Agripac</span></td>
                <td>5-7 días tratamiento. Más económica</td>
              </tr>
              <tr>
                <td class="product-name">Amoxicilina soluble</td>
                <td>Infecciones bacterianas generales</td>
                <td><span class="dosage">1 g/litro agua</span></td>
                <td>Oral (agua)</td>
                <td><span class="provider">Veterinarias</span></td>
                <td>3-5 días. Retiro: 1 día</td>
              </tr>
              <tr>
                <td class="product-name">Sulfatrimetoprim polvo</td>
                <td>Colibacilosis, Tifus aviar, Coccidiosis</td>
                <td><span class="dosage">1-2 g/litro agua</span></td>
                <td>Oral (agua)</td>
                <td><span class="provider">INDIA / Veterinarias</span></td>
                <td>5 días tratamiento. Económico</td>
              </tr>
              <tr>
                <td class="product-name">Tilosina soluble</td>
                <td>CRD, Micoplasma, Sinusitis</td>
                <td><span class="dosage">0.5 g/litro agua</span></td>
                <td>Oral (agua)</td>
                <td><span class="provider">Agripac / Veterinarias</span></td>
                <td>3-5 días tratamiento</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="warning">
          <strong>⚠️ ADVERTENCIA - TIEMPOS DE RETIRO:</strong> Siempre respetar los días de retiro antes del sacrificio. Enrofloxacina: 5 días, Oxitetraciclina: 10 días, Amoxicilina: 1 día. NO consumir carne ni huevos durante el tratamiento y el período de retiro.
        </div>

        <!-- NIVEL 2: VITAMINAS Y ELECTROLITOS -->
        <div class="category-section">
          <div class="category-header">
            <h2>💉 NIVEL 2: VITAMINAS Y ELECTROLITOS</h2>
            <span class="priority-badge priority-high">MUY IMPORTANTE</span>
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
                <td class="product-name">AVISOL (PRONACA)</td>
                <td>Estrés, recepción pollitos, vacunación, cambios</td>
                <td><span class="dosage">1-2 ml/litro agua</span></td>
                <td>Oral (agua)</td>
                <td><span class="provider">INDIA (PRONACA)</span></td>
                <td>⭐ ESENCIAL. Producto nacional excelente</td>
              </tr>
              <tr>
                <td class="product-name">Complejo B inyectable</td>
                <td>Anorexia, debilidad, estrés</td>
                <td><span class="dosage">0.5 ml/ave</span></td>
                <td>IM (pechuga)</td>
                <td><span class="provider">INDIA / Veterinarias</span></td>
                <td>Recuperación rápida</td>
              </tr>
              <tr>
                <td class="product-name">Vitamina ADE inyectable</td>
                <td>Inmunidad, crecimiento, problemas visuales</td>
                <td><span class="dosage">0.5 ml/ave</span></td>
                <td>IM</td>
                <td><span class="provider">VETFARM / Veterinarias</span></td>
                <td>Vital para pollos de campo</td>
              </tr>
              <tr>
                <td class="product-name">Electrolitos + Vitaminas polvo</td>
                <td>Deshidratación, calor excesivo, estrés</td>
                <td><span class="dosage">1-2 g/litro agua</span></td>
                <td>Oral (agua)</td>
                <td><span class="provider">INDIA / Agripac</span></td>
                <td>⚠️ Indispensable en verano</td>
              </tr>
              <tr>
                <td class="product-name">Aminoácidos + Vitaminas</td>
                <td>Crecimiento, rendimiento, estrés nutricional</td>
                <td><span class="dosage">1 ml/litro agua</span></td>
                <td>Oral (agua)</td>
                <td><span class="provider">VETFARM / Agripac</span></td>
                <td>Mejora conversión alimenticia</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- NIVEL 3: ANTIPARASITARIOS -->
        <div class="category-section">
          <div class="category-header">
            <h2>🦠 NIVEL 3: ANTIPARASITARIOS</h2>
            <span class="priority-badge priority-high">CRÍTICO PARA CAMPO</span>
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
                <td class="product-name">Ivermectina 1% oral/tópica</td>
                <td>Parásitos externos (ácaros, piojos, garrapatas)</td>
                <td><span class="dosage">2-3 gotas en nuca</span></td>
                <td>Tópica (nuca)</td>
                <td><span class="provider">Veterinarias</span></td>
                <td>⭐ ESENCIAL. Repetir a los 10-14 días</td>
              </tr>
              <tr>
                <td class="product-name">Levamisol 7.5% oral</td>
                <td>Parásitos intestinales (lombrices, ascárides)</td>
                <td><span class="dosage">1 ml/litro agua</span></td>
                <td>Oral (agua)</td>
                <td><span class="provider">INDIA / Veterinarias</span></td>
                <td>1 día tratamiento. Repetir a los 15 días</td>
              </tr>
              <tr>
                <td class="product-name">Piperazina citrato</td>
                <td>Ascárides (lombrices grandes)</td>
                <td><span class="dosage">200 mg/kg peso</span></td>
                <td>Oral (agua)</td>
                <td><span class="provider">Veterinarias</span></td>
                <td>Económico y efectivo</td>
              </tr>
              <tr>
                <td class="product-name">Flubendazol suspensión</td>
                <td>Helmintos intestinales (lombrices)</td>
                <td><span class="dosage">30 ppm en agua/7 días</span></td>
                <td>Oral (agua)</td>
                <td><span class="provider">Agripac</span></td>
                <td>Amplio espectro</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- NIVEL 4: ANTICOCCIDIALES -->
        <div class="category-section">
          <div class="category-header">
            <h2>🔬 NIVEL 4: ANTICOCCIDIALES</h2>
            <span class="priority-badge priority-high">MUY IMPORTANTE</span>
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
                <td class="product-name">Amprolium 20% soluble</td>
                <td>Coccidiosis (diarrea sanguinolenta)</td>
                <td><span class="dosage">1-2 g/litro agua/5-7 días</span></td>
                <td>Oral (agua)</td>
                <td><span class="provider">INDIA / Agripac</span></td>
                <td>⭐ ESENCIAL. Primera línea anti-coccidios</td>
              </tr>
              <tr>
                <td class="product-name">Sulfaquinoxalina</td>
                <td>Coccidiosis aguda</td>
                <td><span class="dosage">1 g/litro agua/3-5 días</span></td>
                <td>Oral (agua)</td>
                <td><span class="provider">Veterinarias</span></td>
                <td>Combinar con electrolitos</td>
              </tr>
              <tr>
                <td class="product-name">Toltrazuril 2.5%</td>
                <td>Coccidiosis (todas las especies)</td>
                <td><span class="dosage">1 ml/litro agua/2 días</span></td>
                <td>Oral (agua)</td>
                <td><span class="provider">Agripac / Importado</span></td>
                <td>Muy efectivo, tratamiento corto</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="warning">
          <strong>⚠️ COCCIDIOSIS - ENFERMEDAD #1 EN POLLOS DE CAMPO:</strong> Causa diarrea sanguinolenta, plumas erizadas, debilidad. Siempre tener Amprolium disponible. Prevención: mantener cama seca, evitar hacinamiento, rotar espacios.
        </div>

        <!-- VACUNAS -->
        <div class="category-section">
          <div class="category-header">
            <h2>💉 NIVEL 5: VACUNAS (PREVENCIÓN)</h2>
            <span class="priority-badge priority-medium">IMPORTANTE</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Vacuna</th>
                <th>Protege Contra</th>
                <th>Edad Aplicación</th>
                <th>Vía</th>
                <th>Dónde Comprar</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="product-name">Newcastle B1</td>
                <td>Newcastle (moquillo)</td>
                <td><span class="dosage">7-10 días</span></td>
                <td>Ocular/Nasal</td>
                <td><span class="provider">INDIA / Agripac</span></td>
                <td>⭐ OBLIGATORIA. Repetir cada 30 días</td>
              </tr>
              <tr>
                <td class="product-name">Newcastle La Sota</td>
                <td>Newcastle (refuerzo)</td>
                <td><span class="dosage">30 días y luego c/3 meses</span></td>
                <td>Ocular/Agua</td>
                <td><span class="provider">INDIA / Agripac</span></td>
                <td>Refuerzo después de B1</td>
              </tr>
              <tr>
                <td class="product-name">Viruela Aviar</td>
                <td>Viruela (bubas)</td>
                <td><span class="dosage">4-6 semanas</span></td>
                <td>Punción ala</td>
                <td><span class="provider">INDIA / Agripac</span></td>
                <td>Una vez en la vida. Muy importante</td>
              </tr>
              <tr>
                <td class="product-name">Gumboro</td>
                <td>Enfermedad de Gumboro</td>
                <td><span class="dosage">14-21 días</span></td>
                <td>Ocular/Agua</td>
                <td><span class="provider">INDIA / Agripac</span></td>
                <td>Afecta sistema inmune</td>
              </tr>
              <tr>
                <td class="product-name">Bronquitis Infecciosa</td>
                <td>Bronquitis (problemas respiratorios)</td>
                <td><span class="dosage">1 día y refuerzo 21 días</span></td>
                <td>Ocular/Spray</td>
                <td><span class="provider">Agripac</span></td>
                <td>Opcional pero recomendable</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- DESINFECTANTES -->
        <div class="category-section">
          <div class="category-header">
            <h2>🧴 NIVEL 6: DESINFECTANTES Y ANTISÉPTICOS</h2>
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
                <td class="product-name">Yodo povidona 10%</td>
                <td>Heridas, cortes, cirugías menores</td>
                <td>Tópico</td>
                <td><span class="provider">Farmacias</span></td>
                <td>Económico y efectivo</td>
              </tr>
              <tr>
                <td class="product-name">Violeta de genciana</td>
                <td>Heridas superficiales, hongos</td>
                <td>Tópico</td>
                <td><span class="provider">Farmacias</span></td>
                <td>Antiséptico tradicional</td>
              </tr>
              <tr>
                <td class="product-name">Amonio cuaternario</td>
                <td>Desinfección gallineros, equipos</td>
                <td>Dilución 1:200</td>
                <td><span class="provider">INDIA / Agripac</span></td>
                <td>Limpieza semanal instalaciones</td>
              </tr>
              <tr>
                <td class="product-name">Cal viva</td>
                <td>Desinfección de suelos</td>
                <td>Esparcir en piso</td>
                <td><span class="provider">Ferreterías</span></td>
                <td>Barato y efectivo. Usar con gallinero vacío</td>
              </tr>
              <tr>
                <td class="product-name">Formol 40%</td>
                <td>Fumigación gallineros</td>
                <td>Vapores (cuidado)</td>
                <td><span class="provider">Veterinarias</span></td>
                <td>⚠️ Tóxico. Usar sin aves, ventilar 24h</td>
              </tr>
              <tr>
                <td class="product-name">Cipermetrina spray</td>
                <td>Control de ácaros, piojos externos</td>
                <td>Spray sobre ave y gallinero</td>
                <td><span class="provider">INDIA / Agripac</span></td>
                <td>Aplicar cada 15 días en infestaciones</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./pollos-botiquin.component.scss']
})
export class PollosBotiquinComponent {
  constructor() {}
}
