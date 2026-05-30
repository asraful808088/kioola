import React, { useState, useEffect } from 'react';
import { useAgent, type WorkspaceFile } from '../context/AgentContext';
import { FileText, Terminal, ShieldAlert, FolderOpen, Check } from './Icons';
import './CodeOutputPanel.css';

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  file?: WorkspaceFile;
}

export const CodeOutputPanel: React.FC = () => {
  const { files, activeFile, setActiveFile, toolLogs } = useAgent();
  const [activeTab, setActiveTab] = useState<'raw' | 'error' | 'workspace'>('raw');
  const [rawText, setRawText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Sync rawText with activeFile content when selected
  useEffect(() => {
    if (activeFile) {
      setRawText(activeFile.content);
    }
  }, [activeFile]);

  // Handle template text initialization
  useEffect(() => {
    if (files.length === 0 && !rawText) {
      setRawText(
        `// Paste your AI-generated code or text output here...\n// Or run one of the simulation scenarios to view workspace modifications.\n\nfunction kioolaAgent() {\n  console.log("Cockpit active & listening...");\n}`
      );
    }
  }, [files, rawText]);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  // Find failed tool logs
  const failedLogs = toolLogs.filter(log => log.status === 'failed');

  // Build recursive directory tree from flat files list
  const buildFileTree = (fileList: WorkspaceFile[]): TreeNode[] => {
    const root: TreeNode = { name: 'root', path: '', isFolder: true, children: [] };

    fileList.forEach((file) => {
      const parts = file.path.split('/');
      let current = root;

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        const currentPath = parts.slice(0, index + 1).join('/');

        let existing = current.children.find((c) => c.name === part);

        if (!existing) {
          existing = {
            name: part,
            path: currentPath,
            isFolder: !isLast,
            children: [],
            file: isLast ? file : undefined,
          };
          current.children.push(existing);
        }

        current = existing;
      });
    });

    // Sort folders first, then files
    const sortTree = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach((node) => {
        if (node.isFolder && node.children.length > 0) {
          sortTree(node.children);
        }
      });
    };

    sortTree(root.children);
    return root.children;
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isFolderCollapsed = collapsedFolders[node.path];
    const indent = depth * 16;

    if (node.isFolder) {
      return (
        <div key={node.path} className="tree-node-group">
          <div
            className="tree-node tree-folder"
            style={{ paddingLeft: `${indent + 12}px` }}
            onClick={() => toggleFolder(node.path)}
          >
            <span className={`tree-chevron ${isFolderCollapsed ? 'collapsed' : 'expanded'}`}>
              ▼
            </span>
            <FolderOpen size={14} className="tree-folder-icon" />
            <span className="tree-node-name">{node.name}</span>
          </div>

          {!isFolderCollapsed && node.children && (
            <div className="tree-children-list">
              {node.children.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      const isActive = activeFile?.path === node.path;
      return (
        <div
          key={node.path}
          className={`tree-node tree-file ${isActive ? 'active' : ''}`}
          style={{ paddingLeft: `${indent + 26}px` }}
          onClick={() => {
            if (node.file) {
              setActiveFile(node.file);
              setActiveTab('raw');
            }
          }}
        >
          <FileText size={14} className="tree-file-icon" />
          <span className="tree-node-name">{node.name}</span>
          {node.file && <span className="tree-file-type">{node.file.type}</span>}
        </div>
      );
    }
  };

  const fileTree = buildFileTree(files);

  return (
    <div className="code-output-panel-container">
      {/* Panel Headers / Tabs */}
      <div className="panel-tabs">
        <button
          className={`panel-tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
          onClick={() => setActiveTab('raw')}
        >
          <FileText size={13} />
          <span>Raw Text / Code</span>
        </button>

        <button
          className={`panel-tab-btn error-tab ${activeTab === 'error' ? 'active' : ''}`}
          onClick={() => setActiveTab('error')}
        >
          <ShieldAlert size={13} className={failedLogs.length > 0 ? 'pulse-error' : ''} />
          <span>Errors</span>
          {failedLogs.length > 0 && <span className="error-count-badge">{failedLogs.length}</span>}
        </button>

        <button
          className={`panel-tab-btn ${activeTab === 'workspace' ? 'active' : ''}`}
          onClick={() => setActiveTab('workspace')}
        >
          <FolderOpen size={13} />
          <span>Workspace Directory</span>
          {files.length > 0 && <span className="workspace-count-badge">{files.length}</span>}
        </button>
      </div>

      {/* Panel Body */}
      <div className="panel-tab-content">
        {/* Tab 1: Raw Text / Code */}
        {activeTab === 'raw' && (
          <div className="raw-tab-container">
            <div className="tab-actions-bar">
              <span className="tab-bar-info">
                {activeFile ? `📄 Editing: ${activeFile.path}` : '📝 Code Editor Sandbox'}
              </span>
              <button className="copy-code-btn" onClick={handleCopy}>
                {copied ? <Check size={12} style={{ color: '#10b981' }} /> : null}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="text-editor-workspace">
              <textarea
                className="raw-code-textarea"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste your code or console output here..."
                spellCheck="false"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Errors */}
        {activeTab === 'error' && (
          <div className="errors-tab-container">
            <div className="tab-actions-bar">
              <span className="tab-bar-info">🚨 Tool Execution Failure Log</span>
            </div>
            <div className="text-editor-workspace">
              <textarea
                className="errors-textarea"
                readOnly
                value={
                  failedLogs.length === 0
                    ? "All systems operational. Zero compilation or tool execution failures detected."
                    : failedLogs
                        .map(
                          (log) =>
                            `[${log.timestamp}] Tool Execution Failed: ${log.name}\n` +
                            `Arguments: ${log.args}\n` +
                            `Failure Output:\n${log.output}\n` +
                            `========================================\n`
                        )
                        .join('\n')
                }
                placeholder="No errors reported."
                spellCheck="false"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Workspace Directory */}
        {activeTab === 'workspace' && (
          <div className="workspace-tab-container">
            <div className="directory-header">
              <FolderOpen size={14} className="neon-cyan-text" />
              <span>Workspace Directory Path: /sandbox/project/src</span>
            </div>
            
            <div className="directory-tree-list">
              {files.length === 0 ? (
                <div className="empty-directory-view">
                  <Terminal size={24} style={{ opacity: 0.3 }} />
                  <p>No files generated in current environment workspace.</p>
                </div>
              ) : (
                fileTree.map((node) => renderTreeNode(node, 0))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
