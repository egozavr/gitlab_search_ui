import { Injectable } from '@angular/core';
import { guid } from '@datorama/akita';
import { GitlabConfig } from './gitlab-config.model';
import { GitlabConfigStore, ThemeMode } from './gitlab-config.store';

@Injectable({ providedIn: 'root' })
export class GitlabConfigService {
  constructor(private gitlabConfigStore: GitlabConfigStore) {}

  add(gitlabConfig: Omit<GitlabConfig, 'id'>): void {
    this.gitlabConfigStore.add({ ...gitlabConfig, id: guid() });
  }

  update(id: string, gitlabConfig: Partial<GitlabConfig>): void {
    this.gitlabConfigStore.update(id, gitlabConfig);
  }

  remove(id: string): void {
    this.gitlabConfigStore.remove(id);
  }

  toggleThemeMode(): void {
    const currentMode = this.gitlabConfigStore.getValue().ui.themeMode;
    const newMode: ThemeMode = currentMode === 'light' ? 'dark' : 'light';
    this.gitlabConfigStore.update(state => ({ ...state, ui: { ...state.ui, themeMode: newMode } }));
  }
}
