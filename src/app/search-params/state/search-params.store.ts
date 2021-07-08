import { Injectable } from '@angular/core';
import { EntityState, EntityStore, EntityUIStore, StoreConfig } from '@datorama/akita';
import { GitlabData, SearchProject } from './search-param.model';
export interface GitlabDataUI {
  isLoading: boolean;
}

export interface SearchParamUIState extends EntityState<GitlabDataUI> {}
export interface SearchParamsState extends EntityState<GitlabData> {
  searchProjects: SearchProject[];
}

@Injectable({ providedIn: 'root' })
@StoreConfig({
  name: 'search-params',
  cache: {
    ttl: 30 * 60 * 1000,
  },
})
export class SearchParamsStore extends EntityStore<SearchParamsState> {
  ui!: EntityUIStore<SearchParamUIState>;
  constructor() {
    super({
      searchProjects: [],
    });
    this.createUIStore().setInitialEntityState(() => ({
      isLoading: false,
    }));
  }
}
