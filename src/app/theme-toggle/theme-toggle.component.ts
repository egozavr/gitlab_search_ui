import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ThemeMode } from '../gitlab-config/state/gitlab-config.store';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleComponent {
  icon = 'hdr_auto';

  @Input() set mode(v: ThemeMode) {
    this.icon = v === 'auto' ? 'hdr_auto' : v === 'dark' ? 'dark_mode' : 'light_mode';
  }
  @Output() setMode = new EventEmitter<ThemeMode>();
}
