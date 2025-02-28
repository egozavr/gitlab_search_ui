import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { Observable } from 'rxjs';
import { GitlabConfigState, GitlabConfigStore, ThemeMode } from './gitlab-config.store';

@Injectable({ providedIn: 'root' })
export class GitlabConfigQuery extends QueryEntity<GitlabConfigState> {
  constructor(protected store: GitlabConfigStore) {
    super(store);
  }

  selectThemeMode(): Observable<ThemeMode> {
    return this.select(state => state.ui.themeMode);
  }

  selectWithArchivedFilter(): Observable<boolean> {
    return this.select(state => state.filter.withArchivedProjects);
  }
}
