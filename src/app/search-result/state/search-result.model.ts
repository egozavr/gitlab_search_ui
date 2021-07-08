export interface SearchResult extends RichSearchResult {
  resultID: string;
}

export interface RichSearchResult extends SearchResultRaw {
  gitlabID?: string;
  projectURL?: string;
  gitlabURL?: string;
  projectName?: string;
}

export interface SearchResultRaw {
  basename: string;
  data: string;
  path: string;
  filename: string;
  id: number | null;
  ref: string;
  startline: number;
  project_id: number;
}
