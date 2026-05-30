import React from 'react';
import { useAgent } from '../context/AgentContext';
import { Cpu, HardDrive, Monitor, Timer } from './Icons';
import './SystemStats.css';

export const SystemStats: React.FC = () => {
  const { systemMetrics } = useAgent();

  const renderGauge = (
    value: number,
    color: string,
    icon: React.ReactNode,
    title: string,
    subtext: string
  ) => {
    // Radius of SVG circle
    const r = 20;
    const circ = 2 * Math.PI * r;
    const strokeDashoffset = circ - (value / 100) * circ;

    return (
      <div className="gauge-card">
        <div className="gauge-visual">
          <svg width="52" height="52" viewBox="0 0 52 52" className="gauge-svg">
            <circle
              className="gauge-bg-ring"
              cx="26"
              cy="26"
              r={r}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="3.5"
              fill="none"
            />
            <circle
              className="gauge-progress-ring"
              cx="26"
              cy="26"
              r={r}
              stroke={color}
              strokeWidth="3.5"
              strokeDasharray={circ}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              style={{ filter: `drop-shadow(0 0 5px ${color}80)` }}
            />
          </svg>
          <div className="gauge-icon-center">{icon}</div>
        </div>
        <div className="gauge-info">
          <div className="gauge-title">{title}</div>
          <div className="gauge-val" style={{ color }}>{value}%</div>
          <div className="gauge-sub">{subtext}</div>
        </div>
      </div>
    );
  };

  // Mock list of active system tasks
  const processes = [
    { name: 'kioola-orchestrator.exe', pid: 4812, cpu: Math.round(systemMetrics.cpuUsage * 0.4), ram: '1.2 GB' },
    { name: 'vite-dev-server.exe', pid: 8940, cpu: Math.round(systemMetrics.cpuUsage * 0.15), ram: '340 MB' },
    { name: 'node-sandbox-runtime.exe', pid: 7604, cpu: Math.round(systemMetrics.cpuUsage * 0.25), ram: '680 MB' },
    { name: 'system-idle-process.sys', pid: 0, cpu: 100 - systemMetrics.cpuUsage, ram: '16 KB' }
  ];

  const diskPercent = Math.round((systemMetrics.diskUsed / systemMetrics.diskTotal) * 100);
  const ramPercent = Math.round((systemMetrics.ramUsed / systemMetrics.ramTotal) * 100);

  return (
    <div className="system-stats-container">
      <h3 className="panel-title">
        <Monitor className="neon-cyan-text icon-pulse" size={16} />
        Kioola PC System Diagnostics
      </h3>

      <div className="stats-grid">
        {renderGauge(
          systemMetrics.cpuUsage,
          '#06b6d4',
          <Cpu size={16} className="neon-cyan-text" />,
          'CPU Load',
          `${systemMetrics.cpuThreads} Threads Active`
        )}

        {renderGauge(
          ramPercent,
          '#8b5cf6',
          <Timer size={16} className="neon-violet-text" />,
          'RAM System',
          `${systemMetrics.ramUsed} / ${systemMetrics.ramTotal} GB`
        )}

        {renderGauge(
          diskPercent,
          '#10b981',
          <HardDrive size={16} className="neon-green-text" />,
          'ROM Storage',
          `${systemMetrics.diskUsed} / ${systemMetrics.diskTotal} GB`
        )}

        {renderGauge(
          systemMetrics.gpuUsage,
          '#ec4899',
          <Monitor size={16} className="neon-pink-text" />,
          'GPU Core',
          `${systemMetrics.gpuTemp}°C Temp`
        )}
      </div>

      <div className="gpu-device-info">
        <span className="info-label">Active GPU:</span>
        <span className="info-value">{systemMetrics.gpuName}</span>
      </div>

      {/* Task Manager Table */}
      <div className="process-monitor">
        <div className="process-header">
          <span>Active Task Process</span>
          <span>CPU</span>
          <span>RAM</span>
        </div>
        <div className="process-rows">
          {processes.map((proc) => (
            <div key={proc.pid} className="process-row">
              <span className="proc-name">{proc.name}</span>
              <span className="proc-cpu">{proc.cpu}%</span>
              <span className="proc-ram">{proc.ram}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
