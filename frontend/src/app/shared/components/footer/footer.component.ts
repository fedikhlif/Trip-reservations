import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer>
      <span>TRIP DESK</span>
      <span>LOCAL DEVELOPMENT · 127.0.0.1:8082</span>
    </footer>
  `,
  styles: [`
    footer {
      padding: 25px 0 28px;
      display: flex;
      justify-content: space-between;
      color: #818980;
      font-size: 9px;
      letter-spacing: 1.2px;
    }
    @media (max-width: 600px) {
      footer { gap: 12px; font-size: 8px; }
    }
  `],
})
export class FooterComponent {}
