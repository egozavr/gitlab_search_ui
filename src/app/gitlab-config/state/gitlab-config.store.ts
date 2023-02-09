import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { GitlabConfig } from './gitlab-config.model';

export type ThemeMode = 'light' | 'dark';

export interface StoredFilter {
  withArchivedProjects: boolean;
}

export interface GitlabConfigState extends EntityState<GitlabConfig, string> {
  ui: {
    themeMode: ThemeMode;
  };
  filter: StoredFilter;
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'gitlab-config' })
export class GitlabConfigStore extends EntityStore<GitlabConfigState> {
  constructor() {
    super({
      ui: {
        themeMode: 'light',
      },
      filter: {
        withArchivedProjects: false,
      },
    });
  }
}
