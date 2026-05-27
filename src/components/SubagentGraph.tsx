import React from 'react';
import { useAgent } from '../context/AgentContext';
import './SubagentGraph.css';
import { Bot, User, ShieldAlert, Binary, Sparkles } from './Icons';

export const SubagentGraph: React.FC = () => {
  const { subagents, isSimulating } = useAgent();

  return (
    <div className="subagent-graph-container">
      <div className="graph-header">
        <h3 className="panel-title">
          <Sparkles className="icon-pulse neon-violet-text" size={16} />
          Multi-Agent Topology
        </h3>
        <span className="badge-glow">
          {subagents.filter((s) => s.status !== 'idle').length} Active
        </span>
      </div>

      <div className="canvas-wrapper">
        <svg className="graph-svg" width="100%" height="220" viewBox="0 0 400 220" preserveAspectRatio="none">
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

          {/* Connective Paths from Root to Leaf Nodes */}
          {subagents.map((agent, index) => {
            const total = subagents.length;
            const startX = 200; // Center X of root node (50%)
            const startY = 40;  // Center Y of root node
            const endX = total > 1 ? 50 + (index * (300 / (total - 1))) : 200;
            const endY = 160;   // Center Y of subagents

            // Bezier curve path
            const pathData = `M ${startX} ${startY} C ${startX} ${(startY + endY) / 2}, ${endX} ${(startY + endY) / 2}, ${endX} ${endY}`;
            const isActive = agent.status === 'thinking' || agent.status === 'working';

            return (
              <g key={agent.id}>
                {/* Background base path */}
                <path
                  d={pathData}
                  className="connection-line"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="2"
                  fill="none"
                />
                {/* Glowing flow animation line */}
                <path
                  d={pathData}
                  className={`connection-glow ${isActive ? 'active-pulse' : ''}`}
                  stroke="url(#lineGrad)"
                  strokeWidth="2.5"
                  fill="none"
                />
              </g>
            );
          })}
        </svg>

        {/* Nodes Layered via Fluid Percentages */}
        <div className="nodes-container">
          {/* Root Node: Main Agent */}
          <div className={`node root-node ${isSimulating ? 'thinking' : ''}`} style={{ left: '50%', top: '40px' }}>
            <div className="node-icon-wrapper">
              <Bot size={20} className="neon-cyan-text" />
            </div>
            <div className="node-info">
              <div className="node-name">Main Orchestrator</div>
              <div className="node-role">Task Planner & Dispatcher</div>
            </div>
            <div className="node-status-ring"></div>
          </div>

          {/* Subagent Nodes */}
          {subagents.map((agent, index) => {
            const total = subagents.length;
            const leftPos = total > 1 ? 50 + (index * (300 / (total - 1))) : 200;
            const leftPercent = (leftPos / 400) * 100;
            const topPos = 160;

            let icon = <User size={16} />;
            if (agent.name.includes('Design')) icon = <Sparkles size={16} />;
            if (agent.name.includes('Security') || agent.name.includes('Audit')) icon = <ShieldAlert size={16} />;
            if (agent.name.includes('Build') || agent.name.includes('Bundle')) icon = <Binary size={16} />;

            return (
              <div
                key={agent.id}
                className={`node sub-node ${agent.status}`}
                style={{ left: `${leftPercent}%`, top: `${topPos}px` }}
              >
                <div className="node-icon-wrapper">
                  {icon}
                </div>
                <div className="node-info">
                  <div className="node-name">{agent.name}</div>
                  <div className="node-role">{agent.role}</div>
                </div>
                {agent.messageCount > 0 && (
                  <span className="message-badge">{agent.messageCount}</span>
                )}
                <div className="node-status-ring"></div>
              </div>
            );
          })}

          {subagents.length === 0 && (
            <div className="empty-graph-state">
              No active subagents. Start a scenario to view orchestration topology.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
