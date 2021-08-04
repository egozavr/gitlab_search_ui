import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { SearchResultStore, SearchResultState } from './search-result.store';

@Injectable({ providedIn: 'root' })
export class SearchResultQuery extends QueryEntity<SearchResultState> {
  constructor(protected store: SearchResultStore) {
    super(store);
  }
}
