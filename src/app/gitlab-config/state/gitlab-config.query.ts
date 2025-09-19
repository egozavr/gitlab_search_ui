import { Injectable, inject } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { Observable } from 'rxjs';
import { GitlabConfigState, GitlabConfigStore, ThemeMode } from './gitlab-config.store';

@Injectable({ providedIn: 'root' })
export class GitlabConfigQuery extends QueryEntity<GitlabConfigState> {
  protected store: GitlabConfigStore;

  constructor() {
    const store = inject(GitlabConfigStore);
    super(store);
    this.store = store;
  }

  selectThemeMode(): Observable<ThemeMode> {
    return this.select(state => state.ui.themeMode);
  }

  selectWithArchivedFilter(): Observable<boolean> {
    return this.select(state => state.filter.withArchivedProjects);
  }
}
