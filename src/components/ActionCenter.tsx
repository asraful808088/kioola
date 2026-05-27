import React from 'react';
import { useAgent } from '../context/AgentContext';
import { ShieldAlert, Terminal, FileText, CheckCircle2 } from './Icons';
import './ActionCenter.css';

export const ActionCenter: React.FC = () => {
  const { approvals, handleApproval } = useAgent();
  const pendingApprovals = approvals.filter((a) => a.status === 'pending');

  return (
    <div className="action-center-container">
      <div className="panel-header">
        <h3 className="panel-title">
          <ShieldAlert className="icon-pulse neon-cyan-text" size={16} />
          Human-in-the-Loop Gate
        </h3>
        <span className={`status-tag ${pendingApprovals.length > 0 ? 'attention' : 'idle'}`}>
          {pendingApprovals.length > 0 ? 'Awaiting Action' : 'Secured'}
        </span>
      </div>

      <div className="action-list">
        {pendingApprovals.length === 0 ? (
          <div className="empty-actions">
            <CheckCircle2 className="secured-icon" size={32} />
            <p>Execution sandbox secured. All agent procedures are within allowed safety limits.</p>
          </div>
        ) : (
          pendingApprovals.map((appr) => {
            const isCommand = appr.type === 'command';

            return (
              <div key={appr.id} className="approval-card">
                <div className="approval-card-header">
                  <div className="type-badge">
                    {isCommand ? <Terminal size={12} /> : <FileText size={12} />}
                    <span>{appr.title}</span>
                  </div>
                  <span className="target-path">{appr.target}</span>
                </div>

                <p className="approval-desc">{appr.description}</p>

                {appr.type === 'command' && (
                  <div className="terminal-cmd-box">
                    <span className="cmd-prompt">$</span>
                    <code className="cmd-text">{appr.target}</code>
                  </div>
                )}

                {appr.type === 'code' && appr.codeDiff && (
                  <div className="diff-viewer">
                    <div className="diff-header">Code modification details:</div>
                    <div className="diff-split">
                      <div className="diff-side diff-original">
                        <div className="diff-side-title">Before</div>
                        <pre><code>{appr.codeDiff.original}</code></pre>
                      </div>
                      <div className="diff-side diff-modified">
                        <div className="diff-side-title">Proposed After</div>
                        <pre><code>{appr.codeDiff.modified}</code></pre>
                      </div>
                    </div>
                  </div>
                )}

                <div className="approval-actions">
                  <button
                    className="btn btn-reject"
                    onClick={() => handleApproval(appr.id, false)}
                  >
                    Reject
                  </button>
                  <button
                    className="btn btn-approve"
                    onClick={() => handleApproval(appr.id, true, isCommand ? `Approved terminal run: "${appr.target}"` : `Applied file patch to "${appr.target}"`)}
                  >
                    Approve & Run
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
