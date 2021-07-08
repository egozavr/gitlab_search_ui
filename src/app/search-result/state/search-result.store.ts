import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { SearchResult } from './search-result.model';

export interface SearchResultState extends EntityState<SearchResult> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'search-result', idKey: 'resultID' })
export class SearchResultStore extends EntityStore<SearchResultState> {
  constructor() {
    super({
      loading: false,
    });
  }
}
