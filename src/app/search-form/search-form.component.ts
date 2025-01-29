import { FlatTreeControl } from '@angular/cdk/tree';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { BehaviorSubject, Observable, Subject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, startWith, takeUntil, tap } from 'rxjs/operators';
import { GitlabConfig } from '../gitlab-config/state/gitlab-config.model';
import {
  GitlabData,
  GitlabNamespace,
  GitlabProject,
  isGitlabNamespace,
  isGitlabProject,
} from '../gitlab-projects/state/gitlab-projects.model';
import { SelectionModelTrackBy } from './selection-model-track-by.class';
import { trigger, state, style, transition, animate } from '@angular/animations';

export class GitlabEntityNode {
  children: GitlabEntityNode[];
  item: string | GitlabNamespace | GitlabProject;
}

export class GitlabEntityFlatNode {
  item: string | GitlabNamespace | GitlabProject;
  level: number;
  expandable: boolean;
  childrenQty: number | null;
}

interface GitlabEntityValue {
  namespaces: GitlabEntityMap;
  projects: GitlabProject[];
}
type GitlabEntityMap = Map<string, GitlabEntityValue>;

@Component({
  selector: 'app-search-form',
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('expandedState', [
      state('default', style({ transform: 'rotate(0)' })),
      state('expanded', style({ transform: 'rotate(90deg)' })),
      transition('expanded => default', animate('225ms ease-out')),
      transition('default => expanded', animate('225ms ease-in')),
    ]),
  ],
})
export class SearchFormComponent implements OnInit, OnDestroy {
  @Input() set gitlabItems(items: GitlabData[]) {
    this.clearNotRootNodeSelection();
    this.data$.next(items);
    this.loadDtById = {};
    items.forEach(item => {
      this.loadDtById[item.id] = item.loadDt;
    });
  }

  @Input() dataLoading: Record<string, boolean>;

  private gitlabUrlByID: Record<string, string>;
  @Input() set gitlabConfigs(v: GitlabConfig[]) {
    this.gitlabUrlByID = {};
    v.forEach(config => {
      this.gitlabUrlByID[config.id] = config.gitlabURL;
    });
  }

  @Input() withArchived: boolean;

  @Output() gitlabSelected = new EventEmitter<string>();
  @Output() reloadGitlab = new EventEmitter<string>();
  @Output() projectsSelected = new EventEmitter<GitlabProject[]>();
  @Output() withArchivedChange = new EventEmitter<boolean>();

  flatNodeMap = new Map<GitlabEntityFlatNode, GitlabEntityNode>();
  nestedNodeMap = new Map<GitlabEntityNode, GitlabEntityFlatNode>();
  selectedParent: GitlabEntityFlatNode | null = null;

  treeControl: FlatTreeControl<GitlabEntityFlatNode>;
  treeFlattener: MatTreeFlattener<GitlabEntityNode, GitlabEntityFlatNode>;
  dataSource: MatTreeFlatDataSource<GitlabEntityNode, GitlabEntityFlatNode>;

  loadDtById: Record<string, string | null> = {};

  nodeSelection = new SelectionModelTrackBy<GitlabEntityFlatNode, string>(node => {
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

  private readonly data$ = new BehaviorSubject<GitlabData[]>([]);
  private filteredData$: Observable<[GitlabData[], string]>;
  private destroy$ = new Subject<void>();
  private readonly nsNameSeparator = ' / ' as const;

  constructor() {
    this.treeFlattener = new MatTreeFlattener(this.transformer, this.getLevel, this.isExpandable, this.getChildren);
    this.treeControl = new FlatTreeControl<GitlabEntityFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
  }

  ngOnInit(): void {
    const queries$ = this.filterCtrl.valueChanges.pipe(
      filter(() => this.filterCtrl.valid),
      startWith(''),
      debounceTime(200),
      distinctUntilChanged(),
      tap(() => {
        this.nodeSelection.clear();
      }),
    );

    this.filteredData$ = combineLatest([this.data$, queries$]).pipe(map(this.filterData));

    this.filteredData$.pipe(takeUntil(this.destroy$)).subscribe(([data, query]) => {
      this.dataSource.data = this.getTreeNodes(data);
      const rootNodes = this.treeControl.dataNodes.filter(node => node.level === 0);
      if (query !== '') {
        this.nodeSelection.select(...rootNodes.filter(node => node.expandable));
        this.treeControl.expandAll();
      }
      this.updateNodeSelection(this.treeControl.dataNodes.filter(node => node.level === 0));
      this.projectsSelected.emit(this.getSelectedProjects());
    });
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
    const root: GitlabEntityNode = { item: gitlabId, children: [] };
    const rootGroup: GitlabEntityMap = new Map([['root', { namespaces: grouped, projects: [] }]]);
    const treeStack = [{ node: root, parent: rootGroup, nsName: 'root' }];

    while (treeStack.length > 0) {
      const currentTreeNode = treeStack.pop();
      const child = currentTreeNode.parent.get(currentTreeNode.nsName);
      const childrenNodes = this.putToNode(gitlabId, currentTreeNode.node, child);
      treeStack.push(...childrenNodes);
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
        const childNode: GitlabEntityNode = { item: this.getGitlabNamespaceByName(gitlabId, nsName), children: [] };
        const parent = val.namespaces;
        res.push({ node: childNode, nsName, parent });
        node.children.push(childNode);
      }
    }
    if (Array.isArray(val.projects)) {
      node.children.push(...val.projects.sort((a, b) => (a.name > b.name ? 1 : -1)).map(project => ({ item: project, children: [] })));
    }
    return res;
  }

  private getGitlabNamespaceByName(gitlabId: string, name: string): GitlabNamespace {
    return { gitlab_id: gitlabId, type: 'namespace', name };
  }

  /**
   * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
   */
  private transformer = (node: GitlabEntityNode, level: number): GitlabEntityFlatNode => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode = existingNode && existingNode.item === node.item ? existingNode : new GitlabEntityFlatNode();
    flatNode.item = node.item;
    flatNode.level = level;
    flatNode.expandable = !!node.children?.length;
    flatNode.childrenQty = node.children?.length || null;
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };

  getLevel = (node: GitlabEntityFlatNode) => node.level;
  isExpandable = (node: GitlabEntityFlatNode) => node.expandable;
  getChildren = (node: GitlabEntityNode): GitlabEntityNode[] => node.children;
  hasChild = (_: number, _nodeData: GitlabEntityFlatNode) => _nodeData.expandable;

  private getParentNode(node: GitlabEntityFlatNode): GitlabEntityFlatNode | null {
    const currentLevel = this.getLevel(node);
    if (currentLevel < 1) {
      return null;
    }
    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;
    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i];
      if (this.getLevel(currentNode) < currentLevel) {
        return currentNode;
      }
    }
    return null;
  }

  /** Whether all the descendants of the node are selected. */
  descendantsAllSelected(node: GitlabEntityFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const descAllSelected =
      descendants.length > 0 &&
      descendants.every(child => {
        return this.nodeSelection.isSelected(child);
      });
    return descAllSelected;
  }

  /** Whether part of the descendants are selected */
  descendantsPartiallySelected(node: GitlabEntityFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const result = descendants.some(child => this.nodeSelection.isSelected(child));
    return result && !this.descendantsAllSelected(node);
  }

  /** Toggle the node selection. Select/deselect all the descendants node */
  nodeSelectionToggle(node: GitlabEntityFlatNode, ev: MatCheckboxChange): void {
    this.nodeSelection.toggle(node);
    this.emitGitlabSelected(node, ev);
    const descendants = this.treeControl.getDescendants(node);

    if (this.nodeSelection.isSelected(node)) this.nodeSelection.select(...descendants);
    else this.nodeSelection.deselect(...descendants);

    // Force update for the parent
    descendants.forEach(child => this.nodeSelection.isSelected(child));
    this.checkAllParentsSelection(node);
    this.projectsSelected.emit(this.getSelectedProjects());
  }

  /** Toggle a leaf node selection. Check all the parents to see if they changed */
  leafNodeSelectionToggle(node: GitlabEntityFlatNode, ev: MatCheckboxChange): void {
    this.nodeSelection.toggle(node);
    this.emitGitlabSelected(node, ev);
    this.checkAllParentsSelection(node);
    this.projectsSelected.emit(this.getSelectedProjects());
  }

  /** Checks all the parents when a leaf node is selected/unselected */
  private checkAllParentsSelection(node: GitlabEntityFlatNode): void {
    let parent: GitlabEntityFlatNode | null = this.getParentNode(node);
    while (parent) {
      this.checkRootNodeSelection(parent);
      parent = this.getParentNode(parent);
    }
  }

  /** Check root node checked state and change it accordingly */
  private checkRootNodeSelection(node: GitlabEntityFlatNode): void {
    const nodeSelected = this.nodeSelection.isSelected(node);
    const descendants = this.treeControl.getDescendants(node);
    const descAllSelected =
      descendants.length > 0 &&
      descendants.every(child => {
        return this.nodeSelection.isSelected(child);
      });
    if (nodeSelected && !descAllSelected) {
      this.nodeSelection.deselect(node);
    } else if (!nodeSelected && descAllSelected) {
      this.nodeSelection.select(node);
    }
  }

  private emitGitlabSelected(node: GitlabEntityFlatNode, ev: MatCheckboxChange): void {
    if (node.level === 0 && typeof node.item === 'string' && ev.checked) {
      this.gitlabSelected.emit(node.item);
    }
  }

  displayNode(node: GitlabEntityFlatNode): { value: string; isLink: boolean; qty: number | null; id: string | null } {
    if (typeof node.item === 'string') {
      return { value: this.gitlabUrlByID[node.item], isLink: true, qty: node.childrenQty, id: node.item };
    }
    if (isGitlabNamespace(node.item) || isGitlabProject(node.item)) {
      return { value: node.item.name, isLink: false, qty: node.childrenQty, id: null };
    }
    return { value: '', isLink: false, qty: null, id: null };
  }

  getNodeDataLoading(node: GitlabEntityFlatNode): boolean {
    return typeof node.item === 'string' && this.dataLoading[node.item];
  }

  private updateNodeSelection(nodes: GitlabEntityFlatNode[]): void {
    nodes.forEach(node => {
      const nodeSelected = this.nodeSelection.isSelected(node);
      const descendants = this.treeControl.getDescendants(node);
      if (nodeSelected && descendants.length > 0) {
        this.nodeSelection.select(...descendants);
      } else {
        this.updateNodeSelection(descendants);
      }
    });
  }

  private getSelectedProjects(): GitlabProject[] {
    return this.nodeSelection.selected.map(node => node.item).filter(item => isGitlabProject(item)) as GitlabProject[];
  }

  private clearNotRootNodeSelection(): void {
    this.nodeSelection.deselect(...this.nodeSelection.selected.filter(node => node.level !== 0));
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
