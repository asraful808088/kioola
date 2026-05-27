import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

export interface Message {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
  thoughts?: string;
  modelBadge?: string; // Track which model generated the response
}

export interface PlanStep {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed';
  details?: string;
}

export interface ToolLog {
  id: string;
  name: string;
  args: string;
  output: string;
  status: 'running' | 'success' | 'failed';
  durationMs: number;
  timestamp: string;
  modelBadge?: string; // Track model executing the tool
}

export interface Subagent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'thinking' | 'working' | 'done';
  messageCount: number;
  modelBadge: string; // Model powering the subagent
}

export interface WorkspaceFile {
  path: string;
  content: string;
  type: 'code' | 'text' | 'image' | 'diff';
  originalContent?: string;
}

export interface ApprovalPrompt {
  id: string;
  type: 'command' | 'permission' | 'code';
  title: string;
  description: string;
  target: string;
  codeDiff?: { original: string; modified: string };
  status: 'pending' | 'approved' | 'rejected';
}

export interface SystemMetrics {
  cpuUsage: number;
  cpuThreads: number;
  ramUsed: number;
  ramTotal: number;
  diskUsed: number;
  diskTotal: number;
  gpuUsage: number;
  gpuTemp: number;
  gpuName: string;
}

export interface SocialMediaBot {
  id: string;
  name: string;
  status: 'offline' | 'online';
  latencyMs: number;
  commandsHandled: number;
  lastChannelLog: string;
  webhookUrl: string;
}

export interface RoutingLog {
  id: string;
  timestamp: string;
  task: string;
  sourceModel: string;
  targetModel: string;
  status: 'routing' | 'routed' | 'error';
}

export interface Metrics {
  tokensUsed: number;
  durationSec: number;
  toolCallsCount: number;
  subagentsCount: number;
  cost: number;
}

export type ScenarioType = 'pc_cleaner' | 'multi_model_audit' | 'social_broadcast';

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  scenario: ScenarioType | null;
  planSteps: PlanStep[];
  toolLogs: ToolLog[];
  subagents: Subagent[];
  files: WorkspaceFile[];
  activeFile: WorkspaceFile | null;
  approvals: ApprovalPrompt[];
  routingLogs: RoutingLog[];
  metrics: Metrics;
  isSimulating: boolean;
  createdAt: string;
}

interface AgentContextProps {
  scenario: ScenarioType | null;
  isSimulating: boolean;
  messages: Message[];
  planSteps: PlanStep[];
  toolLogs: ToolLog[];
  subagents: Subagent[];
  files: WorkspaceFile[];
  activeFile: WorkspaceFile | null;
  setActiveFile: (file: WorkspaceFile | null) => void;
  approvals: ApprovalPrompt[];
  systemMetrics: SystemMetrics;
  socialBots: SocialMediaBot[];
  routingLogs: RoutingLog[];
  metrics: Metrics;
  primaryModel: string;
  setPrimaryModel: (model: string) => void;
  startSimulation: (type: ScenarioType) => void;
  resetSimulation: () => void;
  handleApproval: (id: string, approve: boolean, customVal?: string) => void;
  sendMessage: (text: string) => void;
  toggleBotStatus: (id: string) => void;
  updateBotWebhook: (id: string, url: string) => void;
  clearWorkspace: () => void;
  triggerBotBroadcast: (botId: string, channels: string[], text: string) => void;
  // Session Manager additions
  sessions: Session[];
  activeSessionId: string;
  switchSession: (id: string) => void;
  createNewSession: (title?: string) => string;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  isFocusMode: boolean;
  setIsFocusMode: (val: boolean) => void;
  isSessionListOpen: boolean;
  setIsSessionListOpen: (val: boolean) => void;
  showDiscordOverlay: boolean;
  setShowDiscordOverlay: (val: boolean) => void;
}

const AgentContext = createContext<AgentContextProps | undefined>(undefined);

export const useAgent = () => {
  const context = useContext(AgentContext);
  if (!context) throw new Error('useAgent must be used within an AgentProvider');
  return context;
};

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const defaultSessionId = 'default-session-id';
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: defaultSessionId,
      title: 'Session 1',
      messages: [],
      scenario: null,
      planSteps: [],
      toolLogs: [],
      subagents: [],
      files: [],
      activeFile: null,
      approvals: [],
      routingLogs: [],
      metrics: {
        tokensUsed: 0,
        durationSec: 0,
        toolCallsCount: 0,
        subagentsCount: 0,
        cost: 0,
      },
      isSimulating: false,
      createdAt: new Date().toLocaleTimeString()
    }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>(defaultSessionId);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isSessionListOpen, setIsSessionListOpen] = useState<boolean>(false);
  const [showDiscordOverlay, setShowDiscordOverlay] = useState<boolean>(false);

  const [scenario, setScenario] = useState<ScenarioType | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [planSteps, setPlanSteps] = useState<PlanStep[]>([]);
  const [toolLogs, setToolLogs] = useState<ToolLog[]>([]);
  const [subagents, setSubagents] = useState<Subagent[]>([]);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [activeFile, setActiveFile] = useState<WorkspaceFile | null>(null);
  const [approvals, setApprovals] = useState<ApprovalPrompt[]>([]);
  const [primaryModel, setPrimaryModel] = useState<string>('Gemini 3.5 Pro');
  
  // Real-Time System Metrics State
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpuUsage: 14,
    cpuThreads: 16,
    ramUsed: 7.2,
    ramTotal: 16.0,
    diskUsed: 412,
    diskTotal: 1024,
    gpuUsage: 5,
    gpuTemp: 44,
    gpuName: 'NVIDIA GeForce RTX 4070'
  });

  // Social Media Channels Integration State
  const [socialBots, setSocialBots] = useState<SocialMediaBot[]>([
    { id: 'bot-discord', name: 'Discord Command Bot', status: 'online', latencyMs: 24, commandsHandled: 15, lastChannelLog: '#dev-logs: kioola active', webhookUrl: 'https://discord.com/api/webhooks/...' },
    { id: 'bot-telegram', name: 'Telegram Client Bot', status: 'online', latencyMs: 76, commandsHandled: 6, lastChannelLog: '@kioola_bot: waiting input', webhookUrl: 'https://api.telegram.org/bot...' },
    { id: 'bot-slack', name: 'Slack Hook Bot', status: 'offline', latencyMs: 0, commandsHandled: 0, lastChannelLog: 'No active listener', webhookUrl: '' }
  ]);

  // Model Routing Logs State
  const [routingLogs, setRoutingLogs] = useState<RoutingLog[]>([]);

  // Simulation Metrics
  const [metrics, setMetrics] = useState<Metrics>({
    tokensUsed: 0,
    durationSec: 0,
    toolCallsCount: 0,
    subagentsCount: 0,
    cost: 0,
  });

  const timerRef = useRef<number | null>(null);
  const stepIndexRef = useRef(0);
  const durationTimerRef = useRef<number | null>(null);

  // Periodic Telemetry Loop
  useEffect(() => {
    const telemetryInterval = setInterval(() => {
      setSystemMetrics((prev) => {
        // Fluctuates metrics based on active simulation states
        const multiplier = isSimulating ? 2.5 : 1;
        const newCpu = Math.min(Math.max(Math.round(prev.cpuUsage + (Math.random() * 8 - 4) * multiplier), 8), 98);
        const newRam = Math.min(Math.max(Number((prev.ramUsed + (Math.random() * 0.2 - 0.1) * multiplier).toFixed(1)), 4.0), 15.2);
        const newGpu = Math.min(Math.max(Math.round(prev.gpuUsage + (Math.random() * 4 - 2) * multiplier), 2), 99);
        const newTemp = Math.min(Math.max(Math.round(prev.gpuTemp + (Math.random() * 2 - 1) * multiplier), 40), 78);
        
        return {
          ...prev,
          cpuUsage: newCpu,
          ramUsed: newRam,
          gpuUsage: newGpu,
          gpuTemp: newTemp
        };
      });

      // Update bot latency values
      setSocialBots((prev) =>
        prev.map((bot) =>
          bot.status === 'online'
            ? { ...bot, latencyMs: Math.max(bot.latencyMs + Math.round(Math.random() * 10 - 5), 10) }
            : bot
        )
      );
    }, 2000);

    return () => clearInterval(telemetryInterval);
  }, [isSimulating]);

  const incrementMetrics = (tokens: number, cost: number, tools = 0, agents = 0) => {
    setMetrics((prev) => ({
      ...prev,
      tokensUsed: prev.tokensUsed + tokens,
      cost: Number((prev.cost + cost).toFixed(4)),
      toolCallsCount: prev.toolCallsCount + tools,
      subagentsCount: prev.subagentsCount + agents,
    }));
  };

  const startDurationTimer = () => {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    setMetrics(prev => ({ ...prev, durationSec: 0 }));
    durationTimerRef.current = window.setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        durationSec: prev.durationSec + 1,
      }));
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  };

  const resetSimulation = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    stopDurationTimer();
    setScenario(null);
    setIsSimulating(false);
    setMessages([]);
    setPlanSteps([]);
    setToolLogs([]);
    setSubagents([]);
    setFiles([]);
    setActiveFile(null);
    setApprovals([]);
    setRoutingLogs([]);
    setMetrics({
      tokensUsed: 0,
      durationSec: 0,
      toolCallsCount: 0,
      subagentsCount: 0,
      cost: 0,
    });
    setSystemMetrics((prev) => ({ ...prev, cpuUsage: 12, ramUsed: 7.0, gpuUsage: 4 }));
    stepIndexRef.current = 0;
  };

  const addAgentMessage = (text: string, thoughts?: string, modelBadge?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages((prev) => [
      ...prev,
      { id: Math.random().toString(), sender: 'agent', text, timestamp, thoughts, modelBadge: modelBadge || primaryModel },
    ]);
  };

  const addSystemMessage = (text: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages((prev) => [
      ...prev,
      { id: Math.random().toString(), sender: 'system', text, timestamp },
    ]);
  };

  const addToolLog = (tool: Omit<ToolLog, 'id' | 'timestamp'>) => {
    const newTool: ToolLog = {
      ...tool,
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
    };
    setToolLogs((prev) => [newTool, ...prev]);
    incrementMetrics(250, 0.001, 1);
  };

  const addRoutingLog = (log: Omit<RoutingLog, 'id' | 'timestamp'>) => {
    const newLog: RoutingLog = {
      ...log,
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
    };
    setRoutingLogs((prev) => [newLog, ...prev]);
  };

  const toggleBotStatus = (id: string) => {
    setSocialBots((prev) =>
      prev.map((bot) =>
        bot.id === id
          ? {
              ...bot,
              status: bot.status === 'online' ? 'offline' : 'online',
              latencyMs: bot.status === 'online' ? 0 : 45,
            }
          : bot
      )
    );
    addSystemMessage(`Social channel bot status updated for ${id.replace('bot-', '')}.`);
  };

  const updateBotWebhook = (id: string, url: string) => {
    setSocialBots((prev) =>
      prev.map((bot) => (bot.id === id ? { ...bot, webhookUrl: url } : bot))
    );
  };

  const triggerBotBroadcast = (botId: string, channels: string[], text: string) => {
    setSocialBots((prev) =>
      prev.map((bot) =>
        bot.id === botId
          ? {
              ...bot,
              commandsHandled: bot.commandsHandled + 1,
              lastChannelLog: `Broadcast sent to ${channels.join(', ')}: "${text}"`,
            }
          : bot
      )
    );
    addToolLog({
      name: 'discord_broadcast',
      args: `Channels: ${channels.join(', ')}, Message: "${text}"`,
      output: `Success: Broadcast transmitted to Discord API Gateway. Pushed to ${channels.length} channels successfully.`,
      status: 'success',
      durationMs: 420,
      modelBadge: 'Discord Bot API Gateway'
    });
    addSystemMessage(`Discord Compliance: Broadcasted to ${channels.join(', ')}: "${text}"`);
  };

  const clearWorkspace = () => {
    setFiles([]);
    setActiveFile(null);
  };

  const executeNextStep = (currentScenario: ScenarioType, step: number) => {
    stepIndexRef.current = step;

    if (currentScenario === 'pc_cleaner') {
      executePcCleanerStep(step);
    } else if (currentScenario === 'multi_model_audit') {
      executeMultiModelAuditStep(step);
    } else if (currentScenario === 'social_broadcast') {
      executeSocialBroadcastStep(step);
    }
  };

  // --------------------------------------------------------------------------
  // SCENARIO 1: LOCAL PC SYSTEM CLEANUP
  // --------------------------------------------------------------------------
  const executePcCleanerStep = (step: number) => {
    switch (step) {
      case 0:
        setPlanSteps([
          { id: 'c1', title: 'Audit local storage & caches', status: 'active', details: 'Reading Temp directories and build cache dumps' },
          { id: 'c2', title: 'Compile clean list & request approval', status: 'pending', details: 'Determine disk space savings' },
          { id: 'c3', title: 'Purge selected cache clusters', status: 'pending', details: 'Perform file removals and re-measure allocation' },
        ]);
        setSubagents([
          { id: 'ca1', name: 'File Indexer', role: 'Storage layout mapper', status: 'idle', messageCount: 0, modelBadge: 'Gemini 3.5 Flash' },
        ]);
        addRoutingLog({
          task: 'Analyze storage cluster directories',
          sourceModel: 'Kioola (Primary: Gemini 3.5 Pro)',
          targetModel: 'Gemini 3.5 Flash',
          status: 'routed'
        });
        addAgentMessage(
          "I will run a storage cleanup audit. I am routing the filesystem scan operation to **Gemini 3.5 Flash** to quickly compile directory listings of temporary logs and compiler caches.",
          "THOUGHTS: Cleaning local temp files will optimize RAM performance. I will dispatch 'ca1' (File Indexer) on Gemini 3.5 Flash. I'll read C:\\Users\\Temp\\ and measure weight.",
          'Gemini 3.5 Pro (Orchestrator)'
        );

        setSystemMetrics((prev) => ({ ...prev, cpuUsage: 68, ramUsed: 9.8 }));

        timerRef.current = window.setTimeout(() => {
          setSubagents((prev) =>
            prev.map((s) => (s.id === 'ca1' ? { ...s, status: 'working', messageCount: 1 } : s))
          );
          addToolLog({
            name: 'list_dir',
            args: 'DirectoryPath: "C:\\Users\\Kioola\\.cache\\node-gyp"',
            output: 'Found 12 cached builds, total size: 780 MB',
            status: 'success',
            durationMs: 410,
            modelBadge: 'Gemini 3.5 Flash'
          });

          setSubagents((prev) =>
            prev.map((s) => (s.id === 'ca1' ? { ...s, status: 'done' } : s))
          );
          setPlanSteps((prev) =>
            prev.map((p) => (p.id === 'c1' ? { ...p, status: 'completed' } : p))
          );
          executeNextStep('pc_cleaner', 1);
        }, 3500);
        break;

      case 1:
        setPlanSteps((prev) =>
          prev.map((p) => (p.id === 'c2' ? { ...p, status: 'active' } : p))
        );

        addAgentMessage(
          "I have compiled the redundant directories. In total, clearing the caches will free up **1.2 GB** of disk space and optimize local file IO operations. I am requesting your permission to execute the terminal deletion command.",
          "THOUGHTS: Scanning completed. Core files targeted: C:\\Temp\\browser_cache (420MB), Node-GYP builds (780MB). Command requires human confirmation.",
          'Gemini 3.5 Pro (Orchestrator)'
        );

        timerRef.current = window.setTimeout(() => {
          setApprovals([
            {
              id: 'clean1',
              type: 'command',
              title: 'Approve Local System Deletion',
              description: 'Clear temporary compilation caches and browser data logs from PC workspace.',
              target: 'rm -rf C:\\Users\\Kioola\\.cache\\node-gyp && rm -rf C:\\Users\\Kioola\\Temp\\cache',
              status: 'pending'
            }
          ]);
        }, 1500);
        break;

      case 2:
        // Approved step
        addAgentMessage(
          "System cleanup command authorized. Executing file purge terminal scripts now.",
          "THOUGHTS: User approved cleanup. Invoking rm command to wipe cache assets. CPU and RAM loads will peak, then drop as indices clean up.",
          'Gemini 3.5 Pro (Orchestrator)'
        );
        setPlanSteps((prev) =>
          prev.map((p) => (p.id === 'c2' ? { ...p, status: 'completed' } : p))
        );
        setPlanSteps((prev) =>
          prev.map((p) => (p.id === 'c3' ? { ...p, status: 'active' } : p))
        );

        setSystemMetrics((prev) => ({ ...prev, cpuUsage: 88, gpuUsage: 12 }));

        timerRef.current = window.setTimeout(() => {
          addToolLog({
            name: 'run_command',
            args: 'CommandLine: "rm -rf C:\\Users\\Kioola\\.cache\\node-gyp && rm -rf C:\\Users\\Kioola\\Temp\\cache"',
            output: 'Purge completed. Wiped 4820 files. 1.20 GB storage recovered.',
            status: 'success',
            durationMs: 1450,
            modelBadge: 'Gemini 3.5 Pro'
          });

          setSystemMetrics((prev) => ({
            ...prev,
            cpuUsage: 18,
            ramUsed: 5.4,
            diskUsed: prev.diskUsed - 1
          }));

          setPlanSteps((prev) =>
            prev.map((p) => (p.id === 'c3' ? { ...p, status: 'completed' } : p))
          );
          addAgentMessage(
            "Local PC cleanup completed! Freed **1.2 GB** of local storage. Disk cache buffers are recycled, and memory load has decreased from 9.8 GB to 5.4 GB.",
            "THOUGHTS: System cleaned successfully. Hardware metrics updated. Concluding cleanup routine.",
            'Gemini 3.5 Pro (Orchestrator)'
          );
          stopDurationTimer();
          setIsSimulating(false);
        }, 4000);
        break;
    }
  };

  // --------------------------------------------------------------------------
  // SCENARIO 2: MULTI-MODEL CODE AUDIT
  // --------------------------------------------------------------------------
  const executeMultiModelAuditStep = (step: number) => {
    switch (step) {
      case 0:
        setPlanSteps([
          { id: 'a1', title: 'Audit cryptographic tokens', status: 'active', details: 'Scanning auth routing structures' },
          { id: 'a2', title: 'Synthesize vulnerability mitigation', status: 'pending', details: 'Write security patch' },
          { id: 'a3', title: 'Execute threat compliance tests', status: 'pending', details: 'Verify signature logic' },
        ]);
        setSubagents([
          { id: 'aud1', name: 'Security Auditor', role: 'Token verification analyzer', status: 'idle', messageCount: 0, modelBadge: 'Claude 3.5 Sonnet' },
          { id: 'aud2', name: 'Compliance Scanner', role: 'Vulnerability pattern scanner', status: 'idle', messageCount: 0, modelBadge: 'Llama-3-70B' },
        ]);
        addRoutingLog({
          task: 'Deep trace JWT validations',
          sourceModel: 'Kioola (Primary: Gemini 3.5 Pro)',
          targetModel: 'Claude 3.5 Sonnet',
          status: 'routed'
        });
        addRoutingLog({
          task: 'Pattern scanning OWASP issues',
          sourceModel: 'Kioola (Primary: Gemini 3.5 Pro)',
          targetModel: 'Llama-3-70B',
          status: 'routed'
        });
        addAgentMessage(
          "Beginning multi-model code audit. I am routing code trace analysis to **Claude 3.5 Sonnet** (vulnerability logic analysis) and pattern scans to **Llama-3-70B** (OWASP mapping) to analyze the token authorization files.",
          "THOUGHTS: Security audit needs double verification. I'll launch 'aud1' (Claude) for structure checking and 'aud2' (Llama-3) for syntax scanning. Gemini 3.5 Pro will aggregate results.",
          'Gemini 3.5 Pro'
        );

        setSystemMetrics((prev) => ({ ...prev, cpuUsage: 72, gpuUsage: 45, gpuTemp: 56 }));

        timerRef.current = window.setTimeout(() => {
          setSubagents((prev) =>
            prev.map((s) => (s.id === 'aud1' ? { ...s, status: 'thinking' } : s))
          );
          setSubagents((prev) =>
            prev.map((s) => (s.id === 'aud2' ? { ...s, status: 'thinking' } : s))
          );

          addToolLog({
            name: 'grep_search',
            args: 'Query: "jwt.decode", SearchPath: "server/auth.ts"',
            output: 'Found unsafe decoding in server/auth.ts line 22.',
            status: 'success',
            durationMs: 310,
            modelBadge: 'Claude 3.5 Sonnet'
          });

          setSubagents((prev) =>
            prev.map((s) =>
              s.id === 'aud1'
                ? { ...s, status: 'working', messageCount: 2 }
                : s.id === 'aud2'
                ? { ...s, status: 'working', messageCount: 1 }
                : s
            )
          );

          const origCode = `export function validateSession(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  // WARNING: Decoding token without checking signatures
  const decoded = jwt.decode(token);
  req.user = decoded;
  next();
}`;

          setFiles([
            {
              path: 'server/auth.ts',
              content: origCode,
              type: 'code',
            },
          ]);
          setActiveFile({
            path: 'server/auth.ts',
            content: origCode,
            type: 'code',
          });

          addAgentMessage(
            "**Claude 3.5 Sonnet** and **Llama-3** have completed analysis. The audit exposed an authentication bypass in `server/auth.ts` where tokens are decoded via `jwt.decode()` instead of signature validation with `jwt.verify()`. I will draft a mitigation patch.",
            "THOUGHTS: Security bypass located. Replacing jwt.decode with jwt.verify using process.env.JWT_SECRET. I will generate a diff and ask the user for authorization.",
            'Claude 3.5 Sonnet'
          );

          setSubagents((prev) =>
            prev.map((s) => ({ ...s, status: 'done' }))
          );
          setPlanSteps((prev) =>
            prev.map((p) => (p.id === 'a1' ? { ...p, status: 'completed' } : p))
          );
          executeNextStep('multi_model_audit', 1);
        }, 5000);
        break;

      case 1:
        setPlanSteps((prev) =>
          prev.map((p) => (p.id === 'a2' ? { ...p, status: 'active' } : p))
        );

        timerRef.current = window.setTimeout(() => {
          setApprovals([
            {
              id: 'audit_patch1',
              type: 'code',
              title: 'Approve Crypto Signature Check',
              description: 'Inject signature verification with try-catch wrapper in auth middleware to prevent token forgery.',
              target: 'server/auth.ts',
              codeDiff: {
                original: `  // WARNING: Decoding token without checking signatures
  const decoded = jwt.decode(token);
  req.user = decoded;
  next();`,
                modified: `  try {
    // FIXED: Enforce cryptographic key validation
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Signature verification failed' });
  }`
              },
              status: 'pending'
            }
          ]);
        }, 1500);
        break;

      case 2:
        addAgentMessage(
          "Authorization granted. Overwriting `server/auth.ts` with signature checks and initiating regression test loops.",
          "THOUGHTS: User approved the patch. Modifying server/auth.ts. I will route verification tests to GPT-4o to write custom unit diagnostics.",
          'Gemini 3.5 Pro'
        );

        setPlanSteps((prev) =>
          prev.map((p) => (p.id === 'a2' ? { ...p, status: 'completed' } : p))
        );
        setPlanSteps((prev) =>
          prev.map((p) => (p.id === 'a3' ? { ...p, status: 'active' } : p))
        );

        const fixedCode = `export function validateSession(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    // FIXED: Enforce cryptographic key validation
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Signature verification failed' });
  }
}`;

        setSystemMetrics((prev) => ({ ...prev, cpuUsage: 82, gpuUsage: 78, gpuTemp: 64 }));

        timerRef.current = window.setTimeout(() => {
          setFiles((prev) =>
            prev.map((f) => (f.path === 'server/auth.ts' ? { ...f, content: fixedCode } : f))
          );
          setActiveFile({
            path: 'server/auth.ts',
            content: fixedCode,
            type: 'code',
          });

          addRoutingLog({
            task: 'Generate and execute test suite validations',
            sourceModel: 'Kioola (Primary: Gemini 3.5 Pro)',
            targetModel: 'GPT-4o',
            status: 'routed'
          });

          addToolLog({
            name: 'replace_file_content',
            args: 'TargetFile: "server/auth.ts", StartLine: 5, EndLine: 9',
            output: 'Successfully patched 5 lines.',
            status: 'success',
            durationMs: 190,
            modelBadge: 'Gemini 3.5 Pro'
          });

          addToolLog({
            name: 'run_command',
            args: 'CommandLine: "npm test auth"',
            output: 'PASS  tests/auth.test.ts\n ✓ Should block unsigned tokens (18ms)\n ✓ Should authorize valid tokens (14ms)\n\nTest Suites: 1 passed\nTests: 2 passed\nDuration: 0.94s',
            status: 'success',
            durationMs: 980,
            modelBadge: 'GPT-4o'
          });

          setSystemMetrics((prev) => ({ ...prev, cpuUsage: 14, gpuUsage: 4, gpuTemp: 46 }));

          setPlanSteps((prev) =>
            prev.map((p) => (p.id === 'a3' ? { ...p, status: 'completed' } : p))
          );
          addAgentMessage(
            "Vulnerability resolved! Cryptographic verification was integrated into `server/auth.ts`. **GPT-4o** has validated the patch with unit test passes.",
            "THOUGHTS: Security audit routine successfully closed. Build passes, logs clear. Threat mitigated.",
            'Gemini 3.5 Pro'
          );
          stopDurationTimer();
          setIsSimulating(false);
        }, 4000);
        break;
    }
  };

  // --------------------------------------------------------------------------
  // SCENARIO 3: SOCIAL MEDIA DEPLOY BROADCASTER
  // --------------------------------------------------------------------------
  const executeSocialBroadcastStep = (step: number) => {
    switch (step) {
      case 0:
        setPlanSteps([
          { id: 'b1', title: 'Compile bundle & collect stats', status: 'active', details: 'Running production build scripts' },
          { id: 'b2', title: 'Audit online social channels', status: 'pending', details: 'Examine Discord and Telegram client connections' },
          { id: 'b3', title: 'Broadcast notification summaries', status: 'pending', details: 'Post compilation stats to webhooks' },
        ]);
        setSubagents([
          { id: 'bc1', name: 'Build Inspector', role: 'Vite compiler auditor', status: 'idle', messageCount: 0, modelBadge: 'Gemini 3.5 Flash' },
          { id: 'bc2', name: 'Social Connector', role: 'API Client Hook negotiator', status: 'idle', messageCount: 0, modelBadge: 'Llama-3-70B' },
        ]);
        addRoutingLog({
          task: 'Build optimization analysis',
          sourceModel: 'Kioola (Primary: Gemini 3.5 Pro)',
          targetModel: 'Gemini 3.5 Flash',
          status: 'routed'
        });
        addAgentMessage(
          "I will build the project and publish metrics. Routing compile procedures to **Gemini 3.5 Flash** to compile Vite assets.",
          "THOUGHTS: Running Vite compiler. After compilation finishes, I'll pass build weight stats to Llama-3 to format social posts.",
          'Gemini 3.5 Pro'
        );

        setSystemMetrics((prev) => ({ ...prev, cpuUsage: 89, ramUsed: 11.2, gpuUsage: 64, gpuTemp: 58 }));

        timerRef.current = window.setTimeout(() => {
          setSubagents((prev) =>
            prev.map((s) => (s.id === 'bc1' ? { ...s, status: 'working', messageCount: 1 } : s))
          );
          addToolLog({
            name: 'run_command',
            args: 'CommandLine: "npm run build"',
            output: 'vite v8.0.14 building...\ndist/index.html 0.78kB\ndist/assets/index.css 26.3kB\ndist/assets/index.js 235.7kB\n✓ Built in 1.4s',
            status: 'success',
            durationMs: 1400,
            modelBadge: 'Gemini 3.5 Flash'
          });

          setFiles([
            {
              path: 'dist/assets/index.js',
              content: '// Compiled output codes\n!(function(){"use strict"; console.log("running console...")})();',
              type: 'code'
            }
          ]);
          setActiveFile({
            path: 'dist/assets/index.js',
            content: '// Compiled output codes\n!(function(){"use strict"; console.log("running console...")})();',
            type: 'code'
          });

          setSubagents((prev) =>
            prev.map((s) => (s.id === 'bc1' ? { ...s, status: 'done' } : s))
          );
          setPlanSteps((prev) =>
            prev.map((p) => (p.id === 'b1' ? { ...p, status: 'completed' } : p))
          );
          executeNextStep('social_broadcast', 1);
        }, 4000);
        break;

      case 1:
        setPlanSteps((prev) =>
          prev.map((p) => (p.id === 'b2' ? { ...p, status: 'active' } : p))
        );
        addRoutingLog({
          task: 'Check channel integration webhooks',
          sourceModel: 'Kioola (Primary: Gemini 3.5 Pro)',
          targetModel: 'Llama-3-70B',
          status: 'routed'
        });
        addAgentMessage(
          "Vite compile finished. Routing social hook checks to **Llama-3-70B** to verify Discord and Telegram bot status values and construct payload formats.",
          "THOUGHTS: Vite build stats: js (235.7kB), css (26.3kB). Dispatching Llama-3 subagent 'bc2' to confirm Discord/Telegram bots are online.",
          'Gemini 3.5 Pro'
        );

        setSubagents((prev) =>
          prev.map((s) => (s.id === 'bc2' ? { ...s, status: 'working' } : s))
        );
        setSystemMetrics((prev) => ({ ...prev, cpuUsage: 45, ramUsed: 9.2, gpuUsage: 25 }));

        timerRef.current = window.setTimeout(() => {
          // Double checks bot statuses from local array
          const activeChannels = socialBots.filter(b => b.status === 'online').map(b => b.name).join(', ');
          
          addSystemMessage(`Social Channels Auditor: Identified online channels: ${activeChannels}`);
          setSubagents((prev) =>
            prev.map((s) => (s.id === 'bc2' ? { ...s, status: 'done' } : s))
          );
          setPlanSteps((prev) =>
            prev.map((p) => (p.id === 'b2' ? { ...p, status: 'completed' } : p))
          );
          executeNextStep('social_broadcast', 2);
        }, 3500);
        break;

      case 2:
        setPlanSteps((prev) =>
          prev.map((p) => (p.id === 'b3' ? { ...p, status: 'active' } : p))
        );
        addAgentMessage(
          "I will now broadcast compilation logs across Discord and Telegram. Approving the action will execute POST requests to webhooks.",
          "THOUGHTS: Generating notification broadcast approval. Data payload includes compile timestamps and asset sizes.",
          'Gemini 3.5 Pro'
        );

        timerRef.current = window.setTimeout(() => {
          setApprovals([
            {
              id: 'social_post1',
              type: 'permission',
              title: 'Approve Social Post Broadcast',
              description: 'Publish release metrics to Discord channel #release-news and @KioolaTelegramChannel.',
              target: 'Discord & Telegram API',
              status: 'pending'
            }
          ]);
        }, 1500);
        break;

      case 3:
        // User approved
        addAgentMessage(
          "Pushing deploy cards to Discord release channel and Telegram groups.",
          "THOUGHTS: User approved social broadcast. Sending JSON payloads to Discord webhook and Telegram BOT APIs.",
          'Gemini 3.5 Pro'
        );
        setPlanSteps((prev) =>
          prev.map((p) => (p.id === 'b3' ? { ...p, status: 'completed' } : p))
        );

        setSystemMetrics((prev) => ({ ...prev, cpuUsage: 54, ramUsed: 8.4 }));

        timerRef.current = window.setTimeout(() => {
          // Update bot stats in UI
          setSocialBots((prev) =>
            prev.map((bot) =>
              bot.id === 'bot-discord'
                ? { ...bot, commandsHandled: bot.commandsHandled + 1, lastChannelLog: 'Post success: V1.2.0 deployed' }
                : bot.id === 'bot-telegram'
                ? { ...bot, commandsHandled: bot.commandsHandled + 1, lastChannelLog: 'Post success: V1.2.0 compiled' }
                : bot
            )
          );

          addToolLog({
            name: 'post_webhook',
            args: 'Url: "https://discord.com/api/webhooks/...", Payload: { content: "🚀 **Build Broadcast**: V1.2.0 compiled: index.js (235kB)" }',
            output: 'Response 204: No Content (Success)',
            status: 'success',
            durationMs: 290,
            modelBadge: 'Gemini 3.5 Pro'
          });

          addToolLog({
            name: 'post_webhook',
            args: 'Url: "https://api.telegram.org/bot...", Payload: { text: "🚀 Build Broadcast: V1.2.0 compiled: index.js (235kB)" }',
            output: 'Response 200: OK (Success)',
            status: 'success',
            durationMs: 380,
            modelBadge: 'Gemini 3.5 Pro'
          });

          setSystemMetrics((prev) => ({ ...prev, cpuUsage: 12, ramUsed: 7.2, gpuUsage: 3 }));

          addAgentMessage(
            "Build broadcast completed! Webhook logs have been posted successfully. Check the **Social Channels** widget on the left to see updated commands and logs.",
            "THOUGHTS: Notification broadcast successfully transmitted. Closing deploy broadcaster flow.",
            'Gemini 3.5 Pro'
          );
          stopDurationTimer();
          setIsSimulating(false);
        }, 4000);
        break;
    }
  };

  const startSimulation = (type: ScenarioType) => {
    resetSimulation();
    setScenario(type);
    setIsSimulating(true);
    startDurationTimer();

    let cmd = '';
    if (type === 'pc_cleaner') cmd = "Kioola, scan my local system cache folders and clear temporary files to reclaim storage.";
    if (type === 'multi_model_audit') cmd = "Perform a multi-model code audit on my token authorization logic.";
    if (type === 'social_broadcast') cmd = "Build the package bundle and broadcast optimization weights to Discord and Telegram.";

    setMessages([
      { id: 'usr1', sender: 'user', text: cmd, timestamp: new Date().toLocaleTimeString() }
    ]);

    executeNextStep(type, 0);
  };

  const handleApproval = (id: string, approve: boolean, customVal?: string) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: approve ? 'approved' : 'rejected' } : a))
    );

    if (approve) {
      addSystemMessage(`Action Approved: ${customVal || 'proceeding.'}`);
      if (scenario === 'pc_cleaner') {
        executeNextStep('pc_cleaner', 2);
      } else if (scenario === 'multi_model_audit') {
        executeNextStep('multi_model_audit', 2);
      } else if (scenario === 'social_broadcast') {
        executeNextStep('social_broadcast', 3);
      }
    } else {
      addSystemMessage("Action Denied: Agent flow aborted.");
      stopDurationTimer();
      setIsSimulating(false);
    }
  };

  const sendMessage = (text: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages((prev) => [...prev, { id: Math.random().toString(), sender: 'user', text, timestamp }]);

    if (!isSimulating) {
      setTimeout(() => {
        addAgentMessage(
          `Hi! I am **Kioola**, your multi-model agentic PC administrator. I received your instruction: "${text}". Please click one of the preset scenario triggers in the header dashboard to see how I audit code across Claude, Llama, and Gemini, clear local hardware caches, and publish stats to Discord or Telegram!`,
          "THOUGHTS: User typed custom message. Directing them to run one of Kioola's rich dashboard scenarios.",
          'Gemini 3.5 Pro'
        );
      }, 1000);
    }
  };

  // Session switching, creation, deletion, and renaming logic:
  const switchSession = (targetId: string) => {
    if (targetId === activeSessionId) return;

    // Clear active timers of the old session
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stopDurationTimer();

    // If it was simulating, we mark it as stopped to prevent callback bleed
    if (isSimulating) {
      setIsSimulating(false);
      addSystemMessage("Orchestration workflow paused due to session switch.");
    }

    const targetSession = sessions.find(s => s.id === targetId);
    if (!targetSession) return;

    // Update current session in sessions array first
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages,
          scenario,
          planSteps,
          toolLogs,
          subagents,
          files,
          activeFile,
          approvals,
          routingLogs,
          metrics,
          isSimulating: false
        };
      }
      return s;
    }));

    // Load target session states
    setScenario(targetSession.scenario);
    setIsSimulating(targetSession.isSimulating);
    setMessages(targetSession.messages);
    setPlanSteps(targetSession.planSteps);
    setToolLogs(targetSession.toolLogs);
    setSubagents(targetSession.subagents);
    setFiles(targetSession.files);
    setActiveFile(targetSession.activeFile);
    setApprovals(targetSession.approvals);
    setRoutingLogs(targetSession.routingLogs);
    setMetrics(targetSession.metrics);

    setActiveSessionId(targetId);
  };

  const createNewSession = (title?: string) => {
    const newId = Math.random().toString();
    const newSession: Session = {
      id: newId,
      title: title || `Session ${sessions.length + 1}`,
      messages: [],
      scenario: null,
      planSteps: [],
      toolLogs: [],
      subagents: [],
      files: [],
      activeFile: null,
      approvals: [],
      routingLogs: [],
      metrics: {
        tokensUsed: 0,
        durationSec: 0,
        toolCallsCount: 0,
        subagentsCount: 0,
        cost: 0,
      },
      isSimulating: false,
      createdAt: new Date().toLocaleTimeString()
    };

    // Clear timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stopDurationTimer();

    // Save current session state
    const currentId = activeSessionId;
    setSessions(prev => [
      ...prev.map(s => {
        if (s.id === currentId) {
          return {
            ...s,
            messages,
            scenario,
            planSteps,
            toolLogs,
            subagents,
            files,
            activeFile,
            approvals,
            routingLogs,
            metrics,
            isSimulating: false
          };
        }
        return s;
      }),
      newSession
    ]);

    // Set new empty states
    setScenario(null);
    setIsSimulating(false);
    setMessages([]);
    setPlanSteps([]);
    setToolLogs([]);
    setSubagents([]);
    setFiles([]);
    setActiveFile(null);
    setApprovals([]);
    setRoutingLogs([]);
    setMetrics({
      tokensUsed: 0,
      durationSec: 0,
      toolCallsCount: 0,
      subagentsCount: 0,
      cost: 0,
    });

    setActiveSessionId(newId);
    return newId;
  };

  const deleteSession = (id: string) => {
    if (sessions.length <= 1) {
      // If it's the last session, clear it instead of deleting
      resetSimulation();
      const defaultId = 'default-session-id';
      setSessions([{
        id: defaultId,
        title: 'Session 1',
        messages: [],
        scenario: null,
        planSteps: [],
        toolLogs: [],
        subagents: [],
        files: [],
        activeFile: null,
        approvals: [],
        routingLogs: [],
        metrics: {
          tokensUsed: 0,
          durationSec: 0,
          toolCallsCount: 0,
          subagentsCount: 0,
          cost: 0,
        },
        isSimulating: false,
        createdAt: new Date().toLocaleTimeString()
      }]);
      setActiveSessionId(defaultId);
      return;
    }

    // Switch if deleting the active session
    if (activeSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      const targetSession = remaining[0];

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      stopDurationTimer();

      setScenario(targetSession.scenario);
      setIsSimulating(targetSession.isSimulating);
      setMessages(targetSession.messages);
      setPlanSteps(targetSession.planSteps);
      setToolLogs(targetSession.toolLogs);
      setSubagents(targetSession.subagents);
      setFiles(targetSession.files);
      setActiveFile(targetSession.activeFile);
      setApprovals(targetSession.approvals);
      setRoutingLogs(targetSession.routingLogs);
      setMetrics(targetSession.metrics);

      setActiveSessionId(targetSession.id);
    }

    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const renameSession = (id: string, newTitle: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
  };

  // Sync active session changes in sessions array
  useEffect(() => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages,
          scenario,
          planSteps,
          toolLogs,
          subagents,
          files,
          activeFile,
          approvals,
          routingLogs,
          metrics,
          isSimulating
        };
      }
      return s;
    }));
  }, [
    messages,
    scenario,
    planSteps,
    toolLogs,
    subagents,
    files,
    activeFile,
    approvals,
    routingLogs,
    metrics,
    isSimulating
  ]);

  return (
    <AgentContext.Provider
      value={{
        scenario,
        isSimulating,
        messages,
        planSteps,
        toolLogs,
        subagents,
        files,
        activeFile,
        setActiveFile,
        approvals,
        systemMetrics,
        socialBots,
        routingLogs,
        metrics,
        primaryModel,
        setPrimaryModel,
        startSimulation,
        resetSimulation,
        handleApproval,
        sendMessage,
        toggleBotStatus,
        updateBotWebhook,
        clearWorkspace,
        triggerBotBroadcast,
        // Sessions
        sessions,
        activeSessionId,
        switchSession,
        createNewSession,
        deleteSession,
        renameSession,
        isFocusMode,
        setIsFocusMode,
        isSessionListOpen,
        setIsSessionListOpen,
        showDiscordOverlay,
        setShowDiscordOverlay,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
};
