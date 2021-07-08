export interface Group {
  id: number;
  web_url: string;
  name: string;
  path: string;
  description: string;
  full_name: string;
  full_path: string;
  created_at: string; // TODO: try Date
  parent_id: number | null;
}

export interface Namespace {
  id: number;
  name: string;
  path: string;
  kind: 'user' | 'gnpderoup';
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
  groups: Group[];
  projects: Project[];
}

export interface GitlabProject extends Project {
  gitlab_id: string;
  type: 'project';
}

export interface GitlabGroup extends Group {
  gitlab_id: string;
  type: 'group';
}

export function isGitlabProject(v: any): v is GitlabProject {
  return v !== null && typeof (v === 'object') && v.gitlab_id && v.type === 'project';
}

export function isGitlabGroup(v: any): v is GitlabGroup {
  return v !== null && typeof (v === 'object') && v.gitlab_id && v.type === 'group';
}

export interface SearchProject {
  gitlab_id: string;
  project_id: number;
}
