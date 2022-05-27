import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { Observable } from 'rxjs';
import { SearchResultStore, SearchResultState, SearchProgress } from './search-result.store';

@Injectable({ providedIn: 'root' })
export class SearchResultQuery extends QueryEntity<SearchResultState> {
  constructor(protected store: SearchResultStore) {
    super(store);
  }

  selectProgress(): Observable<SearchProgress | null> {
    return this.select(state => state.ui.progress);
  }
}
