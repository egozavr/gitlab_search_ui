import { Injectable, OnDestroy } from '@angular/core';
import { applyTransaction, guid } from '@datorama/akita';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { GitlabApiService } from '../gitlab-api.service';
import { GitlabConfig } from './gitlab-config.model';
import { GitlabConfigQuery } from './gitlab-config.query';
import { GitlabConfigStore, ThemeMode } from './gitlab-config.store';

@Injectable({ providedIn: 'root' })
export class GitlabConfigService implements OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(private store: GitlabConfigStore, private query: GitlabConfigQuery, private api: GitlabApiService) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  add(gitlabConfig: Omit<GitlabConfig, 'id'>): void {
    this.api
      .getVersion(gitlabConfig)
      .pipe(takeUntil(this.destroy$))
      .subscribe(version => {
        this.store.add({ ...gitlabConfig, id: guid(), version });
      });
  }

  update(id: string, gitlabConfig: Partial<GitlabConfig>): void {
    this.store.update(id, gitlabConfig);
  }

  remove(id: string): void {
    this.store.remove(id);
  }

  toggleThemeMode(): void {
    const currentMode = this.store.getValue().ui.themeMode;
    const newMode: ThemeMode = currentMode === 'light' ? 'dark' : 'light';
    this.store.update(state => ({ ...state, ui: { ...state.ui, themeMode: newMode } }));
  }

  updateVersions(): void {
    const configs = this.query.getAll();
    forkJoin(
      configs.map(config =>
        this.api.getVersion(config).pipe(
          catchError(err => {
            console.warn(`Error loading gitlab ${config.gitlabURL} version`, err);
            return of<null>(null);
          })
        )
      )
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe(versions => {
        applyTransaction(() => {
          configs.forEach((config, i) => {
            if (versions[i] !== null) {
              this.store.update(config.id, { ...config, version: versions[i] });
            }
          });
        });
      });
  }
}
