import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { ThemeMode } from '../gitlab-config/state/gitlab-config.store';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconButton, MatMenuTrigger, MatIcon, MatMenu, MatMenuItem],
})
export class ThemeToggleComponent {
  readonly mode = input.required<ThemeMode>();
  readonly setMode = output<ThemeMode>();

  icon = computed(() => {
    const mode = this.mode();
    return mode === 'auto' ? 'hdr_auto' : mode === 'dark' ? 'dark_mode' : 'light_mode';
  });
}
