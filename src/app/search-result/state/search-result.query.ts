import { Injectable, inject } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { Observable } from 'rxjs';
import { SearchProgress, SearchResultState, SearchResultStore } from './search-result.store';

@Injectable({ providedIn: 'root' })
export class SearchResultQuery extends QueryEntity<SearchResultState> {
  protected store: SearchResultStore;

  constructor() {
    const store = inject(SearchResultStore);
    super(store);
    this.store = store;
  }

  selectProgress(): Observable<SearchProgress | null> {
    return this.select(state => state.ui.progress);
  }
}
