import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { concat, Observable, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { Group, Project } from './search-params/state/search-param.model';
import { RichSearchResult, SearchResultRaw } from './search-result/state/search-result.model';
import { GitlabConfig } from './state/gitlab-config.model';

export interface WithNext<T> {
  nextURL?: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class GitlabApiService {
  constructor(private http: HttpClient) {}

  getGroups(config: GitlabConfig, all_available = false): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.getApiV4URL(config)}/groups`, {
      params: { all_available: `${all_available}` },
      headers: this.getAuthHeader(config),
    });
  }

  getProjects(config: GitlabConfig, membership = true): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.getApiV4URL(config)}/projects`, {
      params: { simple: 'true', membership: `${membership}` },
      headers: this.getAuthHeader(config),
    });
  }

  getGroupProjects(config: GitlabConfig, groupID: number): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.getApiV4URL(config)}/groups/${groupID}/projects`, {
      params: { simple: 'true' },
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
            params: { simple: 'true', membership: `${membership}`, per_page: '100', order_by: 'id', pagination: 'keyset' },
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
          const nextLink = this.parseLink(resp.headers.get('Link'));
          if (nextLink === null) {
            return of(projects);
          }
          return req(nextLink).pipe(map(data => data.concat(projects)));
        })
      );
    };
    return req();
  }

  private getApiV4URL(config: GitlabConfig): string {
    return `${config.gitlabURL}/api/v4`;
  }

  private getAuthHeader(config: GitlabConfig): { [header: string]: string } {
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
