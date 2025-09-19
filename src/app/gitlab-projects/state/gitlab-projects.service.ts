import { Injectable, OnDestroy, inject } from '@angular/core';
import { applyTransaction } from '@datorama/akita';
import { Observable, Subject, throwError } from 'rxjs';
import { finalize, map, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { GitlabApiService, ProjectRequestOptions } from 'src/app/gitlab-api.service';
import { GitlabConfigQuery } from 'src/app/gitlab-config/state/gitlab-config.query';
import { diffSets } from 'src/app/utils/array-diff';
import { GitlabData, SearchProject } from './gitlab-projects.model';
import { GitlabProjectsQuery } from './gitlab-projects.query';
import { GitlabProjectsStore } from './gitlab-projects.store';

@Injectable({ providedIn: 'root' })
export class GitlabProjectsService implements OnDestroy {
  private gitlabProjectsStore = inject(GitlabProjectsStore);
  private gitlabProjectsQuery = inject(GitlabProjectsQuery);
  private configQuery = inject(GitlabConfigQuery);
  private gitlabApi = inject(GitlabApiService);
  private destroy$ = new Subject<void>();

  constructor() {
    this.configQuery
      .selectAll()
      .pipe(withLatestFrom(this.gitlabProjectsQuery.selectAll()), takeUntil(this.destroy$))
      .subscribe(([configs, gitlabDataItems]) => {
        const configIDs = new Set(configs.map(c => c.id));
        const gitlabIDs = new Set(gitlabDataItems.map(item => item.id));
        const diff = diffSets(gitlabIDs, configIDs);
        const newGitlabItems: GitlabData[] = configs
          .filter(c => diff.added.has(c.id))
          .map(c => ({
            id: c.id,
            loadDt: null,
            projects: [],
          }));
        applyTransaction(() => {
          this.gitlabProjectsStore.add(newGitlabItems);
          this.gitlabProjectsStore.remove(Array.from(diff.removed));
        });
      });
  }

  updateGitlabData(gitlabID: string, force?: boolean): void {
    const data = this.gitlabProjectsQuery.getEntity(gitlabID);
    if (force === true || !data || !data?.projects?.length || !this.gitlabProjectsQuery.getHasCache()) {
      applyTransaction(() => {
        this.gitlabProjectsStore.update(gitlabID, { id: gitlabID, loadDt: null, projects: [] });
        this.gitlabProjectsStore.ui.update(gitlabID, state => ({
          ...state,
          isLoading: true,
        }));
      });
      const withArchivedProjects = this.configQuery.getValue().filter.withArchivedProjects;
      this.getGitlabData(gitlabID, withArchivedProjects)
        .pipe(
          tap(loadedData => {
            applyTransaction(() => {
              this.gitlabProjectsStore.update(gitlabID, loadedData);
              this.gitlabProjectsStore.setHasCache(true, { restartTTL: true });
            });
          }),
          finalize(() => {
            this.gitlabProjectsStore.ui.update(gitlabID, state => ({
              ...state,
              isLoading: false,
            }));
          }),
          takeUntil(this.destroy$),
        )
        .subscribe();
    }
  }

  resetDataCache(): void {
    this.gitlabProjectsStore.setHasCache(false);
  }

  setSearchProjects(projects: SearchProject[]): void {
    this.gitlabProjectsStore.update(state => ({
      ...state,
      searchProjects: projects,
    }));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getGitlabData(gitlabID: string, withArchivedProjects: boolean): Observable<GitlabData> {
    const config = this.configQuery.getEntity(gitlabID);
    if (!config) {
      return throwError(() => `no such gitlab in config: ${gitlabID}`);
    }
    const opts: ProjectRequestOptions = {};
    if (withArchivedProjects === false) {
      opts.archived = false;
    }
    return this.gitlabApi.getAllProjects(config, opts).pipe(
      map(projects => ({
        id: gitlabID,
        loadDt: new Date().toISOString(),
        projects,
      })),
    );
  }
}
