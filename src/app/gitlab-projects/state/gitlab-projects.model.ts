export interface Namespace {
  id: number;
  name: string;
  path: string;
  kind: 'user' | 'group';
  full_path: string;
  parent_id: number | null;
  web_url: string;
}

export interface Project {
  id: number;
  description: string;
  name: string;
  name_with_namespace: string;
  path: string;
  path_with_namespace: string;
  created_at: string;
  tag_list: [];
  ssh_url_to_repo: string;
  http_url_to_repo: string;
  web_url: string;
  last_activity_at: string;
  namespace: Namespace;
}

export interface GitlabData {
  id: string;
  loadDt: string | null;
  projects: Project[];
}

export interface GitlabDataUI {
  isLoading: boolean;
}

export interface GitlabProject extends Project {
  gitlab_id: string;
  type: 'project';
}

export interface GitlabNamespace {
  gitlab_id: string;
  name: string;
  type: 'namespace';
}

export function isGitlabProject(v: any): v is GitlabProject {
  return v !== null && typeof (v === 'object') && v.gitlab_id && v.type === 'project';
}

export function isGitlabNamespace(v: any): v is GitlabNamespace {
  return v !== null && typeof (v === 'object') && v.gitlab_id && v.type === 'namespace';
}

export interface SearchProject {
  gitlab_id: string;
  project_id: number;
}
