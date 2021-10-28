import { ChangeDetectionStrategy, Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { applyTransaction } from '@datorama/akita';
import { Observable, Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { GitlabConfigDialogComponent } from './gitlab-config-dialog/gitlab-config-dialog.component';
import { GitlabData, GitlabProject } from './search-params/state/search-param.model';
import { SearchParamsQuery } from './search-params/state/search-params.query';
import { SearchParamsService } from './search-params/state/search-params.service';
import { SearchResult } from './search-result/state/search-result.model';
import { SearchResultQuery } from './search-result/state/search-result.query';
import { SearchResultService } from './search-result/state/search-result.service';
import { GitlabConfig } from './state/gitlab-config.model';
import { GitlabConfigQuery } from './state/gitlab-config.query';
import { GitlabConfigService } from './state/gitlab-config.service';
import { ThemeMode } from './state/gitlab-config.store';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'gitlab-search-ui';

  gitlabConfigs$: Observable<GitlabConfig[]>;
  gitlabItems$: Observable<GitlabData[]>;
  gitladDataLoading$: Observable<{ [gitlabID: string]: boolean }>;
  searchResults$: Observable<SearchResult[]>;
  searchResultsLoading$: Observable<boolean>;
  projectSelected$: Observable<boolean>;
  themeMode$: Observable<ThemeMode>;
  withArchived$: Observable<boolean>;

  @HostBinding('class.dark-theme') darkStyleClass: boolean;
  private destroy$ = new Subject<void>();

  constructor(
    private configSrv: GitlabConfigService,
    private searchParamsSrv: SearchParamsService,
    private configQuery: GitlabConfigQuery,
    private searchParamsQuery: SearchParamsQuery,
    private searchResultsSrv: SearchResultService,
    private searchResultsQuery: SearchResultQuery,
    private dialog: MatDialog
  ) {
    this.gitlabItems$ = this.searchParamsQuery.selectAll();
    this.gitladDataLoading$ = this.searchParamsQuery.dataLoading();
    this.gitlabConfigs$ = this.configQuery.selectAll();
    this.searchResults$ = this.searchResultsQuery.selectAll();
    this.searchResultsLoading$ = this.searchResultsQuery.selectLoading();
    this.projectSelected$ = this.searchParamsQuery.projectSelected();
    this.themeMode$ = this.configQuery.selectThemeMode();
    this.withArchived$ = this.configQuery.selectWithArchivedFilter();
  }

  ngOnInit(): void {
    this.themeMode$.pipe(takeUntil(this.destroy$)).subscribe(mode => {
      this.darkStyleClass = mode === 'dark';
    });
    this.configQuery
      .selectAll()
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe(configs => {
        if (!Array.isArray(configs) || configs.length === 0) {
          this.openConfigSettings();
        }
      });
    this.configSrv.updateVersions();
  }

  search(query: string): void {
    this.searchResultsSrv.search(query);
  }

  updateGitlabData(gitlabID: string): void {
    this.searchParamsSrv.updateGitlabData(gitlabID);
  }

  updateSelectedProjects(projects: GitlabProject[]): void {
    this.searchParamsSrv.setSearchProjects(projects.map(p => ({ gitlab_id: p.gitlab_id, project_id: p.id })));
  }

  openConfigSettings(): void {
    this.dialog.open(GitlabConfigDialogComponent, {
      minWidth: 548,
      autoFocus: false,
      panelClass: this.darkStyleClass ? 'dark-theme' : '',
    });
  }

  toggleThemeMode(): void {
    this.configSrv.toggleThemeMode();
  }

  onWithArchivedChange(ev: boolean): void {
    applyTransaction(() => {
      this.configSrv.setFilter({ withArchivedProjects: ev });
      this.searchParamsSrv.resetDataCache();
      for (const gitlabID of this.searchParamsQuery.getSelectedGitLabs()) {
        this.searchParamsSrv.updateGitlabData(gitlabID);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
