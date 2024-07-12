/**
 * Original class: https://github.com/angular/material2/blob/master/src/cdk/collections/selection.ts
 * SelectionModelTrackBy implements interface of cdk SelectionModel but allows to set trackBy for selections.
 * Key difference between stogage data structures:
 * cdk SelectionModel _selection is Set<T>, SelectionModelTrackBy _selection is Map<K, T>.
 */
export class SelectionModelTrackBy<T, K = T> {
  private _selection = new Map<K, T>();
  private _selected: T[] | null;
  get selected(): T[] {
    if (!this._selected) {
      this._selected = Array.from(this._selection.values());
    }
    return this._selected;
  }

  constructor(
    private _trackBy: (v: T) => K,
    private _multiple = false,
    initiallySelectedValues: T[] = [],
  ) {
    if (initiallySelectedValues && initiallySelectedValues.length) {
      if (_multiple) {
        initiallySelectedValues.forEach(value => this._markSelected(value));
      } else {
        this._markSelected(initiallySelectedValues[0]);
      }
    }
  }

  select(...values: T[]): void {
    this._verifyValueAssignment(values);
    values.forEach(value => this._markSelected(value));
    this._selected = null;
  }

  deselect(...values: T[]): void {
    this._verifyValueAssignment(values);
    values.forEach(value => this._unmarkSelected(value));
    this._selected = null;
  }

  toggle(value: T): void {
    this.isSelected(value) ? this.deselect(value) : this.select(value);
  }

  clear(): void {
    this._unmarkAll();
    this._selected = null;
  }

  isEmpty(): boolean {
    return this._selection.size === 0;
  }

  isSelected(value: T): boolean {
    return this._selection.has(this._trackBy(value));
  }

  hasValue(): boolean {
    return !this.isEmpty();
  }

  sort(predicate?: (a: T, b: T) => number): void {
    if (this._multiple && this.selected) {
      // tslint:disable-next-line: no-non-null-assertion
      this._selected!.sort(predicate);
    }
  }

  isMultipleSelection(): boolean {
    return this._multiple;
  }

  private _markSelected(value: T): void {
    if (!this.isSelected(value)) {
      if (!this._multiple) {
        this._unmarkAll();
      }
      this._selection.set(this._trackBy(value), value);
    }
  }

  private _unmarkSelected(value: T): void {
    if (this.isSelected(value)) {
      this._selection.delete(this._trackBy(value));
    }
  }

  private _verifyValueAssignment(values: T[]): void {
    if (values.length > 1 && !this._multiple) {
      throw getMultipleValuesInSingleSelectionError();
    }
  }

  private _unmarkAll(): void {
    if (!this.isEmpty()) {
      this._selection.forEach(value => this._unmarkSelected(value));
    }
  }
}

function getMultipleValuesInSingleSelectionError(): Error {
  return new Error('Cannot pass multiple values into SelectionModelTrackBy with single-value mode.');
}
