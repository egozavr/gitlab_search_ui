import { Injectable, OnDestroy } from '@angular/core';
import { guid } from '@datorama/akita';
import { concat, forkJoin, merge, Observable, of, Subject } from 'rxjs';
import { catchError, finalize, map, mapTo, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { GitlabApiService } from 'src/app/gitlab-api.service';
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
    private paramQuery: SearchParamsQuery
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

    const searchRequests$ = byConfig.map(({ config, projectIDs }) =>
      concat(
        ...projectIDs.map(projecID => {
          const searchReqest$ = this.getSearchRequest(config, projecID, query);
          return this.configSrv.getGitlabRequest(config, searchReqest$).pipe(
            tap(results => {
              this.searchResultStore.upsertMany(
                [].concat(...results).map((result: SearchResultRaw) => ({ ...result, resultID: guid() })),
                { loading: true }
              );
            }),
            mapTo(null)
          );
        })
      )
    );
    this.searchResultStore.setLoading(true);
    forkJoin(searchRequests$)
      .pipe(
        finalize(() => {
          this.searchResultStore.setLoading(false);
        }),
        takeUntil(merge(this.destroy$, this.stopSearching$))
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
          `Error during search in project ${project.name_with_namespace}, url ${project.web_url}: ${err.message || err.error || err}`
        );
        return of([]);
      })
    );
  }
}
