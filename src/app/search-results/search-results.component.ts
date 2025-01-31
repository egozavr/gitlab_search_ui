import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatCard } from '@angular/material/card';
import { SearchResult } from '../search-result/state/search-result.model';

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatCard],
})
export class SearchResultsComponent {
  @Input({ required: true }) results: SearchResult[];
  @Input({ required: true }) query: string;

  getURL(result: SearchResult): string {
    const lines = result.data.split('\n');
    const lineIndex = lines.findIndex(line => line.toLowerCase().includes(this.query.toLowerCase()));
    const lineNumber = result.startline + (lineIndex !== -1 ? lineIndex : 0);
    return `${result.projectURL}/blob/${result.ref}/${result.path}#L${lineNumber}`;
  }
}
