import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
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
  @Input() editMode = false;
  @Input() gitlabConfig: GitlabConfig;
  @Output() cancelEdit = new EventEmitter<void>();

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
      if (this.gitlabConfig) {
        this.configForm.setValue({
          gitlabURL: this.gitlabConfig.gitlabURL,
          rateLimit: this.gitlabConfig.rateLimit || null,
          token: this.gitlabConfig.token,
        });
      }
      this.editMode = true;
    } else {
      this.configForm.reset();
      this.editMode = false;
      this.cancelEdit.emit();
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
    if (this.gitlabConfig && this.gitlabConfig.id) {
      this.gitlabConfigService.update(this.gitlabConfig.id, toSave);
    } else {
      this.gitlabConfigService.add(toSave);
    }
    this.changeMode(false);
  }

  delete(): void {
    if (!this.gitlabConfig) {
      return;
    }
    this.gitlabConfigService.remove(this.gitlabConfig.id);
  }
}
