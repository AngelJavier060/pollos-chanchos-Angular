import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

interface Statistic {
  value: number;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule  // Asegurando que RouterModule está importado
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit {
  constructor(public router: Router) {}
  
  title = 'Granja Elvita';
  isMobileMenuOpen = false;
  
  features = [
    {
      icon: 'bi bi-graph-up',
      title: 'Gestión Eficiente',
      description: 'Control detallado de producción y recursos'
    },
    {
      icon: 'bi bi-shield-check',
      title: 'Calidad Garantizada',
      description: 'Seguimiento de estándares de calidad'
    },
    {
      icon: 'bi bi-clock-history',
      title: 'Trazabilidad',
      description: 'Seguimiento completo del ciclo productivo'
    }
  ];

  productionTypes = [
    {
      image: 'Pollo1.jpg',
      title: 'Producción Avícola',
      description: 'Gestión avanzada de aves con tecnología de vanguardia para garantizar la máxima calidad y rendimiento en la producción.',
      route: '/animals/pollos',
      category: 'Avícola',
      features: [
        { icon: 'bi-egg', text: 'Alta productividad' },
        { icon: 'bi-graph-up', text: 'Crecimiento óptimo' },
        { icon: 'bi-shield-check', text: 'Control sanitario' }
      ],
      stats: {
        production: '15K+ mensual',
        quality: '99.8% pureza'
      }
    },
    {
      image: 'cerdito1.jpg',
      title: 'Producción Porcina',
      description: 'Control integral de cerdos con sistemas modernos que aseguran el bienestar animal y la calidad superior del producto final.',
      route: '/animals/chanchos',
      category: 'Porcina',
      features: [
        { icon: 'bi-heart-pulse', text: 'Bienestar animal' },
        { icon: 'bi-shield-fill-check', text: 'Certificado de calidad' },
        { icon: 'bi-speedometer2', text: 'Crecimiento acelerado' }
      ],
      stats: {
        production: '5K+ unidades',
        quality: '98.5% premium'
      }
    }
  ];

  statistics: Statistic[] = [
    {
      value: 15000,
      label: 'Producción Mensual',
      icon: 'bi bi-graph-up-arrow',
      description: 'Unidades producidas mensualmente entre pollos y cerdos'
    },
    {
      value: 98,
      label: 'Satisfacción',
      icon: 'bi bi-emoji-smile',
      description: 'Porcentaje de clientes satisfechos con nuestros productos'
    },
    {
      value: 25,
      label: 'Años de Experiencia',
      icon: 'bi bi-calendar-check',
      description: 'Años brindando productos de calidad a nuestros clientes'
    },
    {
      value: 500,
      label: 'Clientes Activos',
      icon: 'bi bi-people',
      description: 'Empresas y particulares que confían en nuestra calidad'
    }
  ];

  animateNumber(element: HTMLElement, end: number, duration: number = 2000) {
    const start = 0;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / (end - start)));
    let current = start;
    
    const timer = setInterval(() => {
      current += increment;
      element.textContent = current.toString();
      
      if (current === end) {
        clearInterval(timer);
      }
    }, stepTime);
  }

  ngOnInit() {
    // Agregando el evento click para el botón del menú móvil
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (mobileMenuButton && mobileMenu) {
      mobileMenuButton.addEventListener('click', () => {
        this.isMobileMenuOpen = !this.isMobileMenuOpen;
        if (this.isMobileMenuOpen) {
          mobileMenu.classList.remove('hidden');
        } else {
          mobileMenu.classList.add('hidden');
        }
      });
    }
  }

  ngAfterViewInit() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          const value = parseInt(element.getAttribute('data-value') || '0');
          this.animateNumber(element, value);
          observer.unobserve(element);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-number').forEach((el) => {
      observer.observe(el);
    });
  }
}