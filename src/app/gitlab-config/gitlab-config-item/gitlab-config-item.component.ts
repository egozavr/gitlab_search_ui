import { ChangeDetectionStrategy, Component, OnInit, booleanAttribute, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { GitlabConfig } from '../state/gitlab-config.model';
import { GitlabConfigService } from '../state/gitlab-config.service';

@Component({
  selector: 'app-gitlab-config-item',
  templateUrl: './gitlab-config-item.component.html',
  styleUrls: ['./gitlab-config-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconButton, MatIcon, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatSuffix],
})
export class GitlabConfigItemComponent implements OnInit {
  configForm: FormGroup;
  readonly initEdit = input(false, { transform: booleanAttribute });
  editMode = signal(this.initEdit());

  readonly gitlabConfig = input<GitlabConfig>(undefined);
  readonly cancelEdit = output<void>();

  private gitlabConfigService = inject(GitlabConfigService);

  ngOnInit(): void {
    this.configForm = new FormGroup({
      gitlabURL: new FormControl(),
      rateLimit: new FormControl(null, Validators.min(0)),
      token: new FormControl(),
    });
  }

  changeMode(toEdit: boolean): void {
    if (toEdit) {
      const gitlabConfig = this.gitlabConfig();
      if (gitlabConfig) {
        this.configForm.setValue({
          gitlabURL: gitlabConfig.gitlabURL,
          rateLimit: gitlabConfig.rateLimit || null,
          token: gitlabConfig.token,
        });
      }
      this.editMode.set(true);
    } else {
      this.configForm.reset();
      this.editMode.set(false);
      this.cancelEdit.emit(void null);
    }
  }

  save(): void {
    if (this.configForm.invalid) {
      return;
    }
    const toSave = { ...this.configForm.value };
    if (toSave.rateLimit === 0) {
      toSave.rateLimit = null;
    }
    const gitlabConfig = this.gitlabConfig();
    if (gitlabConfig && gitlabConfig.id) {
      this.gitlabConfigService.update(gitlabConfig.id, toSave);
    } else {
      this.gitlabConfigService.add(toSave);
    }
    this.changeMode(false);
  }

  delete(): void {
    const gitlabConfig = this.gitlabConfig();
    if (!gitlabConfig) {
      return;
    }
    this.gitlabConfigService.remove(gitlabConfig.id);
  }
}
