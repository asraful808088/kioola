import React from 'react';
import { AgentProvider, useAgent } from './context/AgentContext';
import { AgentChat } from './components/AgentChat';
import { SubagentGraph } from './components/SubagentGraph';
import { ActionCenter } from './components/ActionCenter';
import { TaskPlanner } from './components/TaskPlanner';
import { ToolTimeline } from './components/ToolTimeline';
import { WorkspaceViewer } from './components/WorkspaceViewer';
import { SystemStats } from './components/SystemStats';
import { ModelRouter } from './components/ModelRouter';
import { SocialMediaControl } from './components/SocialMediaControl';
import { DiscordBroadcastConsole } from './components/DiscordBroadcastConsole';
import { Timer, Cpu, Terminal, Layers, Coins, RotateCcw, Sparkles, MessageSquare } from './components/Icons';
import './App.css';

const DashboardContent: React.FC = () => {
  const { scenario, isSimulating, metrics, startSimulation, resetSimulation, isFocusMode } = useAgent();
  const [activeTab, setActiveTab] = React.useState<'diagnostics' | 'workspace'>('diagnostics');
  const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(false);

  return (
    <div className={`app-layout ${isFocusMode ? 'focus-mode-active' : ''}`}>
      {/* Control Console Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon-glow">
            <Cpu size={18} className="neon-cyan-text icon-spin" />
          </div>
          <h1>
            Kioola <span className="logo-sub">Cockpit</span>
            {/* <span className="version-label">v3.0.0</span> */}
          </h1>
        </div>

        {/* Actionable Scenario presets */}
        <div className="control-scenarios">
          {/* Mobile Drawer Toggle Button */}
          <button 
            className="drawer-toggle-btn"
            onClick={() => setIsDrawerOpen(true)}
          >
            <MessageSquare size={12} style={{ marginRight: '6px' }} />
            Console
          </button>

          <button
            className={`scenario-btn ${scenario === 'pc_cleaner' ? 'active' : ''}`}
            onClick={() => startSimulation('pc_cleaner')}
            disabled={isSimulating}
          >
            <Sparkles size={12} style={{ marginRight: '6px' }} />
            Local Cache Cleaner
          </button>
          <button
            className={`scenario-btn ${scenario === 'multi_model_audit' ? 'active' : ''}`}
            onClick={() => startSimulation('multi_model_audit')}
            disabled={isSimulating}
          >
            <Sparkles size={12} style={{ marginRight: '6px' }} />
            Multi-Model Code Audit
          </button>
          <button
            className={`scenario-btn ${scenario === 'social_broadcast' ? 'active' : ''}`}
            onClick={() => startSimulation('social_broadcast')}
            disabled={isSimulating}
          >
            <Sparkles size={12} style={{ marginRight: '6px' }} />
            Deploy & Social Broadcast
          </button>
          {scenario && (
            <button className="reset-btn" onClick={resetSimulation}>
              <RotateCcw size={12} style={{ marginRight: '4px' }} />
              Reset Console
            </button>
          )}
        </div>
      </header>

      {/* Metrics Telemetry Ribbon */}
      <div className="telemetry-bar">
        <div className="telemetry-item">
          <Timer size={14} className="neon-cyan-text" />
          <div className="telemetry-label">Active duration</div>
          <div className="telemetry-val">{metrics.durationSec}s</div>
        </div>
        <div className="telemetry-item">
          <Cpu size={14} className="neon-violet-text" />
          <div className="telemetry-label">Tokens run</div>
          <div className="telemetry-val">{metrics.tokensUsed.toLocaleString()}</div>
        </div>
        <div className="telemetry-item">
          <Terminal size={14} className="neon-cyan-text" />
          <div className="telemetry-label">Tool logs</div>
          <div className="telemetry-val">{metrics.toolCallsCount}</div>
        </div>
        <div className="telemetry-item">
          <Layers size={14} className="neon-violet-text" />
          <div className="telemetry-label">Subagents run</div>
          <div className="telemetry-val">{metrics.subagentsCount}</div>
        </div>
        <div className="telemetry-item">
          <Coins size={14} className="neon-cyan-text" />
          <div className="telemetry-label">Est. Cost</div>
          <div className="telemetry-val">${metrics.cost.toFixed(4)}</div>
        </div>
      </div>

      {/* Responsive Navigation Tab bar (Only visible on tablet & mobile resolutions) */}
      <div className="responsive-tabs-bar">
        <button 
          className={`responsive-tab-btn ${activeTab === 'diagnostics' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagnostics')}
        >
          <span className="tab-icon">🧠</span> PC Brain & Routing
        </button>
        <button 
          className={`responsive-tab-btn ${activeTab === 'workspace' ? 'active' : ''}`}
          onClick={() => setActiveTab('workspace')}
        >
          <span className="tab-icon">📂</span> Code Workspaces
        </button>
      </div>

      {/* Responsive Slide-Out Drawer Backdrop */}
      {isDrawerOpen && (
        <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)}></div>
      )}

      {/* Primary 3-Column Dashboard Grid */}
      <main className="dashboard-grid">
        {/* Column 1: Kioola Command Core (Rendered as Left Sidebar or Left Drawer based on Screen Scale) */}
        <section className={`dashboard-col col-1 ${isDrawerOpen ? 'drawer-open' : 'drawer-closed'}`}>
          <div className="drawer-header-mobile">
            <h4>Kioola Companion Console</h4>
            <button className="drawer-close-btn" onClick={() => setIsDrawerOpen(false)}>✕</button>
          </div>
          <div className="panel-wrapper chat-wrapper">
            <AgentChat />
          </div>
          <div className="panel-wrapper action-wrapper">
            <ActionCenter />
          </div>
        </section>

        {/* Column 2: System Diagnostics & Routing Core */}
        <section className={`dashboard-col col-2 ${activeTab === 'diagnostics' ? 'mobile-active' : 'mobile-hidden'}`}>
          <div className="panel-wrapper stats-wrapper">
            <SystemStats />
          </div>
          <div className="panel-wrapper router-wrapper">
            <ModelRouter />
          </div>
          <div className="panel-wrapper social-wrapper">
            <SocialMediaControl />
          </div>
        </section>

        {/* Column 3: Orchestration Graph & Workspaces */}
        <section className={`dashboard-col col-3 ${activeTab === 'workspace' ? 'mobile-active' : 'mobile-hidden'}`}>
          <div className="panel-row-top">
            <div className="panel-wrapper graph-wrapper">
              <SubagentGraph />
            </div>
            <div className="panel-wrapper plan-wrapper">
              <TaskPlanner />
            </div>
          </div>
          <div className="panel-row-mid">
            <div className="panel-wrapper timeline-wrapper">
              <ToolTimeline />
            </div>
          </div>
          <div className="panel-row-bottom">
            <div className="panel-wrapper workspace-wrapper">
              <WorkspaceViewer />
            </div>
          </div>
        </section>
      </main>

      {/* Root-level full-screen Discord Broadcast Console overlay */}
      <DiscordBroadcastConsole />
    </div>
  );
};

export default function App() {
  return (
    <AgentProvider>
      <DashboardContent />
    </AgentProvider>
  );
}
