import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ThemeMode } from '../gitlab-config/state/gitlab-config.store';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleComponent {
  @Input() mode: ThemeMode;
  @Output() toggleMode = new EventEmitter<void>();
}
