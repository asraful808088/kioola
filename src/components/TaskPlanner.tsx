import React from 'react';
import { useAgent } from '../context/AgentContext';
import { CheckCircle2, Timer } from './Icons';
import './TaskPlanner.css';

export const TaskPlanner: React.FC = () => {
  const { planSteps } = useAgent();
  
  const completedCount = planSteps.filter((s) => s.status === 'completed').length;
  const progressPercent = planSteps.length > 0 ? (completedCount / planSteps.length) * 100 : 0;

  return (
    <div className="task-planner-container">
      <div className="planner-header">
        <div className="planner-title-block">
          <CheckCircle2 className="neon-cyan-text" size={16} />
          <h3 className="panel-title">Decomposed Plan</h3>
        </div>
        <span className="percent-complete">{Math.round(progressPercent)}% Done</span>
      </div>

      {planSteps.length > 0 && (
        <div className="progress-track-wrapper">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
      )}

      <div className="steps-list">
        {planSteps.length === 0 ? (
          <div className="empty-planner">
            <Timer className="empty-icon" size={32} />
            <p>Awaiting instructions to formulate plan...</p>
          </div>
        ) : (
          planSteps.map((step, idx) => {
            const isCompleted = step.status === 'completed';
            const isActive = step.status === 'active';

            return (
              <div key={step.id} className={`step-item ${step.status}`}>
                <div className="step-marker-container">
                  <div className={`step-dot ${step.status}`}>
                    {isCompleted && <CheckCircle2 size={12} className="check-icon" />}
                    {isActive && <div className="pulse-core"></div>}
                  </div>
                  {idx < planSteps.length - 1 && <div className="step-connector-line"></div>}
                </div>

                <div className="step-content">
                  <div className="step-title">{step.title}</div>
                  {step.details && (isActive || isCompleted) && (
                    <div className="step-details">{step.details}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
