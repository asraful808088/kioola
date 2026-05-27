import React, { useState } from 'react';
import { useAgent } from '../context/AgentContext';
import { Sliders, Activity } from './Icons';
import './SocialMediaControl.css';

export const SocialMediaControl: React.FC = () => {
  const { socialBots, toggleBotStatus, updateBotWebhook, setShowDiscordOverlay } = useAgent();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempUrl, setTempUrl] = useState('');

  const handleEdit = (id: string, currentUrl: string) => {
    setEditingId(id);
    setTempUrl(currentUrl);
  };

  const handleSave = (id: string) => {
    updateBotWebhook(id, tempUrl);
    setEditingId(null);
  };

  return (
    <div className="social-control-container">
      <h3 className="panel-title">
        <Activity className="neon-cyan-text icon-pulse" size={16} />
        Social Channels Orchestrator
      </h3>

      <div className="bots-list">
        {socialBots.map((bot) => {
          const isDiscord = bot.id.includes('discord');
          const isTelegram = bot.id.includes('telegram');
          const iconText = isDiscord ? '👾' : isTelegram ? '✈️' : '💬';
          const themeClass = isDiscord ? 'discord-theme' : isTelegram ? 'telegram-theme' : 'slack-theme';

          return (
            <div key={bot.id} className={`bot-card ${themeClass} ${bot.status}`}>
              <div className="bot-header">
                <div className="bot-info-meta">
                  <span className="bot-avatar-emoji">{iconText}</span>
                  <div className="bot-name-desc">
                    <span className="bot-name">{bot.name}</span>
                    <span className="bot-status-pill">{bot.status.toUpperCase()}</span>
                  </div>
                </div>

                {/* Status Toggle Switch */}
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={bot.status === 'online'}
                    onChange={() => toggleBotStatus(bot.id)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {/* Bot Statistics */}
              {bot.status === 'online' && (
                <div className="bot-stats-grid">
                  <div className="bot-stat-item">
                    <span className="stat-label">Latency</span>
                    <span className="stat-val neon-cyan-text">{bot.latencyMs}ms</span>
                  </div>
                  <div className="bot-stat-item">
                    <span className="stat-label">Handled</span>
                    <span className="stat-val">{bot.commandsHandled} cmds</span>
                  </div>
                </div>
              )}

              {/* Live Logs Channel */}
              <div className="bot-logs-panel">
                <span className="log-panel-title">Channel Activity Stream</span>
                <div className="log-panel-text">
                  {bot.status === 'online' ? (
                    <span>{bot.lastChannelLog || 'Idle - listening for webhook signals...'}</span>
                  ) : (
                    <span className="text-muted">Channel listener is offline. Toggle online to scan hook payloads.</span>
                  )}
                </div>
              </div>

              {/* Webhook Configuration & Control Button */}
              <div className="bot-webhook-config">
                {editingId === bot.id ? (
                  <div className="webhook-edit-form">
                    <input
                      type="text"
                      className="webhook-input"
                      value={tempUrl}
                      onChange={(e) => setTempUrl(e.target.value)}
                      placeholder="Enter API Endpoint / Webhook URL..."
                    />
                    <button className="webhook-btn-save" onClick={() => handleSave(bot.id)}>
                      Save
                    </button>
                    <button 
                      className="webhook-btn-save" 
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }} 
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="webhook-display-row">
                    <span className="webhook-url-preview">
                      Webhook: {bot.webhookUrl ? bot.webhookUrl : 'Not configured'}
                    </span>
                    
                    <button 
                      className="webhook-btn-edit" 
                      onClick={() => {
                        if (isDiscord && bot.status === 'online') {
                          // Open the full-screen overlay from root level
                          setShowDiscordOverlay(true);
                        } else {
                          handleEdit(bot.id, bot.webhookUrl);
                        }
                      }}
                    >
                      <Sliders size={10} /> Control
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
