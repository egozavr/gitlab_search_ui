import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { SearchResult } from './search-result.model';

export interface SearchProgress {
  done: number;
  total: number;
}

export interface SearchResultState extends EntityState<SearchResult> {
  query: string;
  ui: {
    progress: SearchProgress | null;
  };
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'search-result', idKey: 'resultID' })
export class SearchResultStore extends EntityStore<SearchResultState> {
  constructor() {
    super({
      loading: false,
      ui: {
        progress: null,
      },
    });
  }

  setProrgress(progress: SearchProgress | null): void {
    this.update({ ui: { progress } });
  }
}
