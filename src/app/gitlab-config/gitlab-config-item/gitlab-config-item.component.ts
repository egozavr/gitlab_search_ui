import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { GitlabConfig } from '../state/gitlab-config.model';
import { GitlabConfigService } from '../state/gitlab-config.service';

@Component({
  selector: 'app-gitlab-config-item',
  templateUrl: './gitlab-config-item.component.html',
  styleUrls: ['./gitlab-config-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GitlabConfigItemComponent implements OnInit {
  configForm: FormGroup;
  @Input() editMode = false;
  @Input() gitlabConfig: GitlabConfig;
  @Output() cancelEdit = new EventEmitter<void>();

  constructor(private gitlabConfigService: GitlabConfigService) {}

  ngOnInit(): void {
    this.configForm = new FormGroup({
      gitlabURL: new FormControl(),
      token: new FormControl(),
    });
  }

  changeMode(toEdit: boolean): void {
    if (toEdit) {
      if (this.gitlabConfig) {
        this.configForm.setValue({
          gitlabURL: this.gitlabConfig.gitlabURL,
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
