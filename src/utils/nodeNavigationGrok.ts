import { GrokNode } from '../types/interfaces';

/**
 * Derives an initial lastActiveChildMap from nodes whose hidden flag was set by a DOM check.
 * Walks upward from every DOM-visible node (hidden === false), recording parent→activeChild
 * entries. Stops early at each ancestor once an entry is already established (avoids
 * redundant traversal for nodes on the same path).
 */
export const deriveLastActiveChildMap = (nodes: GrokNode[]): Record<string, string> => {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const map: Record<string, string> = {};

  for (const node of nodes) {
    if (node.data?.hidden !== false) continue;

    let current: GrokNode | undefined = node;
    while (current?.parent) {
      const parent = nodeMap.get(current.parent);
      if (!parent) break;
      if (map[parent.id]) break;
      map[parent.id] = current.id;
      current = parent;
    }
  }

  return map;
};

/**
 * Computes the set of node IDs on the active path from root to the current leaf,
 * following lastActiveChildMap at each branching node (falling back to children[0]).
 * This replaces DOM-presence checks for Grok visibility, avoiding virtual-scroll false negatives.
 */
export const computeVisiblePath = (
  nodes: GrokNode[],
  lastActiveChildMap: Record<string, string>
): Set<string> => {
  const visibleIds = new Set<string>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  let current: GrokNode | undefined = nodeMap.get('root');

  while (current) {
    visibleIds.add(current.id);
    if (!current.children?.length) break;
    const activeChildId = lastActiveChildMap[current.id] ?? current.children[0];
    current = nodeMap.get(activeChildId);
  }

  return visibleIds;
};

export const calculateStepsGrok = (
  nodes: GrokNode[],
  targetId: string,
  lastActiveChildMap: Record<string, string>
) => {
  const stepsToTake: Array<{
    nodeText: string;
    nodeId: string;
    stepsLeft: number;
    stepsRight: number;
  }> = [];

  let currentNode = nodes.find((node) => node.id === targetId);

  if (!currentNode) {
    return [];
  }

  while (currentNode?.data?.hidden) {
    const parent = nodes.find((n) => n.id === currentNode?.parent);
    if (!parent || !parent.children || parent.children.length === 0) {
      break;
    }

    const childIndex = parent.children.indexOf(currentNode.id);
    if (childIndex === -1) {
      break;
    }

    let activeChildIndex = -1;
    const cachedActiveChildId = lastActiveChildMap[parent.id];
    if (cachedActiveChildId) {
      const cachedIndex = parent.children.indexOf(cachedActiveChildId);
      if (cachedIndex !== -1) {
        activeChildIndex = cachedIndex;
      }
    }

    if (activeChildIndex === -1) {
      activeChildIndex = parent.children.findIndex(
        (childId) => nodes.find((node) => node.id === childId)?.data?.hidden === false
      );
    }

    if (activeChildIndex === -1 && parent.children.length > 0) {
      activeChildIndex = 0;
    }

    if (activeChildIndex !== -1 && activeChildIndex !== childIndex) {
      const stepsCount = Math.abs(childIndex - activeChildIndex);
      const moveRight = childIndex > activeChildIndex;
      const tempStepsToTake: typeof stepsToTake = [];
      for (let i = 0; i < stepsCount; i++) {
        const currentStepNodeIndex = activeChildIndex + (moveRight ? i : -i);
        const currentStepNodeId = parent.children[currentStepNodeIndex];
        const currentStepNode = nodes.find((n) => n.id === currentStepNodeId);
        if (currentStepNode) {
          tempStepsToTake.push({
            nodeText: currentStepNode.data.text,
            nodeId: currentStepNode.id,
            stepsLeft: moveRight ? 0 : 1,
            stepsRight: moveRight ? 1 : 0,
          });
        }
      }
      stepsToTake.push(...tempStepsToTake.reverse());
    }

    currentNode = parent;
  }

  return stepsToTake.reverse();
};
