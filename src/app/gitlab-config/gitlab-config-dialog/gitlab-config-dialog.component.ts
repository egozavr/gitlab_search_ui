import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { GitlabConfig } from '../state/gitlab-config.model';
import { GitlabConfigQuery } from '../state/gitlab-config.query';

@Component({
  selector: 'app-gitlab-config-dialog',
  templateUrl: './gitlab-config-dialog.component.html',
  styleUrls: ['./gitlab-config-dialog.component.scss'],
})
export class GitlabConfigDialogComponent {
  configs$: Observable<GitlabConfig[]>;
  openedAddForms: true[] = [];

  constructor(gitlabConfigQuery: GitlabConfigQuery) {
    this.configs$ = gitlabConfigQuery.selectAll();
  }

  addForm(): void {
    this.openedAddForms.push(true);
  }

  removeForm(i: number): void {
    this.openedAddForms.splice(i, 1);
  }
}
