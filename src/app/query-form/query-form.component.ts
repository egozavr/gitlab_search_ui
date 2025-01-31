import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressBar } from '@angular/material/progress-bar';
import { SearchProgress } from '../search-result/state/search-result.store';

@Component({
  selector: 'app-query-form',
  templateUrl: './query-form.component.html',
  styleUrls: ['./query-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatButton, MatIcon, MatProgressBar],
})
export class QueryFormComponent {
  @Input() projectSelected: boolean;

  queryForm = new FormGroup({
    query: new FormControl(null, [Validators.required, Validators.minLength(3)]),
  });

  private progress: SearchProgress | null = null;
  @Input()
  get searchProgress(): SearchProgress | null {
    return this.progress;
  }
  set searchProgress(progress: SearchProgress | null) {
    this.progress = progress;
    if (progress !== null) {
      this.queryForm.disable();
    } else {
      this.queryForm.enable();
    }
  }

  @Output() query = new EventEmitter<string>();
  @Output() stopSearch = new EventEmitter<void>();

  submit(): void {
    this.query.emit(this.queryForm.value.query);
  }
}
