export interface GitlabVersion {
  version: string;
  revision: string;
}

export interface GitlabConfig {
  id: string;
  gitlabURL: string;
  token: string;
  version: GitlabVersion | null;
}
