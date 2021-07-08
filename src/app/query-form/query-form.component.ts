import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

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

  private loading = false;
  @Input()
  get resultLoading(): boolean {
    return this.loading;
  }
  set resultLoading(loadging: boolean) {
    this.loading = loadging;
    if (loadging) {
      this.queryForm.disable();
    } else {
      this.queryForm.enable();
    }
  }

  @Output() query = new EventEmitter<string>();

  submit(): void {
    this.query.emit(this.queryForm.value.query);
  }
}
