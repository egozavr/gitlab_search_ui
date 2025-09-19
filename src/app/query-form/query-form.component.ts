import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
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
  imports: [ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatButton, MatIcon, MatProgressBar],
})
export class QueryFormComponent {
  readonly projectSelected = input<boolean>(undefined);
  readonly searchProgress = input<SearchProgress | null>(null);
  readonly query = output<string>();
  readonly stopSearch = output<void>();

  queryForm = new FormGroup({
    query: new FormControl(null, [Validators.required, Validators.minLength(3)]),
  });

  constructor() {
    effect(() => {
      if (this.searchProgress() !== null) {
        this.queryForm.disable();
        return;
      }
      this.queryForm.enable();
    });
  }

  submit(): void {
    this.query.emit(this.queryForm.value.query);
  }
}
