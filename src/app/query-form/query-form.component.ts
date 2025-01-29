import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { SearchProgress } from '../search-result/state/search-result.store';

@Component({
  selector: 'app-query-form',
  templateUrl: './query-form.component.html',
  styleUrls: ['./query-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
