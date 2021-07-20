import { FlatTreeControl } from "@angular/cdk/tree";
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from "@angular/core";
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from "@angular/material/tree";
import {
  GitlabData,
  GitlabNamespace,
  GitlabProject,
  isGitlabNamespace,
  isGitlabProject,
  Namespace,
} from "../search-params/state/search-param.model";
import { GitlabConfig } from "../state/gitlab-config.model";
import { SelectionModelTrackBy } from "./selection-model-track-by.class";

export class GitlabEntityNode {
  children: GitlabEntityNode[];
  item: string | GitlabNamespace | GitlabProject;
}

export class GitlabEntityFlatNode {
  item: string | GitlabNamespace | GitlabProject;
  level: number;
  expandable: boolean;
}

@Component({
  selector: "app-search-form",
  templateUrl: "./search-form.component.html",
  styleUrls: ["./search-form.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchFormComponent {
  @Input() set gitlabItems(items: GitlabData[]) {
    this.dataSource.data = this.getTreeNodes(items);
    this.updateNodeSelection(
      this.treeControl.dataNodes.filter((node) => node.level === 0)
    );
    this.projectsSelected.emit(this.getSelectedProjects());
  }

  @Input() dataLoading: { [gitlabID: string]: boolean };

  private gitlabUrlByID: { [id: string]: string };
  @Input() set gitlabConfigs(v: GitlabConfig[]) {
    this.gitlabUrlByID = {};
    v.forEach((config) => {
      this.gitlabUrlByID[config.id] = config.gitlabURL;
    });
  }

  flatNodeMap = new Map<GitlabEntityFlatNode, GitlabEntityNode>();
  nestedNodeMap = new Map<GitlabEntityNode, GitlabEntityFlatNode>();
  selectedParent: GitlabEntityFlatNode | null = null;

  treeControl: FlatTreeControl<GitlabEntityFlatNode>;
  treeFlattener: MatTreeFlattener<GitlabEntityNode, GitlabEntityFlatNode>;
  dataSource: MatTreeFlatDataSource<GitlabEntityNode, GitlabEntityFlatNode>;

  nodeSelection = new SelectionModelTrackBy<GitlabEntityFlatNode, string>(
    (node) => {
      if (typeof node.item === "string") {
        return node.item;
      }
      if (isGitlabNamespace(node.item)) {
        return `${node.item.gitlab_id}_ns_${node.item.id}`;
      }
      if (isGitlabProject(node.item)) {
        return `${node.item.gitlab_id}_project_${node.item.id}`;
      }
    },
    true
  );

  @Output() gitlabSelected = new EventEmitter<string>();
  @Output() projectsSelected = new EventEmitter<GitlabProject[]>();

  constructor() {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren
    );
    this.treeControl = new FlatTreeControl<GitlabEntityFlatNode>(
      this.getLevel,
      this.isExpandable
    );
    this.dataSource = new MatTreeFlatDataSource(
      this.treeControl,
      this.treeFlattener
    );
  }

  private getTreeNodes(datas: GitlabData[]): GitlabEntityNode[] {
    const nodes: GitlabEntityNode[] = [];
    (datas || []).forEach((data) => {
      const projectsByNS = new Map<number, GitlabProject[]>();
      const nsByID = new Map<number, Namespace>();
      (data.projects || []).forEach((project) => {
        const nsID = project.namespace.id;
        if (!projectsByNS.has(nsID)) {
          projectsByNS.set(nsID, [
            { ...project, gitlab_id: data.id, type: "project" },
          ]);
        } else {
          projectsByNS
            .get(nsID)
            .push({ ...project, gitlab_id: data.id, type: "project" });
        }
        if (!nsByID.has(nsID)) {
          nsByID.set(nsID, { ...project.namespace });
        }
      });
      const namespaces = Array.from(nsByID.values()).sort((ns1, ns2) =>
        ns1.name > ns2.name ? 1 : ns1.name < ns2.name ? -1 : 0
      );
      const gitlabChildren: GitlabEntityNode[] = (namespaces || []).map(
        (ns) => {
          const nsProjects = projectsByNS.get(ns.id) || [];
          nsProjects.sort((p1, p2) =>
            p1.name > p2.name ? 1 : p1.name < p2.name ? -1 : 0
          );
          return {
            item: { ...ns, gitlab_id: data.id, type: "namespace" },
            children: nsProjects.map((project) => ({
              item: project,
              children: [],
            })),
          };
        }
      );
      nodes.push({
        item: data.id,
        children: gitlabChildren,
      });
    });
    return nodes;
  }

  /**
   * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
   */
  private transformer = (node: GitlabEntityNode, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode =
      existingNode && existingNode.item === node.item
        ? existingNode
        : new GitlabEntityFlatNode();
    flatNode.item = node.item;
    flatNode.level = level;
    flatNode.expandable = !!node.children?.length;
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };

  getLevel = (node: GitlabEntityFlatNode) => node.level;
  isExpandable = (node: GitlabEntityFlatNode) => node.expandable;
  getChildren = (node: GitlabEntityNode): GitlabEntityNode[] => node.children;
  hasChild = (_: number, _nodeData: GitlabEntityFlatNode) =>
    _nodeData.expandable;

  private getParentNode(
    node: GitlabEntityFlatNode
  ): GitlabEntityFlatNode | null {
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
      descendants.every((child) => {
        return this.nodeSelection.isSelected(child);
      });
    return descAllSelected;
  }

  /** Whether part of the descendants are selected */
  descendantsPartiallySelected(node: GitlabEntityFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const result = descendants.some((child) =>
      this.nodeSelection.isSelected(child)
    );
    return result && !this.descendantsAllSelected(node);
  }

  /** Toggle the node selection. Select/deselect all the descendants node */
  nodeSelectionToggle(node: GitlabEntityFlatNode): void {
    this.nodeSelection.toggle(node);
    if (
      node.level === 0 &&
      typeof node.item === "string" &&
      this.nodeSelection.isSelected
    ) {
      this.gitlabSelected.emit(node.item);
    }
    const descendants = this.treeControl.getDescendants(node);
    this.nodeSelection.isSelected(node)
      ? this.nodeSelection.select(...descendants)
      : this.nodeSelection.deselect(...descendants);

    // Force update for the parent
    descendants.forEach((child) => this.nodeSelection.isSelected(child));
    this.checkAllParentsSelection(node);
    this.projectsSelected.emit(this.getSelectedProjects());
  }

  /** Toggle a leaf node selection. Check all the parents to see if they changed */
  leafNodeSelectionToggle(node: GitlabEntityFlatNode): void {
    this.nodeSelection.toggle(node);
    if (
      node.level === 0 &&
      typeof node.item === "string" &&
      this.nodeSelection.isSelected
    ) {
      this.gitlabSelected.emit(node.item);
    }
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
      descendants.every((child) => {
        return this.nodeSelection.isSelected(child);
      });
    if (nodeSelected && !descAllSelected) {
      this.nodeSelection.deselect(node);
    } else if (!nodeSelected && descAllSelected) {
      this.nodeSelection.select(node);
    }
  }

  displayNode(node: GitlabEntityFlatNode): string {
    if (typeof node.item === "string") {
      return this.gitlabUrlByID[node.item];
    }
    if (isGitlabNamespace(node.item) || isGitlabProject(node.item)) {
      return node.item.name;
    }
    return "";
  }

  getGitlabURL(id: string): string {
    return this.gitlabUrlByID[id];
  }

  getNodeDataLoading(node: GitlabEntityFlatNode): boolean {
    return typeof node.item === "string" && this.dataLoading[node.item];
  }

  private updateNodeSelection(nodes: GitlabEntityFlatNode[]): void {
    nodes.forEach((node) => {
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
    return this.nodeSelection.selected
      .map((node) => node.item)
      .filter((item) => isGitlabProject(item)) as GitlabProject[];
  }
}
