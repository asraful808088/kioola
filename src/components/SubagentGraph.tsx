import React from 'react';
import { useAgent } from '../context/AgentContext';
import './SubagentGraph.css';
import { Bot, User, ShieldAlert, Binary, Sparkles, Terminal, Layers } from './Icons';

interface SubagentGraphProps {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

export const SubagentGraph: React.FC<SubagentGraphProps> = ({ isExpanded, setIsExpanded }) => {
  const { subagents, isSimulating } = useAgent();

  // Status mapping helper
  const getStatus = (nodeId: string): 'idle' | 'thinking' | 'working' | 'done' => {
    if (!isSimulating) return 'idle';

    if (nodeId === 'orchestrator') {
      return 'working';
    }

    const fileIndexer = subagents.find((s) => s.name.includes('File Indexer'));
    const secAuditor = subagents.find((s) => s.name.includes('Security Auditor'));
    const compScanner = subagents.find((s) => s.name.includes('Compliance Scanner'));
    const buildInspector = subagents.find((s) => s.name.includes('Build Inspector'));
    const socialConnector = subagents.find((s) => s.name.includes('Social Connector'));

    if (nodeId === 'node') {
      return fileIndexer ? fileIndexer.status : 'idle';
    }
    if (nodeId === 'react') {
      if (secAuditor && secAuditor.status !== 'idle') return secAuditor.status;
      if (compScanner && compScanner.status !== 'idle') return compScanner.status;
      return (secAuditor || compScanner) ? 'done' : 'idle';
    }
    if (nodeId === 'generate') {
      return buildInspector ? buildInspector.status : 'idle';
    }
    if (nodeId === 'git') {
      return socialConnector ? socialConnector.status : 'idle';
    }

    if (nodeId === 'coding') {
      if (fileIndexer && fileIndexer.status !== 'idle') return fileIndexer.status;
      if (secAuditor && secAuditor.status !== 'idle') return secAuditor.status;
      if (compScanner && compScanner.status !== 'idle') return compScanner.status;
      if (fileIndexer || secAuditor || compScanner) return 'done';
      return 'idle';
    }

    return 'idle';
  };

  const getMessageCount = (nodeId: string): number => {
    const fileIndexer = subagents.find((s) => s.name.includes('File Indexer'));
    const secAuditor = subagents.find((s) => s.name.includes('Security Auditor'));
    const compScanner = subagents.find((s) => s.name.includes('Compliance Scanner'));
    const buildInspector = subagents.find((s) => s.name.includes('Build Inspector'));
    const socialConnector = subagents.find((s) => s.name.includes('Social Connector'));

    if (nodeId === 'node' && fileIndexer) return fileIndexer.messageCount;
    if (nodeId === 'react') {
      return (secAuditor?.messageCount || 0) + (compScanner?.messageCount || 0);
    }
    if (nodeId === 'git' && socialConnector) return socialConnector.messageCount;
    if (nodeId === 'generate' && buildInspector) return buildInspector.messageCount;

    return 0;
  };

  // Node position specs (SVG coordinate space 800 x 380)
  const rootNode = { id: 'orchestrator', label: 'OrchestratorModel', role: 'Decides Category', x: 400, y: 35 };

  const tier1Nodes = [
    { id: 'git', label: 'GitController', role: 'Helper Git Agent', x: 160, y: 120 },
    { id: 'coding', label: 'CodingRouter', role: 'Decides Framework', x: 320, y: 120 },
    { id: 'generate', label: 'GenerateAgent', role: 'Code Generator', x: 480, y: 120 },
    { id: 'question', label: 'QuestionAgent', role: 'General Query', x: 640, y: 120 }
  ];

  const tier2Nodes = [
    { id: 'nextjs', label: 'NextjsCreator', role: 'Next.js App', x: 200, y: 210 },
    { id: 'nuxt', label: 'NuxtCreator', role: 'Nuxt App', x: 320, y: 210 },
    { id: 'vue', label: 'VueCreator', role: 'Vue App', x: 440, y: 210 },
    { id: 'react', label: 'ReactCreator', role: 'React App', x: 200, y: 275 },
    { id: 'vite', label: 'ViteCreator', role: 'Vite App', x: 320, y: 275 },
    { id: 'angular', label: 'AngularCreator', role: 'Angular App', x: 440, y: 275 },
    { id: 'python', label: 'PythonAgent', role: 'Python Env', x: 200, y: 340 },
    { id: 'node', label: 'NodeAgent', role: 'Node.js Env', x: 320, y: 340 },
    { id: 'general', label: 'CodingGeneral', role: 'General Code', x: 440, y: 340 }
  ];

  const drawCurve = (startX: number, startY: number, endX: number, endY: number) => {
    return `M ${startX} ${startY} C ${startX} ${(startY + endY) / 2}, ${endX} ${(startY + endY) / 2}, ${endX} ${endY}`;
  };

  const viewHeight = isExpanded ? 380 : 180;

  return (
    <div className={`subagent-graph-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="graph-header">
        <h3 className="panel-title">
          <Sparkles className="icon-pulse neon-violet-text" size={16} />
          Multi-Agent Topology
        </h3>
        <div className="graph-actions">
          <button 
            className={`collapse-toggle-btn ${isExpanded ? 'active' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse Framework Subagents" : "Expand Framework Subagents"}
          >
            {isExpanded ? "Collapse Tree" : "Expand Coding Router"}
          </button>
          <span className="badge-glow">
            {subagents.filter((s) => s.status !== 'idle').length} Active
          </span>
        </div>
      </div>

      <div className="canvas-wrapper">
        <svg 
          className="graph-svg" 
          width="100%" 
          height={viewHeight} 
          viewBox={`0 0 800 ${viewHeight}`} 
          preserveAspectRatio="xMidYMid meet"
          style={{ transition: 'height 0.3s ease' }}
        >
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Connective Paths from Root (orchestrator) to Tier 1 */}
          {tier1Nodes.map((node) => {
            const pathData = drawCurve(rootNode.x, rootNode.y, node.x, node.y);
            const status = getStatus(node.id);
            const isPathActive = status === 'thinking' || status === 'working' || status === 'done';

            return (
              <g key={`link-root-${node.id}`}>
                <path
                  d={pathData}
                  className="connection-line"
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d={pathData}
                  className={`connection-glow ${isPathActive ? 'active-pulse' : ''}`}
                  stroke="url(#lineGrad)"
                  strokeWidth="2"
                  fill="none"
                />
              </g>
            );
          })}

          {/* Connective Paths from CodingRouter to Tier 2 (only if expanded) */}
          {isExpanded && tier2Nodes.map((node) => {
            const codingNode = tier1Nodes.find(n => n.id === 'coding')!;
            const pathData = drawCurve(codingNode.x, codingNode.y, node.x, node.y);
            const status = getStatus(node.id);
            const isPathActive = status === 'thinking' || status === 'working' || status === 'done';

            return (
              <g key={`link-coding-${node.id}`}>
                <path
                  d={pathData}
                  className="connection-line"
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d={pathData}
                  className={`connection-glow ${isPathActive ? 'active-pulse' : ''}`}
                  stroke="url(#lineGrad)"
                  strokeWidth="2"
                  fill="none"
                />
              </g>
            );
          })}
        </svg>

        {/* Nodes layer positioned absolutely over SVG */}
        <div className="nodes-container" style={{ height: `${viewHeight}px`, transition: 'height 0.3s ease' }}>
          
          {/* Root Node */}
          <div 
            className={`node root-node ${getStatus(rootNode.id)}`} 
            style={{ left: `${(rootNode.x / 800) * 100}%`, top: `${rootNode.y}px` }}
          >
            <div className="node-icon-wrapper">
              <Bot size={14} className="neon-cyan-text" />
            </div>
            <div className="node-info">
              <div className="node-name">{rootNode.label}</div>
              <div className="node-role">{rootNode.role}</div>
            </div>
            <div className="node-status-ring"></div>
          </div>

          {/* Tier 1 Nodes */}
          {tier1Nodes.map((node) => {
            const status = getStatus(node.id);
            const msgCount = getMessageCount(node.id);
            let icon = <User size={12} />;
            if (node.id === 'git') icon = <Layers size={12} className="neon-cyan-text" />;
            if (node.id === 'coding') icon = <Terminal size={12} className="neon-violet-text" />;
            if (node.id === 'generate') icon = <Binary size={12} className="neon-cyan-text" />;
            if (node.id === 'question') icon = <Sparkles size={12} className="neon-violet-text" />;

            return (
              <div
                key={node.id}
                className={`node tier1-node ${node.id}-node ${status}`}
                style={{ left: `${(node.x / 800) * 100}%`, top: `${node.y}px` }}
              >
                <div className="node-icon-wrapper">
                  {icon}
                </div>
                <div className="node-info">
                  <div className="node-name">{node.label}</div>
                  <div className="node-role">{node.role}</div>
                </div>
                {msgCount > 0 && <span className="message-badge">{msgCount}</span>}
                <div className="node-status-ring"></div>
              </div>
            );
          })}

          {/* Tier 2 Nodes (only if expanded) */}
          {isExpanded && tier2Nodes.map((node) => {
            const status = getStatus(node.id);
            const msgCount = getMessageCount(node.id);
            let icon = <Terminal size={11} />;
            if (node.id === 'python') icon = <Binary size={11} />;
            if (node.id === 'react' || node.id === 'nextjs') icon = <ShieldAlert size={11} />;

            return (
              <div
                key={node.id}
                className={`node tier2-node sub-node ${status}`}
                style={{ left: `${(node.x / 800) * 100}%`, top: `${node.y}px` }}
              >
                <div className="node-icon-wrapper">
                  {icon}
                </div>
                <div className="node-info">
                  <div className="node-name">{node.label}</div>
                  <div className="node-role">{node.role}</div>
                </div>
                {msgCount > 0 && <span className="message-badge">{msgCount}</span>}
                <div className="node-status-ring"></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
