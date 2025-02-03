import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { ThemeMode } from '../gitlab-config/state/gitlab-config.store';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatIconButton, MatMenuTrigger, MatIcon, MatMenu, MatMenuItem],
})
export class ThemeToggleComponent {
  icon = 'hdr_auto';

  @Input() set mode(v: ThemeMode) {
    this.icon = v === 'auto' ? 'hdr_auto' : v === 'dark' ? 'dark_mode' : 'light_mode';
  }
  @Output() setMode = new EventEmitter<ThemeMode>();
}
