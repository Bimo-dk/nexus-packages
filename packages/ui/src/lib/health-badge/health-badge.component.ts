import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { RemoteHealthStatus } from '@bimo-dk/nexus-core';

@Component({
  selector: 'bimo-health-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <span class="badge" [attr.data-status]="status ?? 'unknown'">
      <span class="dot"></span>
      <span class="label">{{ label }}</span>
    </span>
  `,
  styles: [`
    :host { display: inline-flex; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .dot { width: 8px; height: 8px; border-radius: 999px; background: currentColor; }
    .badge[data-status="healthy"]  { background: #dcfce7; color: #14532d; }
    .badge[data-status="degraded"] { background: #fef3c7; color: #78350f; }
    .badge[data-status="down"]     { background: #fee2e2; color: #7f1d1d; }
    .badge[data-status="unknown"]  { background: #f1f5f9; color: #475569; }
  `],
})
export class HealthBadgeComponent {
  @Input() status?: RemoteHealthStatus;

  get label(): string {
    return (this.status ?? 'unknown').toUpperCase();
  }
}
