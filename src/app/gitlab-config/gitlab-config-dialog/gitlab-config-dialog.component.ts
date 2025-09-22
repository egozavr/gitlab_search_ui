import { CdkScrollable } from '@angular/cdk/scrolling';
import { AsyncPipe } from '@angular/common';
import { Component, inject, OnDestroy, viewChild, ViewContainerRef } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { GitlabConfigItemComponent } from '../gitlab-config-item/gitlab-config-item.component';
import { GitlabConfigQuery } from '../state/gitlab-config.query';

@Component({
  selector: 'app-gitlab-config-dialog',
  templateUrl: './gitlab-config-dialog.component.html',
  styleUrls: ['./gitlab-config-dialog.component.scss'],
  imports: [MatDialogTitle, CdkScrollable, MatDialogContent, MatButton, MatIcon, GitlabConfigItemComponent, AsyncPipe],
})
export class GitlabConfigDialogComponent implements OnDestroy {
  configs$ = inject(GitlabConfigQuery).selectAll();

  private addFormViewport = viewChild.required('addFormViewport', { read: ViewContainerRef });

  addForm(): void {
    const viewport = this.addFormViewport();
    const cRef = viewport.createComponent(GitlabConfigItemComponent);
    cRef.setInput('initEdit', true);
    cRef.instance.cancelEdit.subscribe(() => {
      viewport.remove(viewport.indexOf(cRef.hostView));
    });
  }

  ngOnDestroy(): void {
    this.addFormViewport().clear();
  }
}
