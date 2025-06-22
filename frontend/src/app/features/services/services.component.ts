import { Component, OnInit, HostListener } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, SharedModule, NavbarComponent],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('0.5s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerFadeIn', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(30px)' }),
          stagger('100ms', [
            animate('0.5s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class ServicesComponent implements OnInit {
  services = [
    {
      title: 'Gestión Integral de Granjas',
      description: 'Optimice sus operaciones con nuestro sistema de gestión avanzado para maximizar la productividad y rentabilidad de su granja.',
      icon: 'bi bi-graph-up-arrow',
      image: 'assets/gestion.jpg',
      features: [
        'Monitoreo en tiempo real de peso y crecimiento',
        'Control de inventario automatizado de alimentos',
        'Análisis predictivo de producción y rendimiento',
        'Gestión integral de salud animal'
      ]
    },
    {
      title: 'Consultoría Técnica Especializada',
      description: 'Asesoramiento experto por profesionales con amplia experiencia en el sector avícola y porcino para optimizar sus procesos productivos.',
      icon: 'bi bi-clipboard-check',
      image: 'assets/Consultoria.jpg',
      features: [
        'Evaluación y diseño de instalaciones',
        'Optimización de procesos de crianza',
        'Planificación estratégica de producción',
        'Certificaciones sanitarias y normativas'
      ]
    },
    {
      title: 'Sistema de Control Ambiental',
      description: 'Soluciones tecnológicas avanzadas para mantener las condiciones ambientales óptimas que garantizan el bienestar animal y maximizan la producción.',
      icon: 'bi bi-thermometer-half',
      image: 'assets/ambiental.jpg',
      features: [
        'Control de temperatura por zonas',
        'Monitoreo de humedad y ventilación',
        'Sistema automatizado de climatización',
        'Alertas en tiempo real de condiciones'
      ]
    },
    {
      title: 'Servicios Veterinarios Especializados',
      description: 'Atención veterinaria integral preventiva y correctiva por profesionales altamente calificados para garantizar la salud y productividad de sus animales.',
      icon: 'bi bi-heart-pulse',
      image: 'assets/veterinario.jpg',
      features: [
        'Programas personalizados de vacunación',
        'Control sanitario preventivo',
        'Diagnóstico temprano de enfermedades',
        'Planes nutricionales específicos por especie'
      ]
    },
    {
      title: 'Manejo de Pollos',
      description: 'Servicios especializados en la crianza eficiente de pollos con los más altos estándares de calidad y bienestar animal para maximizar su rentabilidad.',
      icon: 'bi bi-egg',
      image: 'assets/pollos.png',
      features: [
        'Control de crecimiento y desarrollo',
        'Manejo de lotes y densidad poblacional',
        'Programas de alimentación balanceada',
        'Optimización de conversión alimenticia'
      ]
    },
    {
      title: 'Manejo de Chanchos',
      description: 'Soluciones integrales para la producción porcina con enfoque en eficiencia, salud y bienestar animal para lograr productos de alta calidad.',
      icon: 'bi bi-piggy-bank',
      image: 'assets/cerdos.jpg',
      features: [
        'Gestión de ciclos reproductivos',
        'Control de peso y desarrollo',
        'Planes de alimentación por etapas',
        'Manejo sanitario especializado'
      ]
    }
  ];

  testimonials = [
    {
      name: 'Miguel Calderón',
      position: 'Propietario, Granja Avícola El Sol',
      quote: 'Los servicios de Granja Elvita transformaron completamente nuestra operación. El aumento en la eficiencia y producción ha sido notable desde que implementamos sus recomendaciones.',
      image: 'assets/miguel.png'
    },
    {
      name: 'Alexandra Valle',
      position: 'Gerente de Producción, Agropecuaria San José',
      quote: 'El soporte técnico y la asesoría que recibimos de Granja Elvita ha sido fundamental para mejorar nuestros indicadores de producción y sanidad animal.',
      image: 'assets/alexandra.png'
    },
    {
      name: 'Angel Guerrero',
      position: 'Director, Porcícola Los Andes',
      quote: 'La implementación del sistema de control ambiental de Granja Elvita mejoró significativamente el bienestar de nuestros animales y redujo costos operativos.',
      image: 'assets/angel.png'
    }
  ];

  visibleSection = 'all';
  activeTestimonial = 0;
  private scrolling = false;

  constructor() { }

  ngOnInit(): void {
    this.startTestimonialRotation();
  }

  scrollToContact(): void {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  filterServices(category: string): void {
    this.visibleSection = category;
  }

  showNextTestimonial(): void {
    this.activeTestimonial = (this.activeTestimonial + 1) % this.testimonials.length;
  }

  showPrevTestimonial(): void {
    this.activeTestimonial = (this.activeTestimonial - 1 + this.testimonials.length) % this.testimonials.length;
  }

  private startTestimonialRotation(): void {
    setInterval(() => {
      if (!this.scrolling) {
        this.showNextTestimonial();
      }
    }, 5000);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.scrolling = true;
    setTimeout(() => {
      this.scrolling = false;
    }, 1000);
  }
}