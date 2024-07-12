import { Injectable } from '@angular/core';
import { EntityState, EntityStore, EntityUIStore, StoreConfig } from '@datorama/akita';
import { GitlabData, GitlabDataUI, SearchProject } from './gitlab-projects.model';

export interface GitlabProjectsState extends EntityState<GitlabData> {
  searchProjects: SearchProject[];
}

export interface GitlabProjectsUIState extends EntityState<GitlabDataUI> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({
  name: 'gitlab-projects',
  cache: {
    ttl: 30 * 60 * 1000,
  },
})
export class GitlabProjectsStore extends EntityStore<GitlabProjectsState> {
  ui!: EntityUIStore<GitlabProjectsUIState>;
  constructor() {
    super({
      searchProjects: [],
    });
    this.createUIStore().setInitialEntityState(() => ({
      isLoading: false,
    }));
  }
}
