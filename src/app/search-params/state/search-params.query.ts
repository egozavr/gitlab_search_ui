import { Injectable } from '@angular/core';
import { EntityUIQuery, QueryEntity } from '@datorama/akita';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SearchParamsState, SearchParamsStore, SearchParamUIState } from './search-params.store';

@Injectable({ providedIn: 'root' })
export class SearchParamsQuery extends QueryEntity<SearchParamsState> {
  ui: EntityUIQuery<SearchParamUIState>;

  constructor(protected store: SearchParamsStore) {
    super(store);
    this.createUIQuery();
  }

  projectSelected(): Observable<boolean> {
    return this.select(state => state.searchProjects).pipe(map(projects => projects.length > 0));
  }

  dataLoading(): Observable<{ [gitlabID: string]: boolean }> {
    return this.ui.selectAll({ asObject: true }).pipe(
      map(uiState => {
        const res: { [gitlabID: string]: boolean } = {};
        for (const gitlabID in uiState) {
          if (uiState.hasOwnProperty(gitlabID)) {
            res[gitlabID] = uiState[gitlabID].isLoading;
          }
        }
        return res;
      })
    );
  }
}