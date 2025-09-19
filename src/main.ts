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
import { akitaDevtools, persistState, PersistStateSelectFn } from '@datorama/akita';
import { provideHighlightOptions } from 'ngx-highlightjs';
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
    { provide: AKITA_PERSIST_STORAGE, useValue: storage },
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
    provideHighlightOptions({
      coreLibraryLoader: () => import('highlight.js/lib/core'),
      lineNumbersLoader: () => import('ngx-highlightjs/line-numbers'),
      languages: {
        bash: () => import('highlight.js/lib/languages/bash'),
        c: () => import('highlight.js/lib/languages/c'),
        cpp: () => import('highlight.js/lib/languages/cpp'),
        css: () => import('highlight.js/lib/languages/css'),
        dart: () => import('highlight.js/lib/languages/dart'),
        dockerfile: () => import('highlight.js/lib/languages/dockerfile'),
        go: () => import('highlight.js/lib/languages/go'),
        java: () => import('highlight.js/lib/languages/java'),
        javascript: () => import('highlight.js/lib/languages/javascript'),
        json: () => import('highlight.js/lib/languages/json'),
        kotlin: () => import('highlight.js/lib/languages/kotlin'),
        lua: () => import('highlight.js/lib/languages/lua'),
        markdown: () => import('highlight.js/lib/languages/markdown'),
        php: () => import('highlight.js/lib/languages/php'),
        protobuf: () => import('highlight.js/lib/languages/protobuf'),
        python: () => import('highlight.js/lib/languages/python'),
        ruby: () => import('highlight.js/lib/languages/ruby'),
        rust: () => import('highlight.js/lib/languages/rust'),
        scss: () => import('highlight.js/lib/languages/scss'),
        sql: () => import('highlight.js/lib/languages/sql'),
        swift: () => import('highlight.js/lib/languages/swift'),
        plaintext: () => import('highlight.js/lib/languages/plaintext'),
        typescript: () => import('highlight.js/lib/languages/typescript'),
        xml: () => import('highlight.js/lib/languages/xml'),
        yaml: () => import('highlight.js/lib/languages/yaml'),
      },
    }),
  ],
}).catch(err => console.error(err));
