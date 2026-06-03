import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'bimo-offline-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (isOffline) {
      <div class="banner" role="alert">
        <span class="icon">⚠</span>
        <span><strong>Registry offline</strong> — viser cached konfiguration</span>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .banner {
      background: #fef3c7;
      color: #78350f;
      padding: 10px 20px;
      border-bottom: 1px solid #fbbf24;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: opacity 0.25s ease, transform 0.25s ease;
    }
    .icon { font-size: 16px; }
  `],
})
export class OfflineBannerComponent {
  @Input() isOffline = false;
}
