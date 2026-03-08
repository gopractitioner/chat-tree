import { GrokNode, GrokEdge, GrokConversation, GrokMessage } from '../types/interfaces';
import { nodeWidth, nodeHeight } from "../constants/constants";
import dagre from '@dagrejs/dagre';

const dagreGraph = new dagre.graphlib.Graph().setGraph({}).setDefaultEdgeLabel(() => ({}));

function getGrokMessageText(msg: GrokMessage): string {
  if (typeof msg.content === 'string') return msg.content;
  if (msg.content && typeof msg.content === 'object' && Array.isArray((msg.content as any).parts)) {
    return ((msg.content as any).parts as string[]).join('\n') || 'No content available';
  }
  if (msg.content && typeof msg.content === 'object' && 'text' in (msg.content as object)) {
    return String((msg.content as any).text) || 'No content available';
  }
  return 'No content available';
}

export const createGrokNodesInOrder = async (
  conversationData: GrokConversation,
  checkNodes: (nodeTexts: string[]) => Promise<boolean[]>
) => {
  const messages = conversationData.grok_messages ?? conversationData.messages ?? [];
  const newNodes = new Array<GrokNode>();
  const newEdges = new Array<GrokEdge>();

  const rootNode: GrokNode = {
    id: 'root',
    type: 'custom',
    parent: null,
    children: [],
    position: { x: 0, y: 0 },
    message: null,
    data: {
      label: 'Start of your conversation',
      text: 'Start of your conversation',
      role: 'system',
      timestamp: Date.now(),
      id: 'root',
      hidden: true,
      contentType: 'text'
    }
  };
  newNodes.push(rootNode);

  messages.forEach((message) => {
    const parentId = message.parent_id && message.parent_id !== '00000000-0000-4000-8000-000000000000' ? message.parent_id : 'root';
    const text = getGrokMessageText(message);
    const node: GrokNode = {
      id: message.id,
      type: 'custom',
      parent: parentId,
      children: [],
      position: { x: 0, y: 0 },
      message,
      data: {
        label: text,
        text,
        role: message.role ?? 'user',
        timestamp: message.created_at ? new Date(message.created_at).getTime() : undefined,
        id: message.id,
        hidden: true,
        contentType: 'text',
        model_slug: (message as any).model ?? undefined
      }
    };

    const parentNode = newNodes.find(n => n.id === parentId);
    if (parentNode) {
      parentNode.children.push(message.id);
    } else {
      rootNode.children.push(message.id);
    }
    newNodes.push(node);
  });

  newNodes.forEach(node => {
    if (node.parent) {
      newEdges.push({
        id: `${node.parent}-${node.id}`,
        source: node.parent,
        target: node.id,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#000000', strokeWidth: 2 }
      });
    }
  });

  const nodesToCheck = newNodes.filter(node => node.id !== 'root');
  const existingNodes = await checkNodes(nodesToCheck.map(node => node.data.text));
  existingNodes.forEach((hidden: boolean, index: number) => {
    if (nodesToCheck[index]) {
      nodesToCheck[index]!.data!.hidden = hidden;
    }
  });

  return layoutNodes(newNodes, newEdges);
};

const layoutNodes = (nodes: GrokNode[], edges: GrokEdge[]) => {
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
  dagre.layout(dagreGraph);

  const nodesWithPositions = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: 'top',
      sourcePosition: 'bottom',
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });
  return { nodes: nodesWithPositions, edges };
};
