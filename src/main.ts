import { CdkTreeModule } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { enableProdMode, importProvidersFrom, inject, NgZone, provideEnvironmentInitializer } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTreeModule } from '@angular/material/tree';
import { bootstrapApplication, BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { akitaDevtools, persistState, PersistStateSelectFn } from '@datorama/akita';
import { AppComponent } from './app/app.component';
import { GitlabProjectsState, GitlabProjectsUIState } from './app/gitlab-projects/state/gitlab-projects.store';
import { httpErrorInterceptor } from './app/http-error.interceptor';
import { AKITA_PERSIST_STORAGE } from './app/persist-state.token';
import { environment } from './environments/environment';

const gitlabProjectsPersistFn: PersistStateSelectFn<GitlabProjectsState> = (state: GitlabProjectsState) => ({
  entities: state.entities,
  ids: state.ids,
});
gitlabProjectsPersistFn.storeName = 'gitlab-projects';

const storage = persistState({
  include: ['gitlab-config', 'gitlab-projects', 'UI/gitlab-projects'],
  select: [gitlabProjectsPersistFn],
  preStoreUpdate(storeName, state) {
    if (storeName === 'UI/gitlab-projects') {
      const entities = (state as GitlabProjectsUIState)?.entities;
      if (entities) {
        for (const id in entities) {
          const uiState = entities[id];
          if (typeof uiState === 'object' && uiState !== null) entities[id].isLoading = false;
        }
      }
    }
    return state;
  },
});

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      CdkTreeModule,
      CommonModule,
      MatBadgeModule,
      MatButtonModule,
      MatCardModule,
      MatSidenavModule,
      MatCheckboxModule,
      MatDialogModule,
      MatDividerModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatMenuModule,
      MatProgressBarModule,
      MatProgressSpinnerModule,
      MatSlideToggleModule,
      MatSnackBarModule,
      MatToolbarModule,
      MatTreeModule,
      ReactiveFormsModule,
    ),
    {
      provide: AKITA_PERSIST_STORAGE,
      useValue: storage,
    },
    provideEnvironmentInitializer(() => {
      const initializerFn = (() => {
        return () => (environment.production ? null : akitaDevtools(inject(NgZone)));
      })();
      return initializerFn();
    }),
    provideEnvironmentInitializer((): void => {
      const sanitizer = inject(DomSanitizer);
      const iconRegistry = inject(MatIconRegistry);
      iconRegistry.setDefaultFontSetClass('material-symbols-outlined');
      iconRegistry.addSvgIconSetInNamespace('gitlab', sanitizer.bypassSecurityTrustResourceUrl('assets/icons/gitlab-icon-set.svg'));
    }),
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
    provideAnimations(),
  ],
}).catch(err => console.error(err));
