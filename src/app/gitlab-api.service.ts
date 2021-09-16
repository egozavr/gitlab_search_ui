import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { Project } from './search-params/state/search-param.model';
import { RichSearchResult, SearchResultRaw } from './search-result/state/search-result.model';
import { GitlabConfig, GitlabVersion } from './state/gitlab-config.model';

export interface WithNext<T> {
  nextURL?: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class GitlabApiService {
  constructor(private http: HttpClient) {}

  getVersion(config: Omit<GitlabConfig, 'id'>): Observable<GitlabVersion> {
    return this.http.get<GitlabVersion>(`${this.getApiV4URL(config)}/version`, {
      headers: this.getAuthHeader(config),
    });
  }

  getProjects(config: GitlabConfig, membership = true): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.getApiV4URL(config)}/projects`, {
      params: { simple: 'true', membership: `${membership}` },
      headers: this.getAuthHeader(config),
    });
  }

  searchProjectBlobs(config: GitlabConfig, projectID: number, query: string): Observable<RichSearchResult[]> {
    return this.http
      .get<SearchResultRaw[]>(`${this.getApiV4URL(config)}/projects/${projectID}/search`, {
        params: { scope: 'blobs', search: query },
        headers: this.getAuthHeader(config),
      })
      .pipe(
        map(raws => {
          raws.forEach(raw => {
            (raw as RichSearchResult).gitlabID = config.id;
          });
          return raws;
        })
      );
  }

  getAllProjects(config: GitlabConfig, membership = true): Observable<Project[]> {
    const req: (url?: string) => Observable<Project[]> = (url?: string) => {
      const src$ = !url
        ? this.http.get<Project[]>(`${this.getApiV4URL(config)}/projects`, {
            params: {
              simple: 'true',
              membership: `${membership}`,
              per_page: '100',
              order_by: 'id',
              pagination: 'keyset',
            },
            headers: this.getAuthHeader(config),
            observe: 'response',
          })
        : this.http.get<Project[]>(url, {
            headers: this.getAuthHeader(config),
            observe: 'response',
          });

      return src$.pipe(
        mergeMap(resp => {
          const projects = resp.body;
          const linkHeader = resp.headers.get('Link') || resp.headers.get('Links');
          const nextLink = this.parseLink(linkHeader);
          if (nextLink === null) {
            return of(projects);
          }
          return req(nextLink).pipe(map(data => data.concat(projects)));
        })
      );
    };
    return req();
  }

  private getApiV4URL(config: Omit<GitlabConfig, 'id'>): string {
    return `${config.gitlabURL}/api/v4`;
  }

  private getAuthHeader(config: Omit<GitlabConfig, 'id'>): { [header: string]: string } {
    return { 'Private-Token': config.token };
  }

  private parseLink(linkHeader: string | null): string | null {
    if (linkHeader === null) {
      return null;
    }
    const linkRe = /<(.*)>; rel="(\w*)"/;
    const match = linkHeader.match(linkRe);
    return match ? match[1] : null;
  }
}
