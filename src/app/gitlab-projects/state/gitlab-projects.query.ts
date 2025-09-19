import { Injectable, inject } from '@angular/core';
import { EntityUIQuery, QueryEntity } from '@datorama/akita';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Project } from './gitlab-projects.model';
import { GitlabProjectsState, GitlabProjectsStore, GitlabProjectsUIState } from './gitlab-projects.store';

@Injectable({ providedIn: 'root' })
export class GitlabProjectsQuery extends QueryEntity<GitlabProjectsState> {
  protected store: GitlabProjectsStore;

  ui: EntityUIQuery<GitlabProjectsUIState>;

  constructor() {
    const store = inject(GitlabProjectsStore);
    super(store);
    this.store = store;

    this.createUIQuery();
  }

  projectSelected(): Observable<boolean> {
    return this.select(state => state.searchProjects).pipe(map(projects => projects.length > 0));
  }

  getSelectedGitLabs(): string[] {
    return Array.from(new Set(this.getValue().searchProjects.map(p => p.gitlab_id)));
  }

  getProjectByIDs(gitLabID: string, projectID: number): Project | null {
    return this.getEntity(gitLabID)?.projects?.find(p => p.id === projectID);
  }

  dataLoading(): Observable<Record<string, boolean>> {
    return this.ui.selectAll({ asObject: true }).pipe(
      map(uiState => {
        const res: Record<string, boolean> = {};
        for (const gitlabID in uiState) {
          if (Object.prototype.hasOwnProperty.call(uiState, gitlabID)) {
            res[gitlabID] = uiState[gitlabID]?.isLoading ?? false;
          }
        }
        return res;
      }),
    );
  }
}
