import { CdkTreeModule } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ENVIRONMENT_INITIALIZER, inject, NgModule, NgZone } from '@angular/core';
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
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { akitaDevtools, persistState, PersistStateSelectFn } from '@datorama/akita';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { GitlabConfigDialogComponent } from './gitlab-config/gitlab-config-dialog/gitlab-config-dialog.component';
import { GitlabConfigItemComponent } from './gitlab-config/gitlab-config-item/gitlab-config-item.component';
import { GitlabProjectsState, GitlabProjectsUIState } from './gitlab-projects/state/gitlab-projects.store';
import { HttpErrorInterceptor } from './http-error.interceptor';
import { AKITA_PERSIST_STORAGE } from './persist-state.token';
import { QueryFormComponent } from './query-form/query-form.component';
import { SearchFormComponent } from './search-form/search-form.component';
import { SearchResultsComponent } from './search-results/search-results.component';
import { ThemeToggleComponent } from './theme-toggle/theme-toggle.component';

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

@NgModule({
  declarations: [
    AppComponent,
    SearchFormComponent,
    SearchResultsComponent,
    GitlabConfigDialogComponent,
    GitlabConfigItemComponent,
    ThemeToggleComponent,
    QueryFormComponent,
  ],
  bootstrap: [AppComponent],
  imports: [
    BrowserAnimationsModule,
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
  ],
  providers: [
    {
      provide: AKITA_PERSIST_STORAGE,
      useValue: storage,
    },
    { provide: HTTP_INTERCEPTORS, useClass: HttpErrorInterceptor, multi: true },
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useFactory() {
        return () => (environment.production ? null : akitaDevtools(inject(NgZone)));
      },
    },
    provideHttpClient(withInterceptorsFromDi()),
  ],
})
export class AppModule {
  constructor(iconRegistry: MatIconRegistry, sanitizer: DomSanitizer) {
    iconRegistry.setDefaultFontSetClass('material-symbols-outlined');
    iconRegistry.addSvgIconSetInNamespace('gitlab', sanitizer.bypassSecurityTrustResourceUrl('assets/icons/gitlab-icon-set.svg'));
  }
}
