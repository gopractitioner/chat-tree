import { GrokNode, GrokConversation } from '../types/interfaces';
import { useState } from 'react';
import { ExportModal } from './ExportModal';

interface ExportButtonGrokProps {
  nodes: GrokNode[];
  conversationData: GrokConversation;
  className?: string;
}

export const ExportButtonGrok = ({ nodes, conversationData, className }: ExportButtonGrokProps) => {
  const [showModal, setShowModal] = useState(false);

  const getMessageText = (node: GrokNode) => node.data?.text ?? node.data?.label ?? '';

  const handleExport = (format: 'markdown' | 'xml' | 'obsidian') => {
    const visibleNodes = nodes
      .filter(node => !node.data?.hidden)
      .sort((a, b) => (a.data?.timestamp ?? 0) - (b.data?.timestamp ?? 0));

    const title = conversationData.title ?? conversationData.name ?? 'Grok Conversation';
    const created = conversationData.created_at ? new Date(conversationData.created_at) : new Date();

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'markdown') {
      content = `# ${title}\n\n`;
      content += `Created on ${created.toLocaleString()}\n\n---\n\n`;
      visibleNodes.forEach(node => {
        const role = node.data?.role === 'user' ? 'You' : 'Assistant';
        const messageContent = getMessageText(node);
        const timestamp = node.data?.timestamp ? new Date(node.data.timestamp).toLocaleString() : '';
        const model = node.data?.model_slug ? ` (${node.data.model_slug})` : '';
        content += `## ${role}${model}\n\n${messageContent}\n\n`;
        if (timestamp) content += `*${timestamp}*\n\n`;
        content += '---\n\n';
      });
      filename = `${title.replace(/[^a-z0-9-_]/gi, '-') || 'grok-conversation'}.md`;
      mimeType = 'text/markdown';
    } else if (format === 'obsidian') {
      content = `# ${title}\n\n`;
      content += `>[!info]- Conversation Info\n>Created on ${created.toLocaleString()}\n\n`;
      visibleNodes.forEach(node => {
        const role = node.data?.role === 'user' ? 'You' : 'Assistant';
        const messageContent = getMessageText(node);
        const model = node.data?.model_slug ? ` using ${node.data.model_slug}` : '';
        content += role === 'You' ? `>[!question] You\n` : `>[!note] Assistant${model}\n`;
        content += messageContent.split('\n').map(line => `>${line}`).join('\n') + '\n\n';
      });
      filename = `${title.replace(/[^a-z0-9-_]/gi, '-') || 'grok-conversation'}_obsidian.md`;
      mimeType = 'text/markdown';
    } else {
      content = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      content += `<conversation title="${title}" created="${created.toISOString()}">\n`;
      visibleNodes.forEach(node => {
        const role = node.data?.role === 'user' ? 'You' : 'Assistant';
        const messageContent = getMessageText(node);
        const timestamp = node.data?.timestamp ? new Date(node.data.timestamp).toISOString() : '';
        const model = node.data?.model_slug ?? '';
        content += `  <message role="${role}" model="${model}" timestamp="${timestamp}">\n`;
        content += `    <content><![CDATA[${messageContent}]]></content>\n  </message>\n`;
      });
      content += `</conversation>`;
      filename = `${title.replace(/[^a-z0-9-_]/gi, '-') || 'grok-conversation'}.xml`;
      mimeType = 'application/xml';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={className || 'p-2.5 hover:bg-gray-50 transition-colors group'}
        title="Export conversation"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 group-hover:text-gray-800" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {showModal && (
        <ExportModal
          onClose={() => setShowModal(false)}
          onExport={handleExport}
          visibleNodesCount={nodes.filter(node => !node.data?.hidden).length}
        />
      )}
    </>
  );
};
