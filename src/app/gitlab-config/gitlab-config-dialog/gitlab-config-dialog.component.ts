import { CdkScrollable } from '@angular/cdk/scrolling';
import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { GitlabConfigItemComponent } from '../gitlab-config-item/gitlab-config-item.component';
import { GitlabConfig } from '../state/gitlab-config.model';
import { GitlabConfigQuery } from '../state/gitlab-config.query';

@Component({
  selector: 'app-gitlab-config-dialog',
  templateUrl: './gitlab-config-dialog.component.html',
  styleUrls: ['./gitlab-config-dialog.component.scss'],
  imports: [MatDialogTitle, CdkScrollable, MatDialogContent, MatButton, MatIcon, GitlabConfigItemComponent, AsyncPipe],
})
export class GitlabConfigDialogComponent {
  configs$: Observable<GitlabConfig[]>;
  openedAddForms: true[] = [];

  constructor() {
    const gitlabConfigQuery = inject(GitlabConfigQuery);
    this.configs$ = gitlabConfigQuery.selectAll();
  }

  addForm(): void {
    this.openedAddForms.push(true);
  }

  removeForm(i: number): void {
    this.openedAddForms.splice(i, 1);
  }
}
