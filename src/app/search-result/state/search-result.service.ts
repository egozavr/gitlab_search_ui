import { Injectable, OnDestroy } from '@angular/core';
import { applyTransaction, guid } from '@datorama/akita';
import { concat, forkJoin, merge, Observable, of, Subject } from 'rxjs';
import { catchError, finalize, map, mapTo, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { GitlabApiService } from 'src/app/gitlab-api.service';
import { RateLimitWaitEvent } from 'src/app/gitlab-config/rate-limit-controller.class';
import { GitlabConfig } from 'src/app/gitlab-config/state/gitlab-config.model';
import { GitlabConfigQuery } from 'src/app/gitlab-config/state/gitlab-config.query';
import { GitlabConfigService } from 'src/app/gitlab-config/state/gitlab-config.service';
import { SearchParamsQuery } from 'src/app/search-params/state/search-params.query';
import { RichSearchResult, SearchResult, SearchResultRaw } from './search-result.model';
import { SearchResultStore } from './search-result.store';

@Injectable({ providedIn: 'root' })
export class SearchResultService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private stopSearching$ = new Subject<void>();

  constructor(
    private searchResultStore: SearchResultStore,
    private gitlabApi: GitlabApiService,
    private configQuery: GitlabConfigQuery,
    private configSrv: GitlabConfigService,
    private paramQuery: SearchParamsQuery,
  ) {}

  search(query: string): void {
    const { searchProjects } = this.paramQuery.getValue();
    if (!query || !Array.isArray(searchProjects) || searchProjects.length === 0) {
      return;
    }

    const configIndexes = new Map<string, number>();
    const byConfig: { config: GitlabConfig; projectIDs: number[] }[] = [];
    searchProjects.forEach(sp => {
      if (configIndexes.has(sp.gitlab_id)) {
        byConfig[configIndexes.get(sp.gitlab_id)].projectIDs.push(sp.project_id);
      } else {
        byConfig.push({ config: this.configQuery.getEntity(sp.gitlab_id), projectIDs: [sp.project_id] });
        configIndexes.set(sp.gitlab_id, byConfig.length - 1);
      }
    });

    let projectSearched = 0;

    const searchRequests$ = byConfig.map(({ config, projectIDs }) =>
      concat(
        ...projectIDs.map(projecID => {
          const searchReqest$ = this.getSearchRequest(config, projecID, query);
          return this.configSrv.getGitlabRequest(config, searchReqest$).pipe(
            tap(resultsOrEvent => {
              if (!(resultsOrEvent instanceof RateLimitWaitEvent)) {
                applyTransaction(() => {
                  this.searchResultStore.setProrgress({ done: ++projectSearched, total: searchProjects.length });
                  this.searchResultStore.upsertMany(
                    [].concat(...resultsOrEvent).map((result: SearchResultRaw) => ({ ...result, resultID: guid() })),
                    { loading: true },
                  );
                });
              }
            }),
            mapTo(null),
          );
        }),
      ),
    );
    applyTransaction(() => {
      this.searchResultStore.setLoading(true);
      this.searchResultStore.set([]);
      this.searchResultStore.setProrgress({ done: 0, total: searchProjects.length });
    });
    forkJoin(searchRequests$)
      .pipe(
        finalize(() => {
          applyTransaction(() => {
            this.searchResultStore.setLoading(false);
            this.searchResultStore.setProrgress(null);
          });
        }),
        takeUntil(merge(this.destroy$, this.stopSearching$)),
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

  stopSearching(): void {
    this.stopSearching$.next();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getSearchRequest(config: GitlabConfig, projectID: number, query: string): Observable<SearchResultRaw[]> {
    return this.gitlabApi.searchProjectBlobs(config, projectID, query).pipe(
      withLatestFrom(this.paramQuery.selectEntity(config.id)),
      map(([results, params]) => {
        const project = params.projects.find(proj => proj.id === projectID);
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
        const project = this.paramQuery.getProjectByIDs(config.id, projectID);
        console.warn(
          `Error during search in project ${project.name_with_namespace}, url ${project.web_url}: ${err.message || err.error || err}`,
        );
        return of([]);
      }),
    );
  }
}
