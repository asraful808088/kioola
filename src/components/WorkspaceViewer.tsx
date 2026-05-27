import React, { useState, useEffect } from 'react';
import { useAgent } from '../context/AgentContext';
import { FileText, FolderOpen, Layers, Terminal } from './Icons';
import './WorkspaceViewer.css';

export const WorkspaceViewer: React.FC = () => {
  const { files, activeFile, setActiveFile } = useAgent();
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Auto-select first file if no active file
  useEffect(() => {
    if (files.length > 0 && !activeFile) {
      setActiveFile(files[0]);
    }
  }, [files, activeFile, setActiveFile]);

  const renderVisualPreview = () => {
    if (!activeFile) return null;

    if (activeFile.path.includes('LandingPage.tsx')) {
      return (
        <div className="preview-sandbox">
          <div className="sandbox-browser-chrome">
            <div className="dots">
              <span className="dot dot-red"></span>
              <span className="dot dot-yellow"></span>
              <span className="dot dot-green"></span>
            </div>
            <div className="address-bar">http://localhost:5173/landing</div>
          </div>
          <div className="sandbox-viewport">
            <div className="preview-landing">
              <header className="preview-nav">
                <span className="preview-logo">AgentOS</span>
                <div className="preview-nav-links">
                  <span>Features</span>
                  <span>System</span>
                </div>
              </header>
              <div className="preview-hero">
                <h1>The Future of <span className="neon-text">Autonomous Coding</span></h1>
                <p>Collaborative multi-agent workflows that run, test, and repair software in real time.</p>
                <button className="preview-btn">Launch Dashboard</button>
              </div>
              <div className="preview-features-grid">
                <div className="feat-card">
                  <h4>Infinite Subagents</h4>
                  <p>Spawns specialized containers dynamically.</p>
                </div>
                <div className="feat-card">
                  <h4>Self-Healing</h4>
                  <p>Analyzes error stack traces to fix compilations.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeFile.path.includes('auth.ts')) {
      return (
        <div className="preview-sandbox">
          <div className="sandbox-browser-chrome">
            <div className="dots">
              <span className="dot-red"></span>
              <span className="dot-yellow"></span>
              <span className="dot-green"></span>
            </div>
            <div className="address-bar">Security Audit Endpoint</div>
          </div>
          <div className="sandbox-viewport console">
            <div className="console-line success">✓ API server running on port 3000</div>
            <div className="console-line info">ℹ JWT Verification middleware mounted</div>
            <div className="console-line warning">⚡ Security policy: Auth checks active</div>
            <div className="console-line code-log">[Auth Service] session validated successfully. Signature matches.</div>
          </div>
        </div>
      );
    }

    return (
      <div className="preview-empty">
        <Layers size={24} className="empty-preview-icon" />
        <p>No interactive visual preview renderer defined for this file type.</p>
      </div>
    );
  };

  return (
    <div className="workspace-viewer-container">
      <div className="workspace-sidebar">
        <div className="sidebar-title">
          <FolderOpen size={14} className="neon-cyan-text" />
          <span>Workspace Directory</span>
        </div>
        <div className="file-tree">
          {files.length === 0 ? (
            <div className="empty-tree">Empty directory</div>
          ) : (
            files.map((file) => {
              const isActive = activeFile?.path === file.path;
              return (
                <div
                  key={file.path}
                  className={`file-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveFile(file);
                    setActiveTab('editor');
                  }}
                >
                  <FileText size={14} className="file-icon" />
                  <span className="file-path-text">{file.path}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="workspace-content">
        <div className="content-tabs">
          <button
            className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            <FileText size={14} />
            <span>Code Editor</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
            disabled={files.length === 0}
          >
            <Layers size={14} />
            <span>Visual Preview</span>
          </button>
        </div>

        <div className="content-body">
          {files.length === 0 ? (
            <div className="empty-editor">
              <Terminal size={32} className="empty-icon" />
              <p>Workspace is empty. Launch a scenario to inspect agent modifications.</p>
            </div>
          ) : activeTab === 'editor' && activeFile ? (
            <div className="editor-window">
              <div className="editor-line-numbers">
                {activeFile.content.split('\n').map((_, index) => (
                  <span key={index}>{index + 1}</span>
                ))}
              </div>
              <pre className="editor-code-pane">
                <code>{activeFile.content}</code>
              </pre>
            </div>
          ) : (
            renderVisualPreview()
          )}
        </div>
      </div>
    </div>
  );
};
