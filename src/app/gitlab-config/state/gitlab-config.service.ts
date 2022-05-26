import { Injectable, OnDestroy } from '@angular/core';
import { applyTransaction, guid, selectPersistStateInit } from '@datorama/akita';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, takeUntil, withLatestFrom } from 'rxjs/operators';
import { GitlabApiService } from '../../gitlab-api.service';
import { RateLimitController, RateLimitWaitEvent } from '../rate-limit-controller.class';
import { GitlabConfig } from './gitlab-config.model';
import { GitlabConfigQuery } from './gitlab-config.query';
import { GitlabConfigStore, StoredFilter, ThemeMode } from './gitlab-config.store';

@Injectable({ providedIn: 'root' })
export class GitlabConfigService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private rateLimiControllers: Map<string, RateLimitController> = new Map();

  constructor(private store: GitlabConfigStore, private query: GitlabConfigQuery, private api: GitlabApiService) {
    selectPersistStateInit()
      .pipe(withLatestFrom(this.query.selectAll()), takeUntil(this.destroy$))
      .subscribe(([_, configs]) => {
        configs.forEach(config => {
          if (config.rateLimit && config.rateLimit > 0) {
            this.rateLimiControllers.set(config.id, new RateLimitController(config.rateLimit));
          }
        });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.rateLimiControllers.forEach(ctrl => {
      ctrl.destroy();
    });
  }

  add(gitlabConfig: Omit<GitlabConfig, 'id'>): void {
    this.api
      .getVersion(gitlabConfig)
      .pipe(takeUntil(this.destroy$))
      .subscribe(version => {
        const id = guid();
        this.store.add({ ...gitlabConfig, id, version });
        if (gitlabConfig.rateLimit && gitlabConfig.rateLimit > 0) {
          this.rateLimiControllers.set(id, new RateLimitController(gitlabConfig.rateLimit));
        }
      });
  }

  update(id: string, gitlabConfig: Partial<GitlabConfig>): void {
    this.store.update(id, gitlabConfig);
    if (this.rateLimiControllers.has(id)) {
      this.rateLimiControllers.get(id).destroy();
      this.rateLimiControllers.delete(id);
    }
    if (gitlabConfig.rateLimit && gitlabConfig.rateLimit > 0) {
      this.rateLimiControllers.set(id, new RateLimitController(gitlabConfig.rateLimit));
    }
  }

  remove(id: string): void {
    this.store.remove(id);
    if (this.rateLimiControllers.has(id)) {
      this.rateLimiControllers.get(id).destroy();
      this.rateLimiControllers.delete(id);
    }
  }

  toggleThemeMode(): void {
    const currentMode = this.store.getValue().ui.themeMode;
    const newMode: ThemeMode = currentMode === 'light' ? 'dark' : 'light';
    this.store.update(state => ({ ...state, ui: { ...state.ui, themeMode: newMode } }));
  }

  setFilter(filter: Partial<StoredFilter>): void {
    const currentFilter = this.store.getValue().filter;
    this.store.update(state => ({ ...state, filter: { ...currentFilter, ...filter } }));
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

  getGitlabRequest<T>(config: GitlabConfig, src$: Observable<T>): Observable<T | RateLimitWaitEvent> {
    if (this.rateLimiControllers.has(config.id)) {
      return this.rateLimiControllers.get(config.id).getLimited(src$);
    }
    return src$;
  }
}
