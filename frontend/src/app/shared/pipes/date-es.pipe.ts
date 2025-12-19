import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateEs',
  standalone: true,
})
export class DateEsPipe implements PipeTransform {
  transform(value: any): string {
    if (value == null || value === '') return '';

    // If Date instance
    if (value instanceof Date) {
      return this.formatDate(value);
    }

    // If string with time part
    let s = String(value).trim();
    if (!s) return '';

    if (s.includes('T')) {
      s = s.split('T')[0];
    }

    // Replace common separators with hyphen
    const norm = s.replace(/[\/.]/g, '-').replace(/,/g, '-');
    const parts = norm.split('-').filter(Boolean);

    // Handle YYYY-MM-DD
    if (parts.length === 3 && parts[0].length === 4) {
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      if (this.validYMD(y, m, d)) return this.formatYMD(y, m, d);
    }

    // Handle DD-MM-YYYY already (normalize with padding)
    if (parts.length === 3 && parts[2].length === 4) {
      const d = Number(parts[0]);
      const m = Number(parts[1]);
      const y = Number(parts[2]);
      if (this.validYMD(y, m, d)) return this.formatYMD(y, m, d);
    }

    // Fallback: try native Date parser
    const date = new Date(s);
    if (!isNaN(date.getTime())) {
      return this.formatDate(date);
    }

    // If still not parsable, return original string
    return String(value);
  }

  private pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  private formatYMD(y: number, m: number, d: number): string {
    return `${this.pad(d)}-${this.pad(m)}-${y}`;
  }

  private formatDate(dt: Date): string {
    return this.formatYMD(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  }

  private validYMD(y: number, m: number, d: number): boolean {
    if (!y || !m || !d) return false;
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    return true;
  }
}
