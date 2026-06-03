import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule, type MatSlideToggleChange } from '@angular/material/slide-toggle';
import type { RemoteConfig } from '@bimo-dk/nexus-core';
import { HealthBadgeComponent } from '../health-badge/health-badge.component';

@Component({
  selector: 'bimo-remote-status-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatCardModule, MatSlideToggleModule, HealthBadgeComponent],
  template: `
    <mat-card class="card" (click)="onNavigate($event)">
      <mat-card-header>
        <mat-card-title>{{ remote.name }}</mat-card-title>
        <mat-card-subtitle><code>/{{ remote.routePath }}</code></mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <bimo-health-badge [status]="remote.healthStatus" />
      </mat-card-content>
      <mat-card-actions (click)="$event.stopPropagation()">
        <mat-slide-toggle
          [checked]="remote.enabled"
          (change)="onToggle($event)"
          color="primary">
          {{ remote.enabled ? 'Active' : 'Inactive' }}
        </mat-slide-toggle>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    :host { display: block; }
    .card { cursor: pointer; transition: box-shadow 0.15s; }
    .card:hover { box-shadow: 0 6px 16px rgba(0,0,0,0.08); }
    mat-card-actions { padding: 8px 16px; }
    code {
      font-family: 'SF Mono', Menlo, monospace;
      font-size: 12px;
      color: rgba(0,0,0,0.6);
    }
  `],
})
export class RemoteStatusCardComponent {
  @Input({ required: true }) remote!: RemoteConfig;

  @Output() toggle = new EventEmitter<RemoteConfig>();
  @Output() navigate = new EventEmitter<RemoteConfig>();

  onToggle(_event: MatSlideToggleChange): void {
    this.toggle.emit(this.remote);
  }

  onNavigate(_event: MouseEvent): void {
    this.navigate.emit(this.remote);
  }
}
