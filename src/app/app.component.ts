import { MediaMatcher } from '@angular/cdk/layout';
import { AsyncPipe, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { applyTransaction } from '@datorama/akita';
import { HighlightLoader } from 'ngx-highlightjs';
import { combineLatest, fromEvent, Observable, Subject } from 'rxjs';
import { map, startWith, take, takeUntil } from 'rxjs/operators';
import { GitlabConfigDialogComponent } from './gitlab-config/gitlab-config-dialog/gitlab-config-dialog.component';
import { GitlabConfig } from './gitlab-config/state/gitlab-config.model';
import { GitlabConfigQuery } from './gitlab-config/state/gitlab-config.query';
import { GitlabConfigService } from './gitlab-config/state/gitlab-config.service';
import { ThemeMode } from './gitlab-config/state/gitlab-config.store';
import { GitlabData, GitlabProject } from './gitlab-projects/state/gitlab-projects.model';
import { GitlabProjectsQuery } from './gitlab-projects/state/gitlab-projects.query';
import { GitlabProjectsService } from './gitlab-projects/state/gitlab-projects.service';
import { QueryFormComponent } from './query-form/query-form.component';
import { SearchFormComponent } from './search-form/search-form.component';
import { SearchResultComponent } from './search-result/search-result.component';
import { SearchResult } from './search-result/state/search-result.model';
import { SearchResultQuery } from './search-result/state/search-result.query';
import { SearchResultService } from './search-result/state/search-result.service';
import { SearchProgress } from './search-result/state/search-result.store';
import { ThemeToggleComponent } from './theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatSidenavContainer,
    MatSidenav,
    MatIconButton,
    MatIcon,
    ThemeToggleComponent,
    SearchFormComponent,
    MatSidenavContent,
    MatCard,
    QueryFormComponent,
    AsyncPipe,
    SearchResultComponent,
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'gitlab-search-ui';

  gitlabConfigs$: Observable<GitlabConfig[]>;
  gitlabItems$: Observable<GitlabData[]>;
  gitladDataLoading$: Observable<Record<string, boolean>>;
  searchResults$: Observable<SearchResult[]>;
  searchProgress$: Observable<SearchProgress | null>;
  projectSelected$: Observable<boolean>;
  themeMode$: Observable<ThemeMode>;
  withArchived$: Observable<boolean>;
  searchQuery$: Observable<string>;

  private destroy$ = new Subject<void>();
  private readonly darkHighlightTheme = '/assets/themes/stackoverflow-dark.min.css';
  private readonly lightHighlightTheme = '/assets/themes/stackoverflow-light.min.css';

  constructor(
    private configSrv: GitlabConfigService,
    private gitlabProjectsSrv: GitlabProjectsService,
    private configQuery: GitlabConfigQuery,
    private gitlabProjectsQuery: GitlabProjectsQuery,
    private searchResultsSrv: SearchResultService,
    private searchResultsQuery: SearchResultQuery,
    private dialog: MatDialog,
    private hljsLoader: HighlightLoader,
    private mediaMatcher: MediaMatcher,
    @Inject(DOCUMENT) private doc: Document,
  ) {
    this.gitlabItems$ = this.gitlabProjectsQuery.selectAll();
    this.gitladDataLoading$ = this.gitlabProjectsQuery.dataLoading();
    this.gitlabConfigs$ = this.configQuery.selectAll();
    this.searchResults$ = this.searchResultsQuery.selectAll();
    this.searchProgress$ = this.searchResultsQuery.selectProgress();
    this.searchQuery$ = this.searchResultsQuery.select(state => state.query);
    this.projectSelected$ = this.gitlabProjectsQuery.projectSelected();
    this.themeMode$ = this.configQuery.selectThemeMode();
    this.withArchived$ = this.configQuery.selectWithArchivedFilter();
  }

  ngOnInit(): void {
    const mql = this.mediaMatcher.matchMedia('(prefers-color-scheme: dark)');
    const systemPreffersDark$ = fromEvent(mql, 'change').pipe(
      map((ev: MediaQueryListEvent) => ev.matches),
      startWith(mql.matches),
    );
    combineLatest({ mode: this.themeMode$, prefferDark: systemPreffersDark$ })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ mode, prefferDark }) => {
        switch (mode) {
          case 'dark':
            this.doc.body.classList.add('dark-theme');
            this.doc.body.classList.remove('light-theme');
            this.hljsLoader.setTheme(this.darkHighlightTheme);
            break;
          case 'light':
            this.doc.body.classList.remove('dark-theme');
            this.doc.body.classList.add('light-theme');
            this.hljsLoader.setTheme(this.lightHighlightTheme);
            break;
          default:
            this.doc.body.classList.remove('dark-theme');
            this.doc.body.classList.remove('light-theme');
            this.hljsLoader.setTheme(prefferDark ? this.darkHighlightTheme : this.lightHighlightTheme);
            break;
        }
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
    this.gitlabProjectsSrv.updateGitlabData(gitlabID);
  }

  reloadGitlabData(gitlabID: string): void {
    this.gitlabProjectsSrv.updateGitlabData(gitlabID, true);
  }

  updateSelectedProjects(projects: GitlabProject[]): void {
    this.gitlabProjectsSrv.setSearchProjects(projects.map(p => ({ gitlab_id: p.gitlab_id, project_id: p.id })));
  }

  openConfigSettings(): void {
    this.dialog.open(GitlabConfigDialogComponent, { minWidth: 548, maxWidth: '80vw', autoFocus: false });
  }

  setThemeMode(mode: ThemeMode): void {
    this.configSrv.setThemeMode(mode);
  }

  onWithArchivedChange(ev: boolean): void {
    applyTransaction(() => {
      this.configSrv.setFilter({ withArchivedProjects: ev });
      this.gitlabProjectsSrv.resetDataCache();
      for (const gitlabID of this.gitlabProjectsQuery.getSelectedGitLabs()) {
        this.gitlabProjectsSrv.updateGitlabData(gitlabID);
      }
    });
  }

  onStopSearchEvent(): void {
    this.searchResultsSrv.stopSearching();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
