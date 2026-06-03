import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export type LoadingSpinnerSize = 'small' | 'medium' | 'large';

const DIAMETER: Record<LoadingSpinnerSize, number> = {
  small: 24,
  medium: 48,
  large: 80,
};

@Component({
  selector: 'bimo-loading-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="container">
      <mat-spinner [diameter]="diameter" />
    </div>
  `,
  styles: [`
    .container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
  `],
})
export class LoadingSpinnerComponent {
  @Input() size: LoadingSpinnerSize = 'medium';

  get diameter(): number {
    return DIAMETER[this.size];
  }
}
