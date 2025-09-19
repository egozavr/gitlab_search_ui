import { AsyncPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox, MatCheckboxChange } from '@angular/material/checkbox';
import { MatError, MatFormField, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTree, MatTreeNode, MatTreeNodeDef, MatTreeNodePadding, MatTreeNodeToggle } from '@angular/material/tree';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, startWith, tap } from 'rxjs/operators';
import { GitlabConfig } from '../gitlab-config/state/gitlab-config.model';
import {
  GitlabData,
  GitlabNamespace,
  GitlabProject,
  isGitlabNamespace,
  isGitlabProject,
} from '../gitlab-projects/state/gitlab-projects.model';
import { SelectionModelTrackBy } from './selection-model-track-by.class';

export class GitlabEntityNode {
  item: string | GitlabNamespace | GitlabProject;
  parent: GitlabEntityNode | null;
  children: GitlabEntityNode[];
  leafDescendants: Set<GitlabEntityNode>;
}

interface GitlabEntityValue {
  namespaces: GitlabEntityMap;
  projects: GitlabProject[];
}
type GitlabEntityMap = Map<string, GitlabEntityValue>;

interface NodeDisplayContext {
  value: string;
  isLink: boolean;
  qty: number;
  leafQty: number;
  id: string | null;
}

@Component({
  selector: 'app-search-form',
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormField,
    MatInput,
    ReactiveFormsModule,
    MatLabel,
    MatIcon,
    MatPrefix,
    MatIconButton,
    MatSuffix,
    MatError,
    MatSlideToggle,
    MatTree,
    MatTreeNodeDef,
    MatTreeNode,
    MatTreeNodePadding,
    MatProgressSpinner,
    NgTemplateOutlet,
    MatCheckbox,
    MatTreeNodeToggle,
    MatButton,
    AsyncPipe,
    DatePipe,
  ],
})
export class SearchFormComponent implements OnInit {
  @Input() set gitlabItems(items: GitlabData[]) {
    this.clearNotRootNodeSelection();
    this.data$.next(items);
    this.loadDtById = {};
    items.forEach(item => {
      this.loadDtById[item.id] = item.loadDt;
    });
  }
  readonly dataLoading = input<Record<string, boolean>>(undefined);
  readonly withArchived = input<boolean>(undefined);

  private gitlabUrlByID: Record<string, string>;
  @Input() set gitlabConfigs(v: GitlabConfig[]) {
    this.gitlabUrlByID = {};
    v.forEach(config => {
      this.gitlabUrlByID[config.id] = config.gitlabURL;
    });
  }

  @Output() loadGitlab = new EventEmitter<string>();
  @Output() reloadGitlab = new EventEmitter<string>();
  @Output() projectsSelected = new EventEmitter<GitlabProject[]>();
  @Output() withArchivedChange = new EventEmitter<boolean>();

  @ViewChild(MatTree) private tree: MatTree<GitlabEntityNode>;

  loadDtById: Record<string, string | null> = {};

  dataSource = new BehaviorSubject<GitlabEntityNode[]>([]);

  nodeSelection = new SelectionModelTrackBy<GitlabEntityNode, string>(node => {
    if (typeof node.item === 'string') {
      return node.item;
    }
    if (isGitlabNamespace(node.item)) {
      return `${node.item.gitlab_id}_ns_${node.item.name}`;
    }
    if (isGitlabProject(node.item)) {
      return `${node.item.gitlab_id}_project_${node.item.id}`;
    }
  }, true);

  filterCtrl = new FormControl('', Validators.minLength(3));

  getChildren = (node: GitlabEntityNode): GitlabEntityNode[] => node.children ?? [];
  hasChild = (_: number, node: GitlabEntityNode) => node.children?.length > 0;

  private readonly data$ = new BehaviorSubject<GitlabData[]>([]);
  private filteredData$: Observable<[GitlabData[], string]>;
  private destroyRef = inject(DestroyRef);

  private readonly nsNameSeparator = ' / ' as const;

  ngOnInit(): void {
    const queries$ = this.filterCtrl.valueChanges.pipe(
      filter(() => this.filterCtrl.valid),
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => {
        this.nodeSelection.clear();
      }),
    );

    this.filteredData$ = combineLatest([this.data$, queries$]).pipe(map(this.filterData));

    this.filteredData$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(([data, query]) => {
      const nodes = this.getTreeNodes(data);
      this.dataSource.next(nodes);
      if (query !== '') {
        nodes.forEach(node => {
          this.tree?.expandDescendants(node);
          this.nodeSelection.select(...node.leafDescendants.keys());
        });
      }
      this.projectsSelected.emit(this.getSelectedProjects());
    });
  }

  displayNodeContext(node: GitlabEntityNode): NodeDisplayContext | null {
    if (typeof node.item === 'string') {
      return {
        value: this.gitlabUrlByID[node.item],
        isLink: true,
        qty: node.children.length,
        leafQty: node.leafDescendants.size,
        id: node.item,
      };
    }
    if (isGitlabNamespace(node.item) || isGitlabProject(node.item)) {
      return { value: node.item.name, isLink: false, qty: node.children.length, leafQty: node.leafDescendants.size, id: null };
    }
    return null;
  }

  getNodeDataLoading(node: GitlabEntityNode): boolean {
    return typeof node.item === 'string' && this.dataLoading()[node.item];
  }

  /** Whether all the descendants of the node are selected. */
  leafDescendantsAllSelected(node: GitlabEntityNode): boolean {
    for (const leafNode of node.leafDescendants.keys()) {
      if (!this.nodeSelection.isSelected(leafNode)) return false;
    }
    return true;
  }

  /** Whether part of the descendants are selected */
  leafDescendantsPartiallySelected(node: GitlabEntityNode, allSelected: boolean): boolean {
    if (allSelected) return false;
    for (const leafNode of node.leafDescendants.keys()) {
      if (this.nodeSelection.isSelected(leafNode)) return true;
    }
    return false;
  }

  /** Toggle the node selection. Select/deselect all the descendants node for not leaf nodes */
  nodeSelectionToggle(node: GitlabEntityNode, ev: MatCheckboxChange, isLeaf = false): void {
    if (isLeaf) {
      this.nodeSelection.toggle(node);
    } else {
      if (ev.checked) {
        this.nodeSelection.select(...node.leafDescendants.keys());
      } else {
        this.nodeSelection.deselect(...node.leafDescendants.keys());
      }
    }
    this.projectsSelected.emit(this.getSelectedProjects());
  }

  nodeIsGitlabAndNotLoaded(node: GitlabEntityNode, level: number): boolean {
    return level === 0 && node.leafDescendants.size === 0;
  }

  private getTreeNodes(datas: GitlabData[]): GitlabEntityNode[] {
    const nodes: GitlabEntityNode[] = [];
    (datas || []).forEach(data => {
      const groupedByNS = this.groupProjectByNamespaces(data);
      const node = this.convertGroupedByNsToNode(data.id, groupedByNS);
      nodes.push(node);
    });
    return nodes;
  }

  private groupProjectByNamespaces(data: GitlabData): GitlabEntityMap {
    const res: GitlabEntityMap = new Map();
    (data.projects || []).forEach(project => {
      const nsNames = project.name_with_namespace.split(this.nsNameSeparator);
      const gitlabProject: GitlabProject = { gitlab_id: data.id, type: 'project', ...project };

      if (nsNames.length < 2) {
        console.error(`Gitlab project ${project.name_with_namespace} cannot exist without group or namespace`);
        return;
      }

      let currentNsMap = res;
      let currentNs: GitlabEntityValue;
      nsNames.forEach((nameSegment, i) => {
        const isLast = i === nsNames.length - 1;
        if (!isLast) {
          if (!currentNsMap.has(nameSegment)) {
            currentNs = { namespaces: new Map(), projects: [] };
            currentNsMap.set(nameSegment, currentNs);
          } else {
            currentNs = currentNsMap.get(nameSegment);
          }
          currentNsMap = currentNs.namespaces;
          return;
        }
        currentNs.projects.push(gitlabProject);
      });
    });
    return res;
  }

  private convertGroupedByNsToNode(gitlabId: string, grouped: GitlabEntityMap): GitlabEntityNode {
    const root: GitlabEntityNode = { item: gitlabId, parent: null, children: [], leafDescendants: new Set() };
    const rootGroup: GitlabEntityMap = new Map([['root', { namespaces: grouped, projects: [] }]]);
    const treeStack = [{ node: root, parent: rootGroup, nsName: 'root' }];

    while (treeStack.length > 0) {
      const currentTreeNode = treeStack.pop();
      const child = currentTreeNode.parent.get(currentTreeNode.nsName);
      const childrenNodes = this.putToNode(gitlabId, currentTreeNode.node, child);
      treeStack.push(...childrenNodes);
    }

    const nodesQueue = [...this.getAllLeafDescendants(root)];
    while (nodesQueue.length > 0) {
      const node = nodesQueue.shift();
      if (node.parent === null) {
        continue;
      }
      if (node.leafDescendants.size === 0) {
        node.parent.leafDescendants.add(node);
      } else {
        for (const descNode of node.leafDescendants.keys()) {
          node.parent.leafDescendants.add(descNode);
        }
      }
      const queueSet = new Set(nodesQueue);
      if (!queueSet.has(node.parent)) {
        nodesQueue.push(node.parent);
      }
    }

    return root;
  }

  private putToNode(
    gitlabId: string,
    node: GitlabEntityNode,
    val: GitlabEntityValue,
  ): { node: GitlabEntityNode; nsName: string; parent: GitlabEntityMap }[] {
    const res: { node: GitlabEntityNode; nsName: string; parent: GitlabEntityMap }[] = [];
    if (val.namespaces?.size) {
      for (const nsName of [...val.namespaces.keys()].sort()) {
        const childNode: GitlabEntityNode = {
          item: this.getGitlabNamespaceByName(gitlabId, nsName),
          parent: node,
          children: [],
          leafDescendants: new Set(),
        };
        const parent = val.namespaces;
        res.push({ node: childNode, nsName, parent });
        node.children.push(childNode);
      }
    }
    if (Array.isArray(val.projects)) {
      node.children.push(
        ...val.projects
          .sort((a, b) => (a.name > b.name ? 1 : -1))
          .map(project => ({ item: project, parent: node, children: [], leafDescendants: new Set<GitlabEntityNode>() })),
      );
    }
    return res;
  }

  private getGitlabNamespaceByName(gitlabId: string, name: string): GitlabNamespace {
    return { gitlab_id: gitlabId, type: 'namespace', name };
  }

  private getAllLeafDescendants(node: GitlabEntityNode): GitlabEntityNode[] {
    const leafNodes: GitlabEntityNode[] = [];
    const nodesToVisit: GitlabEntityNode[] = [node];
    while (nodesToVisit.length > 0) {
      const curNode = nodesToVisit.pop();
      if (curNode.children.length > 0) {
        nodesToVisit.push(...curNode.children);
      } else {
        leafNodes.push(curNode);
      }
    }
    return leafNodes;
  }

  private getSelectedProjects(): GitlabProject[] {
    return this.nodeSelection.selected.map(node => node.item).filter(item => isGitlabProject(item)) as GitlabProject[];
  }

  private clearNotRootNodeSelection(): void {
    this.nodeSelection.deselect(...this.nodeSelection.selected.filter(node => typeof node.item !== 'string'));
  }

  private filterData([datas, query]: [GitlabData[], string]): [GitlabData[], string] {
    query = (query || '').trim().toLowerCase();
    return [
      datas.map(data => ({
        id: data.id,
        loadDt: data.loadDt,
        projects: data.projects.filter(project => project.name_with_namespace.toLowerCase().includes(query)),
      })),
      query,
    ];
  }
}
