import { TestBed } from '@angular/core/testing';

import { GitlabApiService } from './gitlab-api.service';

describe('GitlabApiService', () => {
  let service: GitlabApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GitlabApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
