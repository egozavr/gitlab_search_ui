import { Injectable, OnDestroy } from '@angular/core';
import { guid } from '@datorama/akita';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, finalize, map, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { GitlabApiService } from 'src/app/gitlab-api.service';
import { SearchParamsQuery } from 'src/app/search-params/state/search-params.query';
import { GitlabConfig } from 'src/app/state/gitlab-config.model';
import { GitlabConfigQuery } from 'src/app/state/gitlab-config.query';
import { RichSearchResult, SearchResult, SearchResultRaw } from './search-result.model';
import { SearchResultStore } from './search-result.store';

@Injectable({ providedIn: 'root' })
export class SearchResultService implements OnDestroy {
  private destroy$ = new Subject<void>();
  constructor(
    private searchResultStore: SearchResultStore,
    private gitlabApi: GitlabApiService,
    private configQuery: GitlabConfigQuery,
    private paramQuery: SearchParamsQuery
  ) {}

  search(query: string): void {
    const { searchProjects } = this.paramQuery.getValue();
    if (!query || !Array.isArray(searchProjects) || searchProjects.length === 0) {
      return;
    }
    const gitladIDs = new Set(searchProjects.map(sp => sp.gitlab_id));
    const configs: Map<string, GitlabConfig> = new Map(
      this.configQuery
        .getAll()
        .filter(config => gitladIDs.has(config.id))
        .map(config => [config.id, config])
    );
    const searchReqests$: Observable<SearchResultRaw[]>[] = searchProjects.map(p => {
      const config = configs.get(p.gitlab_id);
      return this.gitlabApi.searchProjectBlobs(config, p.project_id, query).pipe(
        withLatestFrom(this.paramQuery.selectEntity(p.gitlab_id)),
        map(([results, params]) => {
          const project = params.projects.find(proj => proj.id === p.project_id);
          results.forEach(result => {
            if (project) {
              (result as RichSearchResult).projectURL = project.web_url;
              (result as RichSearchResult).projectName = project.name_with_namespace;
            }
            (result as RichSearchResult).gitlabURL = config.gitlabURL;
            return result;
          });
          return results;
        }),
        catchError(err => {
          const project = this.paramQuery.getProjectByIDs(p.gitlab_id, p.project_id);
          console.warn(
            `Error during search in project ${project.name_with_namespace}, url ${project.web_url}: ${err.message || err.error || err}`
          );
          return of([]);
        })
      );
    });
    this.searchResultStore.setLoading(true);
    forkJoin(searchReqests$)
      .pipe(
        tap(results =>
          this.searchResultStore.set([].concat(...results).map((result: SearchResultRaw) => ({ ...result, resultID: guid() })))
        ),
        finalize(() => this.searchResultStore.setLoading(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  add(searchResult: SearchResultRaw): void {
    this.searchResultStore.add({ ...searchResult, resultID: guid() });
  }

  update(resultID: string, searchResult: Partial<SearchResult>): void {
    this.searchResultStore.update(resultID, searchResult);
  }

  remove(resultID: string): void {
    this.searchResultStore.remove(resultID);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
