import { GrokNode } from '../types/interfaces';

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
