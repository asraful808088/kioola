import React from 'react';
import { useAgent } from '../context/AgentContext';
import { Cpu, Terminal, Sliders } from './Icons';
import './ModelRouter.css';

export const ModelRouter: React.FC = () => {
  const { 
    scenario, 
    isSimulating, 
    routingLogs, 
    primaryModel, 
    setPrimaryModel 
  } = useAgent();

  const modelsList = [
    'Gemini 3.5 Pro',
    'GPT-4o',
    'Claude 3.5 Sonnet',
    'Llama-3-70B'
  ];

  // Determine if a specific model node is currently "active" in the simulation
  const isModelActive = (modelName: string): boolean => {
    if (!isSimulating || !scenario) return false;

    // Based on the logs or the scenario state
    if (scenario === 'pc_cleaner') {
      if (modelName === 'Gemini 3.5 Flash') return true;
      if (modelName === 'Gemini 3.5 Pro') return true;
    }
    if (scenario === 'multi_model_audit') {
      if (modelName === 'Claude 3.5 Sonnet' || modelName === 'Llama-3-70B' || modelName === 'GPT-4o') return true;
      if (modelName === 'Gemini 3.5 Pro') return true;
    }
    if (scenario === 'social_broadcast') {
      if (modelName === 'Gemini 3.5 Flash' || modelName === 'Llama-3-70B') return true;
      if (modelName === 'Gemini 3.5 Pro') return true;
    }
    return false;
  };

  return (
    <div className="model-router-container">
      <div className="router-header">
        <h3 className="panel-title">
          <Cpu className="neon-violet-text icon-spin" size={16} />
          Multi-Model Routing Brain
        </h3>
        
        {/* Model Selector dropdown */}
        <div className="model-selector-wrapper">
          <Sliders size={12} className="selector-icon" />
          <select 
            value={primaryModel} 
            onChange={(e) => setPrimaryModel(e.target.value)}
            disabled={isSimulating}
            className="model-select"
          >
            {modelsList.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="routing-visualizer">
        {/* Orchestrator Center Node */}
        <div className="orchestrator-node-row">
          <div className={`router-node orchestrator ${isSimulating ? 'simulating' : ''}`}>
            <div className="node-glow"></div>
            <div className="node-avatar">🧠</div>
            <div className="node-details">
              <span className="node-role">Primary Brain</span>
              <span className="node-name">Kioola ({primaryModel})</span>
            </div>
            {isSimulating && <span className="pulse-dot active"></span>}
          </div>
        </div>

        {/* Connection Paths SVG */}
        <div className="routing-paths">
          <svg className="paths-svg" width="100%" height="80">
            {/* Connection lines from center to sub-nodes */}
            {/* Gemini 3.5 Flash path */}
            <line x1="20%" y1="0" x2="10%" y2="80" 
              className={`path-line ${isModelActive('Gemini 3.5 Flash') ? 'active-pulse' : ''}`} 
            />
            {/* Claude 3.5 Sonnet path */}
            <line x1="40%" y1="0" x2="36%" y2="80" 
              className={`path-line ${isModelActive('Claude 3.5 Sonnet') ? 'active-pulse' : ''}`} 
            />
            {/* Llama-3-70B path */}
            <line x1="60%" y1="0" x2="64%" y2="80" 
              className={`path-line ${isModelActive('Llama-3-70B') ? 'active-pulse' : ''}`} 
            />
            {/* GPT-4o path */}
            <line x1="80%" y1="0" x2="90%" y2="80" 
              className={`path-line ${isModelActive('GPT-4o') ? 'active-pulse' : ''}`} 
            />
          </svg>
        </div>

        {/* Sub-Model Nodes Row */}
        <div className="sub-nodes-row">
          <div className={`router-node sub-node ${isModelActive('Gemini 3.5 Flash') ? 'active' : ''}`}>
            <span className="sub-node-badge gemini">Gemini</span>
            <div className="sub-node-name">3.5 Flash</div>
            <div className="sub-node-status">{isModelActive('Gemini 3.5 Flash') ? 'DISPATCHED' : 'IDLE'}</div>
          </div>

          <div className={`router-node sub-node ${isModelActive('Claude 3.5 Sonnet') ? 'active' : ''}`}>
            <span className="sub-node-badge claude">Claude</span>
            <div className="sub-node-name">3.5 Sonnet</div>
            <div className="sub-node-status">{isModelActive('Claude 3.5 Sonnet') ? 'DISPATCHED' : 'IDLE'}</div>
          </div>

          <div className={`router-node sub-node ${isModelActive('Llama-3-70B') ? 'active' : ''}`}>
            <span className="sub-node-badge llama">Llama 3</span>
            <div className="sub-node-name">70B Instruct</div>
            <div className="sub-node-status">{isModelActive('Llama-3-70B') ? 'DISPATCHED' : 'IDLE'}</div>
          </div>

          <div className={`router-node sub-node ${isModelActive('GPT-4o') ? 'active' : ''}`}>
            <span className="sub-node-badge gpt">GPT</span>
            <div className="sub-node-name">4o Advanced</div>
            <div className="sub-node-status">{isModelActive('GPT-4o') ? 'DISPATCHED' : 'IDLE'}</div>
          </div>
        </div>
      </div>

      {/* Routing History Log */}
      <div className="routing-history">
        <div className="history-header">
          <Terminal size={12} className="neon-cyan-text" />
          <span>Real-Time Model Delegation Logs</span>
        </div>
        <div className="history-logs">
          {routingLogs.length === 0 ? (
            <div className="history-empty">No active model routing tasks.</div>
          ) : (
            routingLogs.map((log) => (
              <div key={log.id} className="history-row">
                <span className="history-time">{log.timestamp}</span>
                <span className="history-route">
                  {log.sourceModel.split(' ')[0]} ➔ <span className="history-target">{log.targetModel}</span>
                </span>
                <span className="history-task">{log.task}</span>
                <span className={`history-status ${log.status}`}>{log.status.toUpperCase()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
