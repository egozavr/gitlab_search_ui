import { Injectable, OnDestroy } from "@angular/core";
import { applyTransaction } from "@datorama/akita";
import { Observable, Subject, throwError } from "rxjs";
import { finalize, map, takeUntil, tap, withLatestFrom } from "rxjs/operators";
import { GitlabApiService } from "src/app/gitlab-api.service";
import { GitlabConfigQuery } from "src/app/state/gitlab-config.query";
import { diffSets } from "src/app/utils/array-diff";
import { GitlabData, SearchProject } from "./search-param.model";
import { SearchParamsQuery } from "./search-params.query";
import { SearchParamsStore } from "./search-params.store";

@Injectable({ providedIn: "root" })
export class SearchParamsService implements OnDestroy {
  private destroy$ = new Subject<void>();
  constructor(
    private searchParamsStore: SearchParamsStore,
    private searchParamsQuery: SearchParamsQuery,
    private configQuery: GitlabConfigQuery,
    private gitlabApi: GitlabApiService
  ) {
    this.configQuery
      .selectAll()
      .pipe(
        withLatestFrom(this.searchParamsQuery.selectAll()),
        takeUntil(this.destroy$)
      )
      .subscribe(([configs, gitlabDataItems]) => {
        const configIDs = new Set(configs.map((c) => c.id));
        const gitlabIDs = new Set(gitlabDataItems.map((item) => item.id));
        const diff = diffSets(gitlabIDs, configIDs);
        const newGitlabItems: GitlabData[] = configs
          .filter((c) => diff.added.has(c.id))
          .map((c) => ({
            id: c.id,
            groups: [],
            projects: [],
          }));
        applyTransaction(() => {
          this.searchParamsStore.add(newGitlabItems);
          this.searchParamsStore.remove(Array.from(diff.removed));
        });
      });
  }

  updateGitlabData(gitlabID: string): void {
    const data = this.searchParamsQuery.getEntity(gitlabID);
    if (
      !data ||
      !data?.projects?.length ||
      !this.searchParamsQuery.getHasCache()
    ) {
      this.searchParamsStore.ui.update(gitlabID, (state) => ({
        ...state,
        isLoading: true,
      }));
      this.getGitlabData(gitlabID)
        .pipe(
          tap((loadedData) => {
            applyTransaction(() => {
              this.searchParamsStore.update(gitlabID, loadedData);
              this.searchParamsStore.setHasCache(true, { restartTTL: true });
            });
          }),
          finalize(() => {
            this.searchParamsStore.ui.update(gitlabID, (state) => ({
              ...state,
              isLoading: false,
            }));
          }),
          takeUntil(this.destroy$)
        )
        .subscribe();
    }
  }

  setSearchProjects(projects: SearchProject[]): void {
    this.searchParamsStore.update((state) => ({
      ...state,
      searchProjects: projects,
    }));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getGitlabData(gitlabID: string): Observable<GitlabData> {
    const config = this.configQuery.getEntity(gitlabID);
    if (!config) {
      return throwError(`no such gitlab in config: ${gitlabID}`);
    }
    return this.gitlabApi.getAllProjects(config).pipe(
      map((projects) => ({
        id: gitlabID,
        projects,
      }))
    );
  }
}
