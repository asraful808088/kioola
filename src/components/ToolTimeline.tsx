import React, { useState } from 'react';
import { useAgent } from '../context/AgentContext';
import { Terminal, Activity } from './Icons';
import './ToolTimeline.css';

export const ToolTimeline: React.FC = () => {
  const { toolLogs } = useAgent();
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  const toggleLog = (id: string) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="tool-timeline-container">
      <div className="timeline-header">
        <div className="timeline-title-block">
          <Activity className="neon-violet-text" size={16} />
          <h3 className="panel-title">Tool Invocation Audits</h3>
        </div>
        <span className="timeline-count">{toolLogs.length} total</span>
      </div>

      <div className="timeline-list">
        {toolLogs.length === 0 ? (
          <div className="empty-timeline">
            <Terminal className="empty-icon" size={32} />
            <p>No tools executed in the current session cycle.</p>
          </div>
        ) : (
          toolLogs.map((log) => {
            const isExpanded = !!expandedLogs[log.id];
            
            return (
              <div key={log.id} className={`tool-card ${log.status} ${isExpanded ? 'expanded' : ''}`}>
                <div className="tool-card-summary" onClick={() => toggleLog(log.id)}>
                  <div className="tool-card-left">
                    <span className={`status-indicator ${log.status}`}></span>
                    <span className="tool-name">{log.name}</span>
                  </div>
                  <div className="tool-card-right">
                    <span className="tool-duration">{log.durationMs}ms</span>
                    <span className="tool-time">{log.timestamp}</span>
                    <span className="toggle-arrow"></span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="tool-card-details">
                    <div className="details-section">
                      <div className="section-label">Parameters</div>
                      <pre className="details-code"><code>{log.args}</code></pre>
                    </div>
                    <div className="details-section">
                      <div className="section-label">Output</div>
                      <pre className="details-code output"><code>{log.output}</code></pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
