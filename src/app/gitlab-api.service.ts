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
    const ver = this.parseVersion(config.version);
    if (ver === null || (ver.major < 13 && ver.minor < 1)) {
      return this.getAllProjectsWithOffsetPagination(config, membership);
    }
    return this.getAllProjectsWithKeysetPagination(config, membership);
  }

  getAllProjectsWithKeysetPagination(config: GitlabConfig, membership = true): Observable<Project[]> {
    const req: (url?: string) => Observable<Project[]> = (url?: string) => {
      const src$ = !url
        ? this.http.get<Project[]>(`${this.getApiV4URL(config)}/projects`, {
            params: {
              simple: 'true',
              membership: `${membership}`,
              per_page: '50',
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

  getAllProjectsWithOffsetPagination(config: GitlabConfig, membership = true): Observable<Project[]> {
    const req: (page: number) => Observable<Project[]> = (page: number) => {
      const src$ = this.http.get<Project[]>(`${this.getApiV4URL(config)}/projects`, {
        params: {
          simple: 'true',
          membership: `${membership}`,
          per_page: '50',
          page: `${page}`,
          order_by: 'id',
        },
        headers: this.getAuthHeader(config),
        observe: 'response',
      });
      return src$.pipe(
        mergeMap(resp => {
          const projects = resp.body;
          const totalPages = parseInt(resp.headers.get('x-total-pages'), 10);
          if (!totalPages || page === totalPages) {
            return of(projects);
          }
          return req(page + 1).pipe(map(data => data.concat(projects)));
        })
      );
    };
    return req(1);
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

  private parseVersion(version: GitlabVersion): { major: number; minor: number; patch: number } | null {
    const re = /^(\d+)\.(\d+)\.(\d+)/;
    if (!version?.version) {
      return null;
    }
    const match = version.version.match(re);
    if (!match || !match.groups) {
      return null;
    }
    return {
      major: parseInt(match.groups[0], 10),
      minor: parseInt(match.groups[1], 10),
      patch: parseInt(match.groups[2], 10),
    };
  }
}
