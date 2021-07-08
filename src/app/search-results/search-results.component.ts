import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { SearchResult } from '../search-result/state/search-result.model';

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchResultsComponent {
  @Input() results: SearchResult[];

  getURL(result: SearchResult): string {
    return `${result.projectURL}/blob/${result.ref}/${result.path}#L${result.startline}`;
  }
}
