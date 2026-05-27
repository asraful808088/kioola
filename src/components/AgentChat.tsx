import React, { useState, useRef, useEffect } from 'react';
import { useAgent } from '../context/AgentContext';
import { Send, Terminal, ShieldAlert, Cpu, CornerDownRight, Plus, Trash, Edit3, Check, X, PanelLeft, Maximize2, Minimize2 } from './Icons';
import './AgentChat.css';

export const AgentChat: React.FC = () => {
  const {
    messages,
    sendMessage,
    isSimulating,
    sessions,
    activeSessionId,
    switchSession,
    createNewSession,
    deleteSession,
    renameSession,
    isFocusMode,
    setIsFocusMode,
    isSessionListOpen,
    setIsSessionListOpen
  } = useAgent();

  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSimulating]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim());
    setInputValue('');
  };

  const toggleThoughts = (id: string) => {
    setExpandedThoughts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleRenameStart = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(id);
    setRenameValue(currentTitle);
  };

  const handleRenameSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (renameValue.trim()) {
      renameSession(id, renameValue.trim());
    }
    setEditingSessionId(null);
  };

  const handleRenameCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  const handleNewSession = () => {
    createNewSession();
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this session?")) {
      deleteSession(id);
    }
  };

  return (
    <div className="agent-chat-container">
      {/* Sessions list overlay */}
      {isSessionListOpen && (
        <div className="sessions-overlay">
          <div className="sessions-overlay-header">
            <h4>Active Sessions</h4>
            <button 
              className="new-session-btn" 
              onClick={handleNewSession}
              title="Create a new conversation session"
            >
              <Plus size={14} /> Add Session
            </button>
          </div>
          
          <div className="sessions-list">
            {sessions.map((sess) => {
              const isActive = sess.id === activeSessionId;
              const isEditing = sess.id === editingSessionId;
              
              return (
                <div 
                  key={sess.id} 
                  className={`session-item ${isActive ? 'active' : ''}`}
                  onClick={() => !isEditing && switchSession(sess.id)}
                >
                  <div className="session-item-content">
                    {isEditing ? (
                      <div className="rename-container" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="rename-input"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSave(sess.id, e as any);
                            if (e.key === 'Escape') handleRenameCancel(e as any);
                          }}
                        />
                        <button className="rename-action-btn check" onClick={(e) => handleRenameSave(sess.id, e)}>
                          <Check size={12} />
                        </button>
                        <button className="rename-action-btn cancel" onClick={handleRenameCancel}>
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="session-item-title-row">
                          <span className="session-item-title">{sess.title}</span>
                          <span className="session-item-time">{sess.createdAt}</span>
                        </div>
                        <div className="session-item-actions">
                          <button 
                            className="session-action-btn edit" 
                            onClick={(e) => handleRenameStart(sess.id, sess.title, e)}
                            title="Rename Session"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button 
                            className="session-action-btn delete" 
                            onClick={(e) => handleDeleteSession(sess.id, e)}
                            title="Delete Session"
                          >
                            <Trash size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main chat window area */}
      <div className="chat-main-area">
        {/* Chat top header */}
        <div className="chat-header">
          <button 
            className={`header-icon-btn ${isSessionListOpen ? 'active' : ''}`}
            onClick={() => setIsSessionListOpen(!isSessionListOpen)}
            title="Toggle session list"
          >
            <PanelLeft size={16} />
          </button>
          
          <div className="chat-header-title">
            <span className="session-glow-indicator"></span>
            <h3>{sessions.find(s => s.id === activeSessionId)?.title || 'Agent chat'}</h3>
          </div>

          <button 
            className={`header-icon-btn focus-toggle-btn ${isFocusMode ? 'active' : ''}`}
            onClick={() => setIsFocusMode(!isFocusMode)}
            title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode (Full Screen Chat)"}
          >
            {isFocusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>

        {/* Chat message listing */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <Cpu className="welcome-icon neon-cyan-text" size={48} />
              <h2>Agent Command Console</h2>
              <p>Welcome to the Agentic OS Dashboard. Select a simulation scenario from the top panel or send a manual instruction below to interact with the orchestration workflow.</p>
              <div className="welcome-presets">
                <button className="welcome-preset-btn" onClick={() => handleNewSession()}>
                  <Plus size={12} style={{ marginRight: '6px' }} />
                  Start a new clean chat session
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isSystem = msg.sender === 'system';
              
              if (isSystem) {
                return (
                  <div key={msg.id} className="chat-msg-system">
                    <div className="system-tag">
                      <ShieldAlert size={14} className="neon-violet-text" />
                      <span>SYSTEM COMPLIANCE</span>
                    </div>
                    <div className="system-body">{msg.text}</div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`chat-msg-wrapper ${isUser ? 'user-msg' : 'agent-msg'}`}>
                  <div className="msg-header">
                    <span className="msg-sender">{isUser ? 'USER' : 'ORCHESTRATOR'}</span>
                    <span className="msg-time">{msg.timestamp}</span>
                  </div>
                  
                  {msg.thoughts && (
                    <div className={`msg-thoughts-container ${expandedThoughts[msg.id] ? 'expanded' : ''}`}>
                      <button className="thoughts-toggle" onClick={() => toggleThoughts(msg.id)}>
                        <Terminal size={12} className="neon-cyan-text" />
                        <span>{expandedThoughts[msg.id] ? 'Hide Inner Monologue' : 'Show Inner Monologue'}</span>
                        <span className="toggle-chevron"></span>
                      </button>
                      {expandedThoughts[msg.id] && (
                        <div className="thoughts-content">
                          <div className="thoughts-inner">
                            <div className="thought-line">
                              <CornerDownRight size={10} className="thought-arrow" />
                              {msg.thoughts}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="msg-text">{msg.text}</div>
                </div>
              );
            })
          )}

          {isSimulating && (
            <div className="chat-msg-wrapper agent-msg typing">
              <div className="msg-header">
                <span className="msg-sender">ORCHESTRATOR</span>
                <span className="msg-time">Thinking...</span>
              </div>
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form className="chat-input-bar" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Issue a new coding instruction to the Orchestrator..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" className="send-btn" disabled={!inputValue.trim()}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
