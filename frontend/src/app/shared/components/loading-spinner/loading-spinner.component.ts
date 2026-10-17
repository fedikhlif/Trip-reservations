import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div class="spinner-wrap" role="status" aria-label="Loading">
      <span class="spinner"></span>
    </div>
  `,
  styles: [`
    .spinner-wrap {
      display: flex;
      justify-content: center;
      padding: 40px 0;
    }
    .spinner {
      display: inline-block;
      width: 28px;
      height: 28px;
      border: 2px solid var(--line);
      border-top-color: var(--forest);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class LoadingSpinnerComponent {}
