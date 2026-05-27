import React, { useState, useRef, useCallback } from 'react';
import { useAgent } from '../context/AgentContext';
import './DiscordBroadcastConsole.css';

// ─── Data Types ──────────────────────────────────────────────────────────────

interface DiscordUser {
  name: string;
  tag: string;
  avatarColor: string;
  isSpeaking?: boolean;
}

interface DiscordVoiceChannel {
  id: string;
  name: string;
  userLimit: number;
  users: DiscordUser[];
  isActive: boolean;
}

interface DiscordTextChannel {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface MessageTemplate {
  id: string;
  label: string;
  emoji: string;
  category: 'deploy' | 'alert' | 'maintenance' | 'announcement' | 'security' | 'custom';
  text: string;
}

interface DiscordRole {
  id: string;
  mention: string;
  label: string;
  color: string;
  description: string;
}

interface MoverUser {
  name: string;
  tag: string;
  avatarColor: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
  activity: Record<string, number>;
}

const mockAllUsers: MoverUser[] = [
  { name: 'KioolaDev', tag: '1337', avatarColor: '#06b6d4', status: 'online', customStatus: '👨‍💻 Cockpit Developer', activity: { 'txt-general': 150, 'txt-announcements': 2, 'vc-gaming': 45 } },
  { name: 'GamerPro', tag: '2026', avatarColor: '#8b5cf6', status: 'online', customStatus: '🎮 Playing Apex', activity: { 'txt-general': 80, 'vc-gaming': 120 } },
  { name: 'AlphaTester', tag: '8888', avatarColor: '#10b981', status: 'idle', customStatus: '🧪 Testing Antigravity', activity: { 'txt-general': 45, 'txt-dev': 90, 'vc-devs': 30 } },
  { name: 'RhythmBot', tag: '9999', avatarColor: '#ef4444', status: 'online', customStatus: '🎵 Listening to Lo-Fi', activity: { 'vc-lofi': 300 } },
  { name: 'CodeNinja', tag: '4242', avatarColor: '#f59e0b', status: 'dnd', customStatus: '🥷 Do Not Disturb', activity: { 'txt-dev': 180, 'vc-devs': 60 } },
  { name: 'SysAdmin', tag: '0001', avatarColor: '#6366f1', status: 'online', customStatus: '⚡ Operations Green', activity: { 'txt-alerts': 140, 'vc-devs': 15 } },
  { name: 'NeonRider', tag: '1010', avatarColor: '#ec4899', status: 'idle', customStatus: '🏍️ Cruising...', activity: { 'txt-general': 8 } },
  { name: 'CyberGhost', tag: '7777', avatarColor: '#f97316', status: 'online', customStatus: '👻 Lurking', activity: { 'txt-general': 5 } }
];

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockVoiceChannels: DiscordVoiceChannel[] = [
  {
    id: 'vc-gaming',
    name: 'Gaming Zone',
    userLimit: 10,
    isActive: true,
    users: [
      { name: 'KioolaDev', tag: '1337', avatarColor: '#06b6d4', isSpeaking: true },
      { name: 'GamerPro', tag: '2026', avatarColor: '#8b5cf6', isSpeaking: false },
      { name: 'AlphaTester', tag: '8888', avatarColor: '#10b981', isSpeaking: true },
    ]
  },
  {
    id: 'vc-lofi',
    name: 'Lo-Fi Chill Lounge',
    userLimit: 5,
    isActive: true,
    users: [
      { name: 'RhythmBot', tag: '9999', avatarColor: '#ef4444', isSpeaking: false }
    ]
  },
  {
    id: 'vc-devs',
    name: 'Dev Huddle',
    userLimit: 8,
    isActive: true,
    users: [
      { name: 'CodeNinja', tag: '4242', avatarColor: '#f59e0b', isSpeaking: true },
      { name: 'SysAdmin', tag: '0001', avatarColor: '#6366f1', isSpeaking: false },
    ]
  },
  {
    id: 'vc-afk',
    name: 'AFK Area',
    userLimit: 99,
    isActive: false,
    users: []
  }
];

const mockTextChannels: DiscordTextChannel[] = [
  { id: 'txt-announcements', name: 'announcements', description: 'Server-wide important updates', isActive: true },
  { id: 'txt-general', name: 'general', description: 'Main server lobby chat', isActive: false },
  { id: 'txt-releases', name: 'release-news', description: 'Build & deploy broadcasts', isActive: true },
  { id: 'txt-dev', name: 'dev-log', description: 'Code check-ins & OS telemetry', isActive: false },
  { id: 'txt-alerts', name: 'alerts', description: 'System alerts & critical pings', isActive: true },
  { id: 'txt-events', name: 'events', description: 'Scheduled events & meetups', isActive: false },
];

const defaultTemplates: MessageTemplate[] = [
  {
    id: 'tpl-deploy',
    label: 'Deploy Success',
    emoji: '🚀',
    category: 'deploy',
    text: '🚀 Build deployed successfully to production! All systems nominal. Version: v1.0.0'
  },
  {
    id: 'tpl-maintenance',
    label: 'Maintenance',
    emoji: '🔧',
    category: 'maintenance',
    text: '@everyone 🔧 Scheduled maintenance in 30 minutes. Please save your progress and expect brief downtime.'
  },
  {
    id: 'tpl-bug',
    label: 'Bug Alert',
    emoji: '🐛',
    category: 'alert',
    text: '@here 🔴 Critical issue detected. Our team is investigating. Updates will follow shortly.'
  },
  {
    id: 'tpl-release',
    label: 'New Release',
    emoji: '🎉',
    category: 'announcement',
    text: '🎉 New release is LIVE! Check the changelog for all the exciting updates and improvements!'
  },
  {
    id: 'tpl-rollback',
    label: 'Rollback',
    emoji: '🔄',
    category: 'alert',
    text: '@admin 🔄 Rollback initiated. Previous stable version restored. ETA for full recovery: 10 minutes.'
  },
  {
    id: 'tpl-tests',
    label: 'Tests Passed',
    emoji: '✅',
    category: 'deploy',
    text: '✅ All unit & integration tests passing! Coverage at 94%. PR is ready to review and merge.'
  },
  {
    id: 'tpl-security',
    label: 'Security Patch',
    emoji: '🛡️',
    category: 'security',
    text: '@admin 🛡️ Security patch applied. Vulnerability resolved. Please review the security advisory.'
  },
  {
    id: 'tpl-downtime',
    label: 'Downtime Notice',
    emoji: '⚠️',
    category: 'announcement',
    text: '⚠️ Planned downtime window: Tonight 02:00–04:00 UTC. Services will be temporarily unavailable.'
  },
  {
    id: 'tpl-update',
    label: 'Server Update',
    emoji: '📦',
    category: 'announcement',
    text: '📦 Server update complete. New features, performance improvements, and bug fixes applied!'
  },
  {
    id: 'tpl-event',
    label: 'Event Alert',
    emoji: '🎮',
    category: 'announcement',
    text: '@events 🎮 Community event starting in 1 hour! Join the voice channel and get ready!'
  },
];

const discordRoles: DiscordRole[] = [
  { id: 'role-everyone', mention: '@everyone', label: 'everyone', color: '#f1f5f9', description: 'Mention all members' },
  { id: 'role-here', mention: '@here', label: 'here', color: '#06b6d4', description: 'Mention online members' },
  { id: 'role-admin', mention: '@admin', label: 'admin', color: '#ef4444', description: 'Server Administrators' },
  { id: 'role-mod', mention: '@moderator', label: 'moderator', color: '#f59e0b', description: 'Server Moderators' },
  { id: 'role-dev', mention: '@developer', label: 'developer', color: '#8b5cf6', description: 'Development Team' },
  { id: 'role-member', mention: '@member', label: 'member', color: '#10b981', description: 'Verified Members' },
  { id: 'role-booster', mention: '@booster', label: 'booster', color: '#ec4899', description: 'Nitro Boosters' },
  { id: 'role-announce', mention: '@announcements', label: 'announcements', color: '#3b82f6', description: 'Announcement subscribers' },
  { id: 'role-events', mention: '@events', label: 'events', color: '#6366f1', description: 'Event participants' },
  { id: 'role-beta', mention: '@beta-tester', label: 'beta-tester', color: '#f97316', description: 'Beta Test group' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const DiscordBroadcastConsole: React.FC = () => {
  const { showDiscordOverlay, setShowDiscordOverlay, updateBotWebhook, triggerBotBroadcast, socialBots } = useAgent();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Core Panels State
  const [activeTab, setActiveTab] = useState<'broadcast' | 'mover' | 'moderation' | 'analytics'>('broadcast');
  const [voiceChannels, setVoiceChannels] = useState<DiscordVoiceChannel[]>(mockVoiceChannels);

  // Broadcast state
  const [selectedChannels, setSelectedChannels] = useState<Record<string, boolean>>({});
  const [broadcastText, setBroadcastText] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>(defaultTemplates);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const discordBot = socialBots.find(b => b.id === 'bot-discord');
  const [webhookUrl, setWebhookUrl] = useState(discordBot?.webhookUrl || '');

  // AI Broadcast Composer state
  const [broadcastMode, setBroadcastMode] = useState<'manual' | 'ai'>('manual');
  const [broadcastPrompt, setBroadcastPrompt] = useState('');
  const [isBroadcastGenerating, setIsBroadcastGenerating] = useState(false);
  const [aiBroadcastDraft, setAiBroadcastDraft] = useState('');

  // VC Mover Configuration state
  const [selectedMoverUser, setSelectedMoverUser] = useState<string>('KioolaDev');
  const [selectedMoverVCs, setSelectedMoverVCs] = useState<Record<string, boolean>>({
    'vc-gaming': true,
    'vc-lofi': true,
    'vc-devs': true,
    'vc-afk': true,
  });
  const [moveInterval, setMoveInterval] = useState<number>(5);
  const [stayDuration, setStayDuration] = useState<number>(3);
  const [isMoverRunning, setIsMoverRunning] = useState<boolean>(false);

  interface MoverLog {
    time: string;
    message: string;
    type: 'info' | 'success' | 'warning';
  }
  const [moverLogs, setMoverLogs] = useState<MoverLog[]>([]);

  // AI Moderation Portal States
  const [modDirectoryTab, setModDirectoryTab] = useState<'active' | 'regular'>('active');
  const [channelThresholds, setChannelThresholds] = useState<Record<string, number>>({
    'txt-general': 15,
    'txt-announcements': 15,
    'txt-releases': 15,
    'txt-dev': 15,
    'txt-alerts': 15,
    'txt-events': 15,
    'vc-gaming': 15,
    'vc-lofi': 15,
    'vc-devs': 15,
    'vc-afk': 15,
  });

  const [selectedModUsers, setSelectedModUsers] = useState<Record<string, boolean>>({ 'GamerPro': true });
  const [modAction, setModAction] = useState<'ban' | 'kick' | 'timeout'>('ban');
  const [timeoutDuration, setTimeoutDuration] = useState<string>('5m');
  const [reasonMode, setReasonMode] = useState<'manual' | 'ai'>('manual');
  const [modReasonInput, setModReasonInput] = useState<string>('');
  const [aiDraftedReason, setAiDraftedReason] = useState<string>('');
  const [isAIGenerating, setIsAIGenerating] = useState<boolean>(false);
  const [bannedUsers, setBannedUsers] = useState<Record<string, 'active' | 'banned' | 'kicked' | 'timeout'>>({});

  // Directory Search States
  const [searchMode, setSearchMode] = useState<'manual' | 'ai'>('manual');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSearchPrompt, setAiSearchPrompt] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiSearchResultUsers, setAiSearchResultUsers] = useState<string[] | null>(null);

  // Chat Monitoring & Analytics States
  interface ChatMessage {
    id: string;
    channelId: string;
    sender: string;
    avatarColor: string;
    text: string;
    timestamp: string;
    isSystem?: boolean;
  }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [mutedChannels, setMutedChannels] = useState<Record<string, boolean>>({});
  const [pinnedChannels, setPinnedChannels] = useState<Record<string, boolean>>({});
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  
  // AFK & Sweeper States
  const [afkInterval, setAfkInterval] = useState<number>(30);
  const [isAfkActive, setIsAfkActive] = useState<boolean>(false);
  const [isBadWordScannerActive, setIsBadWordScannerActive] = useState<boolean>(false);
  
  // DM Gateway States
  const [selectedDmUsers, setSelectedDmUsers] = useState<Record<string, boolean>>({});
  const [dmMode, setDmMode] = useState<'manual' | 'ai'>('manual');
  const [dmText, setDmText] = useState('');
  const [dmPrompt, setDmPrompt] = useState('');
  const [aiDmDraft, setAiDmDraft] = useState('');
  const [isDmGenerating, setIsDmGenerating] = useState(false);
  const [isDmSuccess, setIsDmSuccess] = useState(false);
  
  // User Lifecycle States
  const [welcomeChannelId, setWelcomeChannelId] = useState<string>('txt-general');
  const [leaveChannelId, setLeaveChannelId] = useState<string>('txt-events');
  const [lifecycleReport, setLifecycleReport] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);

  const isRegularUser = (user: MoverUser) => {
    return Object.keys(user.activity).some(channelId => {
      const threshold = channelThresholds[channelId] ?? 15;
      return user.activity[channelId] >= threshold;
    });
  };

  // Reset state when overlay opens
  React.useEffect(() => {
    if (showDiscordOverlay) {
      setSelectedChannels({});
      setBroadcastText('');
      setBroadcastSuccess(false);
      setActiveTemplateId(null);
      setShowSaveTemplate(false);
      setWebhookUrl(discordBot?.webhookUrl || '');

      // Reset AI broadcast composer
      setBroadcastMode('manual');
      setBroadcastPrompt('');
      setIsBroadcastGenerating(false);
      setAiBroadcastDraft('');

      // Reset mover state
      setIsMoverRunning(false);
      setMoverLogs([]);
      setVoiceChannels(mockVoiceChannels);
      setActiveTab('broadcast');

      // Reset moderation state
      setModDirectoryTab('active');
      setChannelThresholds({
        'txt-general': 15,
        'txt-announcements': 15,
        'txt-releases': 15,
        'txt-dev': 15,
        'txt-alerts': 15,
        'txt-events': 15,
        'vc-gaming': 15,
        'vc-lofi': 15,
        'vc-devs': 15,
        'vc-afk': 15,
      });
      setSelectedModUsers({ 'GamerPro': true });
      setModAction('ban');
      setTimeoutDuration('5m');
      setReasonMode('manual');
      setModReasonInput('');
      setAiDraftedReason('');
      setIsAIGenerating(false);
      setBannedUsers({});

      // Reset search states
      setSearchMode('manual');
      setSearchQuery('');
      setAiSearchPrompt('');
      setIsAiSearching(false);
      setAiSearchResultUsers(null);

      // Reset chat analytics states
      setChatMessages([]);
      setMutedChannels({});
      setPinnedChannels({});
      setMessageCounts({});

      // Reset AFK and sweeper states
      setAfkInterval(30);
      setIsAfkActive(false);
      setIsBadWordScannerActive(false);

      // Reset DM gateway states
      setSelectedDmUsers({});
      setDmMode('manual');
      setDmText('');
      setDmPrompt('');
      setAiDmDraft('');
      setIsDmGenerating(false);
      setIsDmSuccess(false);

      // Reset Lifecycle states
      setWelcomeChannelId('txt-general');
      setLeaveChannelId('txt-events');
      setLifecycleReport('');
      setIsGeneratingReport(false);
    }
  }, [showDiscordOverlay, discordBot?.webhookUrl]);

  // VC Mover Simulation Loop
  React.useEffect(() => {
    if (!isMoverRunning) {
      setVoiceChannels(mockVoiceChannels);
      return;
    }

    const checkedVCIds = Object.keys(selectedMoverVCs).filter(id => selectedMoverVCs[id]);
    if (checkedVCIds.length === 0) {
      setMoverLogs(prev => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          message: 'Error: No destination voice channels selected. Simulation aborted.',
          type: 'warning'
        }
      ]);
      setIsMoverRunning(false);
      return;
    }

    const startMsgTime = new Date().toLocaleTimeString();
    setMoverLogs([
      {
        time: startMsgTime,
        message: `Mover: Thread started. Target user: '${selectedMoverUser}'. Move every ${moveInterval}s, stay for ${stayDuration}s.`,
        type: 'info'
      }
    ]);

    let moveIntervalTimer: number;
    let stayTimeoutTimer: number;

    const performMove = () => {
      // Choose random destination
      const destinationId = checkedVCIds[Math.floor(Math.random() * checkedVCIds.length)];
      const targetVC = mockVoiceChannels.find(vc => vc.id === destinationId);
      const targetVCName = targetVC ? targetVC.name : 'Unknown';

      const timestamp = new Date().toLocaleTimeString();
      const userInfo = mockAllUsers.find(u => u.name === selectedMoverUser) || {
        name: selectedMoverUser,
        tag: '0000',
        avatarColor: '#5865f2'
      };

      setMoverLogs(prev => [
        ...prev,
        {
          time: timestamp,
          message: `Mover: Teleporting '${userInfo.name}' to '🔊 ${targetVCName}'. Stay initialized.`,
          type: 'success'
        }
      ]);

      // Move in voiceChannels state
      setVoiceChannels(prevVCs => {
        const removed = prevVCs.map(vc => ({
          ...vc,
          users: vc.users.filter(u => u.name !== selectedMoverUser)
        }));

        return removed.map(vc => {
          if (vc.id === destinationId) {
            return {
              ...vc,
              users: [
                ...vc.users,
                {
                  name: userInfo.name,
                  tag: userInfo.tag,
                  avatarColor: userInfo.avatarColor,
                  isSpeaking: Math.random() > 0.4
                }
              ]
            };
          }
          return vc;
        });
      });

      // Stay duration handling
      if (stayDuration < moveInterval) {
        stayTimeoutTimer = window.setTimeout(() => {
          const leaveTime = new Date().toLocaleTimeString();
          setMoverLogs(prev => [
            ...prev,
            {
              time: leaveTime,
              message: `Mover: '${userInfo.name}' stay duration of ${stayDuration}s reached. Disconnecting...`,
              type: 'info'
            }
          ]);

          // Remove user
          setVoiceChannels(prevVCs =>
            prevVCs.map(vc => ({
              ...vc,
              users: vc.users.filter(u => u.name !== selectedMoverUser)
            }))
          );
        }, stayDuration * 1000);
      }
    };

    // Execute first step immediately
    performMove();

    // Setup interval for subsequent moves
    moveIntervalTimer = window.setInterval(performMove, moveInterval * 1000);

    return () => {
      clearInterval(moveIntervalTimer);
      clearTimeout(stayTimeoutTimer);
    };
  }, [isMoverRunning, moveInterval, stayDuration, selectedMoverUser, selectedMoverVCs]);

  // Scroll to bottom of terminal
  React.useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [moverLogs]);

  // ── AI Broadcast Message Generator ──
  const handleGenerateBroadcast = (autoExecute = false) => {
    if (isBroadcastGenerating) return;
    const prompt = broadcastPrompt.trim() || 'Server announcement';
    setIsBroadcastGenerating(true);
    setAiBroadcastDraft('');

    setTimeout(() => {
      const ts = new Date().toLocaleString();
      const channelList = Object.keys(selectedChannels)
        .filter(k => selectedChannels[k])
        .map(id => {
          const vc = mockVoiceChannels.find(v => v.id === id);
          const tc = mockTextChannels.find(t => t.id === id);
          return vc ? `🔊 ${vc.name}` : tc ? `#${tc.name}` : id;
        })
        .join(', ') || 'all channels';

      const generated = `📡 **[BROADCAST — ${ts}]**

${prompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Composed by Kioola AI Orchestrator
📌 Targets: ${channelList}
⚡ Status: Queued for transmission`;

      setAiBroadcastDraft(generated);
      setBroadcastText(generated);
      setActiveTemplateId(null);
      setIsBroadcastGenerating(false);

      if (autoExecute) {
        const checkedIds = Object.keys(selectedChannels).filter(k => selectedChannels[k]);
        if (checkedIds.length > 0) {
          const names: string[] = [];
          checkedIds.forEach(id => {
            const vc = mockVoiceChannels.find(v => v.id === id);
            if (vc) names.push(`🔊 ${vc.name}`);
            const tc = mockTextChannels.find(t => t.id === id);
            if (tc) names.push(`#${tc.name}`);
          });
          setTimeout(() => {
            triggerBotBroadcast('bot-discord', names, generated);
            setBroadcastSuccess(true);
            setTimeout(() => {
              setBroadcastSuccess(false);
              setBroadcastText('');
              setAiBroadcastDraft('');
              setBroadcastPrompt('');
              setSelectedChannels({});
              setActiveTemplateId(null);
              setShowDiscordOverlay(false);
            }, 1800);
          }, 400);
        }
      }
    }, 1200);
  };

  // ── Directory Search Engine ──
  const getFilteredUsers = (directoryType: 'active' | 'regular' | 'all') => {
    let base = mockAllUsers;
    if (directoryType === 'regular') {
      base = mockAllUsers.filter(u => isRegularUser(u));
    }
    
    if (searchMode === 'manual') {
      if (!searchQuery.trim()) return base;
      const q = searchQuery.toLowerCase().trim().replace(/^@/, '');
      return base.filter(u => u.name.toLowerCase().includes(q) || u.tag.includes(q));
    } else {
      if (aiSearchResultUsers === null) return base;
      return base.filter(u => aiSearchResultUsers.includes(u.name));
    }
  };

  const handleAISearch = () => {
    if (isAiSearching) return;
    const prompt = aiSearchPrompt.toLowerCase().trim();
    if (!prompt) {
      setAiSearchResultUsers(null);
      return;
    }
    setIsAiSearching(true);
    setTimeout(() => {
      let results: string[] = [];
      if (prompt.includes('online')) {
        results = mockAllUsers.filter(u => u.status === 'online').map(u => u.name);
      } else if (prompt.includes('idle')) {
        results = mockAllUsers.filter(u => u.status === 'idle').map(u => u.name);
      } else if (prompt.includes('dnd') || prompt.includes('disturb')) {
        results = mockAllUsers.filter(u => u.status === 'dnd').map(u => u.name);
      } else if (prompt.includes('regular')) {
        results = mockAllUsers.filter(u => isRegularUser(u)).map(u => u.name);
      } else if (prompt.includes('gaming') || prompt.includes('game')) {
        results = mockAllUsers.filter(u => u.activity['vc-gaming'] && u.activity['vc-gaming'] > 0).map(u => u.name);
      } else if (prompt.includes('dev') || prompt.includes('ninjas') || prompt.includes('nin')) {
        results = mockAllUsers.filter(u => (u.activity['txt-dev'] || u.activity['vc-devs'])).map(u => u.name);
      } else {
        results = mockAllUsers.filter(u => 
          u.name.toLowerCase().includes(prompt) || 
          (u.customStatus && u.customStatus.toLowerCase().includes(prompt))
        ).map(u => u.name);
      }
      setAiSearchResultUsers(results);
      setIsAiSearching(false);
    }, 800);
  };

  // ── Chat Activity Simulator Loop ──
  React.useEffect(() => {
    if (!showDiscordOverlay) return;

    const interval = setInterval(() => {
      const allChs = [...mockTextChannels, ...voiceChannels];
      const randCh = allChs[Math.floor(Math.random() * allChs.length)];
      const randUser = mockAllUsers[Math.floor(Math.random() * mockAllUsers.length)];
      const phrases = [
        "Hey everyone, just uploaded the new patch to staging! 🚀",
        "Who is up for some gaming session tonight?",
        "Can anyone look at the failing build log in #dev-log?",
        "System latency looks extremely low, good job team.",
        "Remember to submit your weekly telemetry reports.",
        "Wait, did anyone see that weird spike in gateway ping?",
        "Listening to some lofi tunes while coding, pure bliss 🎧",
        "Is AFK mover active today? I keep getting teleported haha",
        "Let's schedule the community event for this Friday.",
        "Testing the new AI auto-responder module...",
        "Wait, what happened to the database synchronization node?",
        "Is there any downtime expected for tonight's update?"
      ];
      const randText = phrases[Math.floor(Math.random() * phrases.length)];
      
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        channelId: randCh.id,
        sender: randUser.name,
        avatarColor: randUser.avatarColor,
        text: randText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      
      setMessageCounts(prev => ({
        ...prev,
        [randCh.id]: (prev[randCh.id] || 0) + 1
      }));
      setChatMessages(prev => [...prev.slice(-49), newMsg]);

      // Bad Word Scanner Trigger
      if (isBadWordScannerActive) {
        const triggers = ['fail', 'error', 'spike', 'downtime', 'teleport'];
        const wordMatch = triggers.some(t => randText.toLowerCase().includes(t));
        if (wordMatch) {
          setTimeout(() => {
            const warningMsg: ChatMessage = {
              id: `msg-alert-${Date.now()}`,
              channelId: randCh.id,
              sender: 'SYSTEM SECURITY SCANNER',
              avatarColor: '#ef4444',
              text: `🚨 AI ALERT: User '${randUser.name}' triggered alert keyword in chat! Channel: ${randCh.name}. Action logged.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              isSystem: true
            };
            setChatMessages(prev => [...prev.slice(-49), warningMsg]);
          }, 600);
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [showDiscordOverlay, voiceChannels, isBadWordScannerActive]);

  // ── AFK Auto-Presence Loop ──
  React.useEffect(() => {
    if (!showDiscordOverlay || !isAfkActive) return;

    const interval = setInterval(() => {
      const allChs = [...mockTextChannels, ...voiceChannels];
      const randCh = allChs[Math.floor(Math.random() * allChs.length)];
      const afkMessage = `🤖 **[AFK AUTO-REPLY]** Presence verified. Host node is currently inactive. Scanning gateway telemetry...`;
      
      const newMsg: ChatMessage = {
        id: `msg-afk-${Date.now()}`,
        channelId: randCh.id,
        sender: 'KioolaDev',
        avatarColor: '#06b6d4',
        text: afkMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      
      setMessageCounts(prev => ({
        ...prev,
        [randCh.id]: (prev[randCh.id] || 0) + 1
      }));
      setChatMessages(prev => [...prev.slice(-49), newMsg]);
    }, afkInterval * 1000);

    return () => clearInterval(interval);
  }, [showDiscordOverlay, isAfkActive, afkInterval, voiceChannels]);

  // ── DM gateway execution ──
  const handleGenerateDM = () => {
    if (isDmGenerating) return;
    setIsDmGenerating(true);
    setAiDmDraft('');
    
    setTimeout(() => {
      const prompt = dmPrompt.trim() || 'General greeting';
      const draft = `👋 Hello! \nKioola AI Bot here. Regarding your query: "${prompt}". \nPlease note that our system is conducting standard background gateway sweeps. Let us know if you experience any disruptions. \n\nBest,\nKioola Dev Team`;
      setAiDmDraft(draft);
      setDmText(draft);
      setIsDmGenerating(false);
    }, 1000);
  };

  const handleSendDM = async () => {
    const selectedUsersList = Object.keys(selectedDmUsers).filter(k => selectedDmUsers[k]);
    if (selectedUsersList.length === 0) return;
    
    let textToSend = dmMode === 'ai' ? aiDmDraft : dmText.trim();
    if (!textToSend) return;
    
    setIsDmSuccess(true);
    triggerBotBroadcast('bot-discord', selectedUsersList.map(u => `@${u} (DM)`), `📨 DM: ${textToSend}`);
    
    setTimeout(() => {
      setIsDmSuccess(false);
      setDmText('');
      setAiDmDraft('');
      setDmPrompt('');
      setSelectedDmUsers({});
    }, 1800);
  };

  // ── User Lifecycle AI Reporter ──
  const handleGenerateLifecycleReport = () => {
    if (isGeneratingReport) return;
    setIsGeneratingReport(true);
    setLifecycleReport('');
    
    setTimeout(() => {
      const welcomeCh = mockTextChannels.find(t => t.id === welcomeChannelId)?.name || 'general';
      const leaveCh = mockTextChannels.find(t => t.id === leaveChannelId)?.name || 'events';
      
      const report = `📊 DISCORD USER LIFECYCLE AI ANALYSIS REPORT\n===================================================\nGenerated: ${new Date().toLocaleString()}\nMonitoring Config:\n- Welcome Node: #${welcomeCh}\n- Leave Node:   #${leaveCh}\n---------------------------------------------------\n\nSUMMARY OF FINDINGS:\n1. USER ACQUISITION & JOINS:\n   - Evaluated 18 join events on welcome channel #${welcomeCh}.\n   - Onboarding success rate: 94%. Most users successfully assigned @member role.\n   - Initial engagement spike observed within first 15 minutes of registration.\n\n2. DM INTERACTION TELEMETRY:\n   - 12 welcoming DM pings analyzed.\n   - Response rate to initial welcoming query: 42%.\n   - Main topic of inquiry: Bot telemetry controls & voice huddle permissions.\n\n3. CONTEXTUAL BEHAVIOR & DISCONNECTS:\n   - Leaves recorded on leave channel #${leaveCh}: 2.\n   - Average lifespan of inactive accounts before leave event: 14 days.\n   - Correlation scanner indicates leaving users have activity score < 5.\n\nRECOMMENDATIONS:\n- Relocate onboarding questions from #${welcomeCh} to a dedicated setup portal.\n- Auto-assign active developer role to users posting > 10 messages in dev log.\n- Configure automatic DM warning reminders when user activity drops below threshold.`;

      setLifecycleReport(report);
      setIsGeneratingReport(false);
    }, 1500);
  };

  const handleGenerateAIReason = () => {
    if (isAIGenerating) return;
    const selectedList = Object.keys(selectedModUsers).filter(k => selectedModUsers[k]);
    if (selectedList.length === 0) return;
    setIsAIGenerating(true);
    setAiDraftedReason('');

    setTimeout(() => {
      const actionName = modAction.toUpperCase();
      const promptText = modReasonInput.trim() || 'General violation of server policies';
      const durationText = modAction === 'timeout' ? ` Duration: ${timeoutDuration}.` : '';

      const drafted = `⚖️ DISCORD GATEWAY SECURITY COMMISSION
==========================================
OFFICIAL DIRECTIVE FOR SANCTION: ${actionName}
Target Accounts: ${selectedList.join(', ')}
Security Timestamp: ${new Date().toLocaleString()}
System Node: Kioola Orchestrator Agent
------------------------------------------

AI-GENERATED DECISION SUMMARY:
Following a deep telemetry scan of user activity logs, it has been resolved to issue a server-wide ${actionName} to the designated accounts.${durationText}

PROMPT INPUT FOR DETERMINATION:
"${promptText}"

DETAILED SPECIFICATION OF CAUSE:
1. Investigation reveals target accounts did engage in direct breach of server conduct rules, notably: "${promptText}".
2. Contextual indicators outline that this activity was unauthorized, repetitive, and disrupted live OS agent telemetry threads.
3. Automated warning thresholds were crossed; standard network protocols now dictate structural containment.

ENFORCEMENT ACTION STATUS:
The Discord API Webhook has queued this signature. The ban/mute filters will apply immediately upon signature verification.`;

      setAiDraftedReason(drafted);
      setIsAIGenerating(false);
    }, 1000);
  };

  const handleExecuteModAction = () => {
    const selectedList = Object.keys(selectedModUsers).filter(k => selectedModUsers[k]);
    if (selectedList.length === 0) return;

    const actionLabel = modAction === 'ban' ? 'banned' : modAction === 'kick' ? 'kicked' : 'timeout';

    setBannedUsers(prev => {
      const copy = { ...prev };
      selectedList.forEach(user => {
        copy[user] = actionLabel as any;
      });
      return copy;
    });

    let finalReason = reasonMode === 'ai' ? aiDraftedReason : modReasonInput.trim();
    if (!finalReason) {
      finalReason = `Action: ${actionLabel.toUpperCase()} executed manually by Server Controller. No reason specified.`;
    }

    triggerBotBroadcast('bot-discord', ['#alerts'], `🛡️ MODERATION: User(s) [${selectedList.join(', ')}] have been ${actionLabel.toUpperCase()} by Controller. Reason: ${finalReason.split('\n')[0]}`);
  };

  // Insert @role at cursor position in textarea — must be declared BEFORE early return
  const insertRole = useCallback((mention: string) => {
    const el = textareaRef.current;
    if (!el) {
      setBroadcastText(prev => prev + ' ' + mention);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = broadcastText.slice(0, start);
    const after = broadcastText.slice(end);
    const spaceBefore = before.length > 0 && !before.endsWith(' ') ? ' ' : '';
    const spaceAfter = after.length > 0 && !after.startsWith(' ') ? ' ' : '';
    const newText = before + spaceBefore + mention + spaceAfter + after;
    setBroadcastText(newText);
    setTimeout(() => {
      const newPos = start + spaceBefore.length + mention.length + spaceAfter.length;
      el.setSelectionRange(newPos, newPos);
      el.focus();
    }, 0);
  }, [broadcastText]);

  // ── Early return AFTER all hooks ──
  if (!showDiscordOverlay) return null;

  const handleClose = () => setShowDiscordOverlay(false);

  // Apply template
  const applyTemplate = (tpl: MessageTemplate) => {
    setBroadcastText(tpl.text);
    setActiveTemplateId(tpl.id);
    textareaRef.current?.focus();
  };

  // Save current text as new template
  const saveAsTemplate = () => {
    if (!saveTemplateName.trim() || !broadcastText.trim()) return;
    const newTpl: MessageTemplate = {
      id: `tpl-custom-${Date.now()}`,
      label: saveTemplateName.trim(),
      emoji: '📝',
      category: 'custom',
      text: broadcastText.trim(),
    };
    setTemplates(prev => [...prev, newTpl]);
    setSaveTemplateName('');
    setShowSaveTemplate(false);
  };

  // Delete template
  const deleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (activeTemplateId === id) setActiveTemplateId(null);
  };

  const selectedCount = Object.keys(selectedChannels).filter(k => selectedChannels[k]).length;
  const allVCIds = voiceChannels.map(v => v.id);
  const allTCIds = mockTextChannels.map(t => t.id);
  const allIds = [...allVCIds, ...allTCIds];
  const allSelected = allIds.every(id => selectedChannels[id]);

  const handleSelectAll = () => {
    const updated: Record<string, boolean> = {};
    allIds.forEach(id => { updated[id] = !allSelected; });
    setSelectedChannels(updated);
  };

  const handleSend = async () => {
    const checkedIds = Object.keys(selectedChannels).filter(k => selectedChannels[k]);
    if (checkedIds.length === 0 || !broadcastText.trim()) return;
    setIsBroadcasting(true);
    await new Promise(r => setTimeout(r, 1200));
    const names: string[] = [];
    checkedIds.forEach(id => {
      const vc = voiceChannels.find(v => v.id === id);
      if (vc) names.push(`🔊 ${vc.name}`);
      const tc = mockTextChannels.find(t => t.id === id);
      if (tc) names.push(`#${tc.name}`);
    });
    triggerBotBroadcast('bot-discord', names, broadcastText.trim());
    setIsBroadcasting(false);
    setBroadcastSuccess(true);
    setTimeout(() => {
      setBroadcastSuccess(false);
      setBroadcastText('');
      setSelectedChannels({});
      setActiveTemplateId(null);
      setShowDiscordOverlay(false);
    }, 1800);
  };

  const categoryColor: Record<string, string> = {
    deploy: '#10b981',
    alert: '#ef4444',
    maintenance: '#f59e0b',
    announce: '#3b82f6',
    announcement: '#3b82f6',
    security: '#8b5cf6',
    custom: '#06b6d4',
  };

  return (
    <div className="dbc-backdrop" onClick={handleClose}>
      <div className="dbc-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="dbc-header">
          <div className="dbc-header-left">
            <span className="dbc-header-emoji">👾</span>
            <div>
              <h2 className="dbc-header-title">Discord Broadcast Console</h2>
              <span className="dbc-header-sub">Multi-Channel Gateway Controller · {selectedCount} channel{selectedCount !== 1 ? 's' : ''} selected</span>
            </div>
          </div>
          <div className="dbc-header-right">
            {activeTab === 'broadcast' && (
              <button className="dbc-select-all-btn" onClick={handleSelectAll}>
                {allSelected ? '☐ Deselect All' : '☑ Select All'}
              </button>
            )}
            <button className="dbc-close-btn" onClick={handleClose} title="Close">✕</button>
          </div>
        </div>

        {/* ── Webhook bar ── */}
        <div className="dbc-webhook-bar">
          <span className="dbc-webhook-label">🔗 Webhook URL</span>
          <input
            className="dbc-webhook-input"
            type="text"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
          />
          <button className="dbc-webhook-save" onClick={() => { updateBotWebhook('bot-discord', webhookUrl); }}>
            Save
          </button>
        </div>

        {/* ── Navigation Tabs ── */}
        <div className="dbc-tabs">
          <button
            className={`dbc-tab-btn ${activeTab === 'broadcast' ? 'dbc-tab-btn-active' : ''}`}
            onClick={() => setActiveTab('broadcast')}
          >
            <span className="dbc-tab-icon">📡</span> Broadcast Gateway
          </button>
          <button
            className={`dbc-tab-btn ${activeTab === 'mover' ? 'dbc-tab-btn-active' : ''}`}
            onClick={() => setActiveTab('mover')}
          >
            <span className="dbc-tab-icon">🔀</span> VC Channel Mover
            {isMoverRunning && <span className="dbc-mover-live-badge">LIVE</span>}
          </button>
          <button
            className={`dbc-tab-btn ${activeTab === 'moderation' ? 'dbc-tab-btn-active' : ''}`}
            onClick={() => setActiveTab('moderation')}
          >
            <span className="dbc-tab-icon">🛡️</span> AI Moderation Portal
          </button>
          <button
            className={`dbc-tab-btn ${activeTab === 'analytics' ? 'dbc-tab-btn-active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <span className="dbc-tab-icon">📊</span> Chat Analytics & DM Gateway
          </button>
        </div>

        {/* ── Main Tabbed body ── */}
        {activeTab === 'broadcast' ? (
          <div className="dbc-body">

            {/* ─ Left Panel: Channels ─ */}
            <div className="dbc-panel dbc-channels-panel">
              <div className="dbc-panel-header">
                <span>📡 Channels</span>
              </div>

              {/* Voice Channels */}
              <div className="dbc-section-label">
                <span>🔊 VOICE CHANNELS</span>
                <button className="dbc-mini-select-btn" onClick={() => {
                  const updated = { ...selectedChannels };
                  const allVCSelected = allVCIds.every(id => selectedChannels[id]);
                  allVCIds.forEach(id => { updated[id] = !allVCSelected; });
                  setSelectedChannels(updated);
                }}>
                  {allVCIds.every(id => selectedChannels[id]) ? 'None' : 'All'}
                </button>
              </div>

              <div className="dbc-channel-list">
                {voiceChannels.map(vc => {
                  const checked = !!selectedChannels[vc.id];
                  return (
                    <div
                      key={vc.id}
                      className={`dbc-channel-item ${checked ? 'dbc-channel-checked' : ''} ${vc.users.length > 0 ? 'dbc-vc-active' : ''}`}
                      onClick={() => setSelectedChannels(prev => ({ ...prev, [vc.id]: !prev[vc.id] }))}
                    >
                      <div className="dbc-channel-row">
                        <label className="dbc-check-wrap" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={checked}
                            onChange={() => setSelectedChannels(prev => ({ ...prev, [vc.id]: !prev[vc.id] }))} />
                          <span className="dbc-checkmark" />
                        </label>
                        <span className="dbc-ch-icon">🔊</span>
                        <span className="dbc-ch-name">{vc.name}</span>
                        <span className="dbc-ch-count">{vc.users.length}/{vc.userLimit}</span>
                        {vc.users.length > 0 && <span className="dbc-live-dot" />}
                      </div>
                      {vc.users.length > 0 && (
                        <div className="dbc-vc-users">
                          {vc.users.map(u => (
                            <div key={u.tag} className="dbc-vc-user">
                              <span className="dbc-user-av" style={{ background: u.avatarColor }}>
                                {u.name.slice(0, 2).toUpperCase()}
                              </span>
                              <span className="dbc-user-name">{u.name}</span>
                              {u.isSpeaking && (
                                <span className="dbc-wave">
                                  <span /><span /><span />
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Text Channels */}
              <div className="dbc-section-label" style={{ marginTop: '14px' }}>
                <span>💬 TEXT CHANNELS</span>
                <button className="dbc-mini-select-btn" onClick={() => {
                  const updated = { ...selectedChannels };
                  const allTCSelected = allTCIds.every(id => selectedChannels[id]);
                  allTCIds.forEach(id => { updated[id] = !allTCSelected; });
                  setSelectedChannels(updated);
                }}>
                  {allTCIds.every(id => selectedChannels[id]) ? 'None' : 'All'}
                </button>
              </div>

              <div className="dbc-channel-list">
                {mockTextChannels.map(tc => {
                  const checked = !!selectedChannels[tc.id];
                  return (
                    <div
                      key={tc.id}
                      className={`dbc-channel-item dbc-tc-item ${checked ? 'dbc-channel-checked' : ''}`}
                      onClick={() => setSelectedChannels(prev => ({ ...prev, [tc.id]: !prev[tc.id] }))}
                    >
                      <div className="dbc-channel-row">
                        <label className="dbc-check-wrap" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={checked}
                            onChange={() => setSelectedChannels(prev => ({ ...prev, [tc.id]: !prev[tc.id] }))} />
                          <span className="dbc-checkmark" />
                        </label>
                        <span className="dbc-ch-icon">＃</span>
                        <div className="dbc-tc-info">
                          <span className="dbc-ch-name">{tc.name}</span>
                          <span className="dbc-tc-desc">{tc.description}</span>
                        </div>
                        {tc.isActive && <span className="dbc-tc-active-dot" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─ Center Panel: Templates + Composer ─ */}
            <div className="dbc-panel dbc-composer-panel">
              {/* Templates */}
              <div className="dbc-panel-header">
                <span>📋 Message Templates</span>
                <button
                  className="dbc-save-tpl-btn"
                  onClick={() => setShowSaveTemplate(v => !v)}
                  title="Save current text as template"
                >
                  + Save as Template
                </button>
              </div>

              {showSaveTemplate && (
                <div className="dbc-save-tpl-row">
                  <input
                    className="dbc-save-tpl-input"
                    type="text"
                    value={saveTemplateName}
                    onChange={e => setSaveTemplateName(e.target.value)}
                    placeholder="Template name..."
                    onKeyDown={e => { if (e.key === 'Enter') saveAsTemplate(); }}
                  />
                  <button className="dbc-save-tpl-confirm" onClick={saveAsTemplate} disabled={!saveTemplateName.trim() || !broadcastText.trim()}>
                    Save
                  </button>
                </div>
              )}

              <div className="dbc-template-grid">
                {templates.map(tpl => (
                  <div
                    key={tpl.id}
                    className={`dbc-template-card ${activeTemplateId === tpl.id ? 'dbc-tpl-active' : ''}`}
                    style={{ '--cat-color': categoryColor[tpl.category] || '#06b6d4' } as React.CSSProperties}
                    onClick={() => applyTemplate(tpl)}
                    title={tpl.text}
                  >
                    <span className="dbc-tpl-emoji">{tpl.emoji}</span>
                    <span className="dbc-tpl-label">{tpl.label}</span>
                    {tpl.category === 'custom' && (
                      <button className="dbc-tpl-delete" onClick={e => deleteTemplate(tpl.id, e)} title="Delete template">✕</button>
                    )}
                  </div>
                ))}
              </div>

              {/* Composer */}
              <div className="dbc-panel-header" style={{ marginTop: '14px' }}>
                <span>✏️ Compose Message</span>
                <div className="dbc-compose-mode-toggle">
                  <button
                    className={`dbc-mode-btn ${broadcastMode === 'manual' ? 'dbc-mode-btn-active' : ''}`}
                    onClick={() => setBroadcastMode('manual')}
                  >
                    ✍️ Manual
                  </button>
                  <button
                    className={`dbc-mode-btn ${broadcastMode === 'ai' ? 'dbc-mode-btn-active dbc-mode-btn-ai' : ''}`}
                    onClick={() => setBroadcastMode('ai')}
                  >
                    🤖 AI Compose
                  </button>
                </div>
              </div>

              {broadcastMode === 'manual' ? (
                <div className="dbc-compose-area">
                  <textarea
                    ref={textareaRef}
                    className="dbc-textarea"
                    placeholder="Type your broadcast message here, or pick a template above. Click a role on the right to @mention it..."
                    value={broadcastText}
                    onChange={e => { setBroadcastText(e.target.value); setActiveTemplateId(null); }}
                    disabled={isBroadcasting || broadcastSuccess}
                  />
                  {broadcastSuccess && (
                    <div className="dbc-success-overlay">
                      <span className="dbc-success-icon">✅</span>
                      <span>Broadcast Sent Successfully!</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="dbc-ai-compose-area">
                  {/* AI Prompt input */}
                  <div className="dbc-ai-prompt-wrap">
                    <span className="dbc-ai-prompt-label">🧠 Your Prompt</span>
                    <textarea
                      className="dbc-textarea dbc-ai-prompt-textarea"
                      placeholder="Describe your broadcast... e.g. 'Announce server maintenance at midnight tonight for all members'"
                      value={broadcastPrompt}
                      onChange={e => setBroadcastPrompt(e.target.value)}
                      disabled={isBroadcastGenerating || broadcastSuccess}
                      rows={3}
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="dbc-ai-compose-actions">
                    <button
                      className="dbc-ai-gen-btn"
                      onClick={() => handleGenerateBroadcast(false)}
                      disabled={isBroadcastGenerating || !broadcastPrompt.trim() || broadcastSuccess}
                    >
                      {isBroadcastGenerating ? (
                        <><span className="dbc-spinner" /> Composing...</>
                      ) : (
                        <>✨ Generate</>
                      )}
                    </button>
                    <button
                      className="dbc-ai-gen-execute-btn"
                      onClick={() => handleGenerateBroadcast(true)}
                      disabled={isBroadcastGenerating || !broadcastPrompt.trim() || Object.keys(selectedChannels).filter(k => selectedChannels[k]).length === 0 || broadcastSuccess}
                      title={Object.keys(selectedChannels).filter(k => selectedChannels[k]).length === 0 ? 'Select at least one channel first' : 'Generate and broadcast immediately'}
                    >
                      {isBroadcastGenerating ? (
                        <><span className="dbc-spinner" /> Generating & Sending...</>
                      ) : (
                        <>⚡ Generate & Auto-Execute</>
                      )}
                    </button>
                  </div>

                  {/* AI Draft Preview */}
                  {aiBroadcastDraft && !broadcastSuccess && (
                    <div className="dbc-ai-draft-preview">
                      <div className="dbc-ai-draft-header">
                        <span>🤖 AI-Composed Draft</span>
                        <button
                          className="dbc-ai-draft-use-btn"
                          onClick={() => { setBroadcastMode('manual'); }}
                          title="Switch to manual mode to edit this draft"
                        >
                          ✏️ Edit in Manual
                        </button>
                      </div>
                      <pre className="dbc-ai-draft-body">{aiBroadcastDraft}</pre>
                    </div>
                  )}

                  {broadcastSuccess && (
                    <div className="dbc-success-overlay" style={{ position: 'relative', borderRadius: '10px', marginTop: '8px', height: '60px' }}>
                      <span className="dbc-success-icon">✅</span>
                      <span>AI Broadcast Sent Successfully!</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─ Right Panel: Mentionable Roles ─ */}
            <div className="dbc-panel dbc-roles-panel">
              <div className="dbc-panel-header">
                <span>🏷️ Mention Roles</span>
              </div>
              <p className="dbc-roles-hint">Click a role to insert it at cursor position in your message.</p>
              <div className="dbc-roles-list">
                {discordRoles.map(role => (
                  <button
                    key={role.id}
                    className="dbc-role-btn"
                    style={{ '--role-color': role.color } as React.CSSProperties}
                    onClick={() => insertRole(role.mention)}
                    title={role.description}
                  >
                    <span className="dbc-role-at">@</span>
                    <span className="dbc-role-name">{role.label}</span>
                    <span className="dbc-role-desc">{role.description}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        ) : activeTab === 'mover' ? (
          <div className="dbc-body dbc-mover-body">

            {/* ─ Left Panel: Monitors & Voice Channels selection ─ */}
            <div className="dbc-panel dbc-channels-panel">
              <div className="dbc-panel-header">
                <span>📡 Server Monitor & Channels</span>
              </div>

              {/* Monitors dashboard */}
              <div className="dbc-mover-monitors">
                <div className="dbc-monitor-card">
                  <span className="dbc-monitor-icon">🔊</span>
                  <span className="dbc-monitor-label">ACTIVE VCS</span>
                  <span className="dbc-monitor-value">
                    {voiceChannels.filter(vc => vc.users.length > 0).length} / {voiceChannels.length}
                  </span>
                </div>
                <div className="dbc-monitor-card">
                  <span className="dbc-monitor-icon">👥</span>
                  <span className="dbc-monitor-label">IN-VC MEMBERS</span>
                  <span className="dbc-monitor-value">
                    {voiceChannels.reduce((acc, vc) => acc + vc.users.length, 0)}
                  </span>
                </div>
                <div className="dbc-monitor-card">
                  <span className="dbc-monitor-icon">⚡</span>
                  <span className="dbc-monitor-label">GATEWAY PING</span>
                  <span className="dbc-monitor-value dbc-ping-glow">24ms</span>
                </div>
              </div>

              {/* Voice Channels list for Mover */}
              <div className="dbc-section-label" style={{ marginTop: '14px' }}>
                <span>🔊 ELIGIBLE VOICE CHANNELS</span>
                <button className="dbc-mini-select-btn" onClick={() => {
                  const updated: Record<string, boolean> = {};
                  const allVCIds = voiceChannels.map(vc => vc.id);
                  const allMoverVCsSelected = allVCIds.every(id => selectedMoverVCs[id]);
                  allVCIds.forEach(id => { updated[id] = !allMoverVCsSelected; });
                  setSelectedMoverVCs(updated);
                }}>
                  {voiceChannels.map(vc => vc.id).every(id => selectedMoverVCs[id]) ? 'None' : 'All'}
                </button>
              </div>

              <div className="dbc-channel-list">
                {voiceChannels.map(vc => {
                  const checked = !!selectedMoverVCs[vc.id];
                  return (
                    <div
                      key={vc.id}
                      className={`dbc-channel-item ${checked ? 'dbc-channel-checked' : ''} ${vc.users.length > 0 ? 'dbc-vc-active' : ''}`}
                      onClick={() => setSelectedMoverVCs(prev => ({ ...prev, [vc.id]: !prev[vc.id] }))}
                    >
                      <div className="dbc-channel-row">
                        <label className="dbc-check-wrap" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={checked}
                            onChange={() => setSelectedMoverVCs(prev => ({ ...prev, [vc.id]: !prev[vc.id] }))} />
                          <span className="dbc-checkmark" />
                        </label>
                        <span className="dbc-ch-icon">🔊</span>
                        <span className="dbc-ch-name">{vc.name}</span>
                        <span className="dbc-ch-count">{vc.users.length}/{vc.userLimit}</span>
                        {vc.users.length > 0 && <span className="dbc-live-dot" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─ Center Panel: Server Members Directory ─ */}
            <div className="dbc-panel dbc-members-panel">
              <div className="dbc-panel-header">
                <span>👥 Member Directory</span>
                <span className="dbc-char-count">{mockAllUsers.length} total</span>
              </div>
              <p className="dbc-roles-hint">Select a target user to move randomly between channels.</p>

              <div className="dbc-members-list">
                {mockAllUsers.map(user => {
                  const isSelected = selectedMoverUser === user.name;
                  const currentVC = voiceChannels.find(vc => vc.users.some(u => u.name === user.name));

                  return (
                    <div
                      key={user.tag}
                      className={`dbc-member-card ${isSelected ? 'dbc-member-selected' : ''}`}
                      onClick={() => { if (!isMoverRunning) setSelectedMoverUser(user.name); }}
                      style={{ cursor: isMoverRunning ? 'not-allowed' : 'pointer' }}
                      title={isMoverRunning ? "Cannot change target while mover is running" : `Select ${user.name}`}
                    >
                      <div className="dbc-member-av-wrap">
                        <span className="dbc-user-av" style={{ background: user.avatarColor, width: '28px', height: '28px', fontSize: '0.8rem' }}>
                          {user.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className={`dbc-status-badge dbc-status-${user.status}`} />
                      </div>
                      <div className="dbc-member-info">
                        <div className="dbc-member-header-row">
                          <span className="dbc-member-name">{user.name}</span>
                          <span className="dbc-member-tag">#{user.tag}</span>
                        </div>
                        {user.customStatus && <span className="dbc-member-status-text">{user.customStatus}</span>}
                        <span className="dbc-member-vc-loc">
                          {currentVC ? `🔊 Connected: ${currentVC.name}` : 'Disconnected'}
                        </span>
                      </div>
                      <div className="dbc-member-radio">
                        <span className={`dbc-radio-dot ${isSelected ? 'dbc-radio-active' : ''}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─ Right Panel: Mover Configuration & Logs ─ */}
            <div className="dbc-panel dbc-mover-control-panel">
              <div className="dbc-panel-header">
                <span>⚙️ Mover Configuration</span>
              </div>

              <div className="dbc-mover-settings">
                {/* Move Interval Input */}
                <div className="dbc-setting-item">
                  <div className="dbc-setting-info">
                    <span className="dbc-setting-title">Move Interval</span>
                    <span className="dbc-setting-desc">Frequency of teleportation (seconds)</span>
                  </div>
                  <div className="dbc-number-input-wrap">
                    <button
                      className="dbc-num-btn"
                      onClick={() => setMoveInterval(v => Math.max(1, v - 1))}
                      disabled={isMoverRunning}
                    >-</button>
                    <input
                      type="number"
                      className="dbc-num-input"
                      value={moveInterval}
                      onChange={e => setMoveInterval(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={isMoverRunning}
                    />
                    <button
                      className="dbc-num-btn"
                      onClick={() => setMoveInterval(v => v + 1)}
                      disabled={isMoverRunning}
                    >+</button>
                  </div>
                </div>

                {/* Stay Duration Input */}
                <div className="dbc-setting-item">
                  <div className="dbc-setting-info">
                    <span className="dbc-setting-title">Stay Duration</span>
                    <span className="dbc-setting-desc">Time spent in channel (seconds)</span>
                  </div>
                  <div className="dbc-number-input-wrap">
                    <button
                      className="dbc-num-btn"
                      onClick={() => setStayDuration(v => Math.max(1, v - 1))}
                      disabled={isMoverRunning}
                    >-</button>
                    <input
                      type="number"
                      className="dbc-num-input"
                      value={stayDuration}
                      onChange={e => setStayDuration(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={isMoverRunning}
                    />
                    <button
                      className="dbc-num-btn"
                      onClick={() => setStayDuration(v => v + 1)}
                      disabled={isMoverRunning}
                    >+</button>
                  </div>
                </div>

                {/* Start / Stop Toggle Button */}
                <button
                  className={`dbc-mover-btn ${isMoverRunning ? 'dbc-mover-btn-stop' : 'dbc-mover-btn-start'}`}
                  onClick={() => setIsMoverRunning(r => !r)}
                >
                  {isMoverRunning ? (
                    <>
                      <span className="dbc-pulse-ring" />
                      ⏹️ Deactivate VC Mover
                    </>
                  ) : (
                    <>⚡ Activate VC Mover</>
                  )}
                </button>
              </div>

              {/* Scrolling Terminal Activity Log */}
              <div className="dbc-panel-header" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 'auto' }}>
                <span>📟 Live Transmission Log</span>
                {isMoverRunning && (
                  <span className="dbc-mover-live-indicator">
                    TRANSMITTING
                  </span>
                )}
              </div>
              <div className="dbc-terminal-console">
                {moverLogs.length === 0 ? (
                  <div className="dbc-terminal-empty">Console offline. Activate the VC Mover to begin logging real-time voice gateway telemetry...</div>
                ) : (
                  moverLogs.map((log, i) => (
                    <div key={i} className={`dbc-log-line dbc-log-${log.type}`}>
                      <span className="dbc-log-time">[{log.time}]</span>
                      <span className="dbc-log-msg">{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>

          </div>
        ) : activeTab === 'moderation' ? (
          <div className="dbc-body dbc-moderation-body">

            {/* ─ Left Panel: Member Directories ─ */}
            <div className="dbc-panel dbc-channels-panel">
              <div className="dbc-panel-header">
                <span>🛡️ Member Directory</span>
              </div>

              {/* Toggle Directories Button */}
              <div className="dbc-mod-toggle">
                <button
                  className={`dbc-mod-toggle-btn ${modDirectoryTab === 'active' ? 'dbc-mod-toggle-btn-active' : ''}`}
                  onClick={() => setModDirectoryTab('active')}
                >
                  🟢 Active Users
                </button>
                <button
                  className={`dbc-mod-toggle-btn ${modDirectoryTab === 'regular' ? 'dbc-mod-toggle-btn-active' : ''}`}
                  onClick={() => setModDirectoryTab('regular')}
                >
                  ⭐ Regulars
                </button>
              </div>

              {/* Search Box */}
              <div className="dbc-search-container">
                <div className="dbc-search-mode-row">
                  <button 
                    className={`dbc-search-mode-btn ${searchMode === 'manual' ? 'active' : ''}`}
                    onClick={() => { setSearchMode('manual'); setAiSearchResultUsers(null); }}
                  >
                    🔍 Text Search
                  </button>
                  <button 
                    className={`dbc-search-mode-btn ${searchMode === 'ai' ? 'active' : ''}`}
                    onClick={() => setSearchMode('ai')}
                  >
                    🤖 AI Filter
                  </button>
                </div>
                {searchMode === 'manual' ? (
                  <input
                    type="text"
                    className="dbc-search-input"
                    placeholder="Search by name (@...) or tag..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                ) : (
                  <div className="dbc-ai-search-row">
                    <input
                      type="text"
                      className="dbc-search-input"
                      placeholder="Ask AI: e.g. 'find online users'"
                      value={aiSearchPrompt}
                      onChange={e => setAiSearchPrompt(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAISearch(); }}
                    />
                    <button className="dbc-ai-search-btn" onClick={handleAISearch} disabled={isAiSearching}>
                      {isAiSearching ? <span className="dbc-spinner" /> : 'Go'}
                    </button>
                    {aiSearchResultUsers !== null && (
                      <button className="dbc-ai-search-clear" onClick={() => { setAiSearchPrompt(''); setAiSearchResultUsers(null); }} title="Clear Filter">
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="dbc-channel-list" style={{ marginTop: '10px' }}>
                {getFilteredUsers(modDirectoryTab)
                  .map(user => {
                    const isSelected = !!selectedModUsers[user.name];
                    const userStatus = bannedUsers[user.name] || 'active';

                    return (
                      <div
                        key={user.tag}
                        className={`dbc-member-card ${isSelected ? 'dbc-member-selected' : ''} ${userStatus !== 'active' ? 'dbc-member-moderated' : ''}`}
                        onClick={() => setSelectedModUsers(prev => ({ ...prev, [user.name]: !prev[user.name] }))}
                      >
                        <div className="dbc-member-av-wrap">
                          <span className="dbc-user-av" style={{ background: user.avatarColor, width: '24px', height: '24px', fontSize: '0.75rem' }}>
                            {user.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className={`dbc-status-badge dbc-status-${user.status}`} />
                        </div>
                        <div className="dbc-member-info">
                          <div className="dbc-member-header-row">
                            <span className="dbc-member-name" style={{ fontSize: '0.72rem' }}>{user.name}</span>
                            <span className="dbc-member-tag">#{user.tag}</span>
                          </div>
                          <span className="dbc-member-status-text" style={{ fontSize: '0.55rem' }}>
                            {userStatus !== 'active' ? (
                              <span className={`dbc-badge-${userStatus}`}>{userStatus.toUpperCase()}</span>
                            ) : (
                              user.customStatus || 'Active Member'
                            )}
                          </span>
                        </div>
                        <div className="dbc-member-checkbox">
                          <label className="dbc-check-wrap" onClick={e => e.stopPropagation()} style={{ pointerEvents: 'none', margin: 0 }}>
                            <input type="checkbox" checked={isSelected} readOnly />
                            <span className="dbc-checkmark" style={{ borderRadius: '4px' }} />
                          </label>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* ─ Center Panel: Regular Threshold Settings ─ */}
            <div className="dbc-panel dbc-members-panel">
              <div className="dbc-panel-header">
                <span>⚙️ Regular User Settings</span>
              </div>
              <p className="dbc-roles-hint">Define numeric thresholds (messages or minutes). Members exceeding any threshold qualify as a Regular User.</p>

              <div className="dbc-threshold-list" style={{ overflowY: 'auto', flex: 1, padding: '4px 14px 14px' }}>
                <div className="dbc-section-label">💬 TEXT CHANNELS</div>
                {mockTextChannels.map(tc => {
                  const val = channelThresholds[tc.id] ?? 15;
                  return (
                    <div key={tc.id} className="dbc-threshold-item">
                      <div className="dbc-threshold-info">
                        <span className="dbc-ch-name" style={{ fontSize: '0.7rem' }}>＃{tc.name}</span>
                        <span className="dbc-tc-desc" style={{ fontSize: '0.55rem' }}>{tc.description}</span>
                      </div>
                      <div className="dbc-number-input-wrap">
                        <button className="dbc-num-btn" onClick={() => setChannelThresholds(prev => ({ ...prev, [tc.id]: Math.max(1, val - 5) }))}>-</button>
                        <input
                          type="number"
                          className="dbc-num-input"
                          value={val}
                          onChange={e => {
                            const num = Math.max(1, parseInt(e.target.value) || 1);
                            setChannelThresholds(prev => ({ ...prev, [tc.id]: num }));
                          }}
                        />
                        <button className="dbc-num-btn" onClick={() => setChannelThresholds(prev => ({ ...prev, [tc.id]: val + 5 }))}>+</button>
                      </div>
                    </div>
                  );
                })}

                <div className="dbc-section-label" style={{ marginTop: '14px' }}>🔊 VOICE CHANNELS</div>
                {voiceChannels.map(vc => {
                  const val = channelThresholds[vc.id] ?? 15;
                  return (
                    <div key={vc.id} className="dbc-threshold-item">
                      <div className="dbc-threshold-info">
                        <span className="dbc-ch-name" style={{ fontSize: '0.7rem' }}>🔊 {vc.name}</span>
                        <span className="dbc-tc-desc" style={{ fontSize: '0.55rem' }}>Minutes in Voice Channel</span>
                      </div>
                      <div className="dbc-number-input-wrap">
                        <button className="dbc-num-btn" onClick={() => setChannelThresholds(prev => ({ ...prev, [vc.id]: Math.max(1, val - 5) }))}>-</button>
                        <input
                          type="number"
                          className="dbc-num-input"
                          value={val}
                          onChange={e => {
                            const num = Math.max(1, parseInt(e.target.value) || 1);
                            setChannelThresholds(prev => ({ ...prev, [vc.id]: num }));
                          }}
                        />
                        <button className="dbc-num-btn" onClick={() => setChannelThresholds(prev => ({ ...prev, [vc.id]: val + 5 }))}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─ Right Panel: AI Moderation Engine ─ */}
            <div className="dbc-panel dbc-mover-control-panel">
              <div className="dbc-panel-header">
                <span>🛡️ AI Moderation Engine</span>
              </div>

              <div className="dbc-mover-settings" style={{ flex: 1, overflowY: 'auto' }}>
                <div className="dbc-target-display" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <span className="dbc-target-label">Selected Targets:</span>
                  <span className="dbc-target-value" style={{ color: '#cbd5e1', fontWeight: 800, fontSize: '0.7rem', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {Object.keys(selectedModUsers).filter(k => selectedModUsers[k]).length > 0 ? (
                      Object.keys(selectedModUsers).filter(k => selectedModUsers[k]).map(name => {
                        const userStatus = bannedUsers[name];
                        return (
                          <span key={name} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            👑 {name}
                            {userStatus && (
                              <span className={`dbc-badge-${userStatus}`} style={{ fontSize: '0.5rem', padding: '1px 4px', borderRadius: '3px' }}>
                                {userStatus.toUpperCase()}
                              </span>
                            )}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ color: '#64748b' }}>None Selected</span>
                    )}
                  </span>
                </div>

                {/* Moderation Action Chips */}
                <div className="dbc-mod-action-chips">
                  <button
                    className={`dbc-mod-chip ${modAction === 'ban' ? 'dbc-mod-chip-ban' : ''}`}
                    onClick={() => setModAction('ban')}
                  >
                    🚫 Ban
                  </button>
                  <button
                    className={`dbc-mod-chip ${modAction === 'kick' ? 'dbc-mod-chip-kick' : ''}`}
                    onClick={() => setModAction('kick')}
                  >
                    🥾 Kick
                  </button>
                  <button
                    className={`dbc-mod-chip ${modAction === 'timeout' ? 'dbc-mod-chip-timeout' : ''}`}
                    onClick={() => setModAction('timeout')}
                  >
                    ⏳ Timeout
                  </button>
                </div>

                {/* Timeout duration */}
                {modAction === 'timeout' && (
                  <div className="dbc-setting-item">
                    <div className="dbc-setting-info">
                      <span className="dbc-setting-title">Timeout Duration</span>
                    </div>
                    <select
                      className="dbc-webhook-input"
                      style={{ width: '110px', padding: '4px', background: 'black', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px' }}
                      value={timeoutDuration}
                      onChange={e => setTimeoutDuration(e.target.value)}
                    >
                      <option value="60s">60 seconds</option>
                      <option value="5m">5 minutes</option>
                      <option value="1h">1 hour</option>
                      <option value="1d">1 day</option>
                    </select>
                  </div>
                )}

                {/* Reason Mode Selector */}
                <div className="dbc-mod-toggle" style={{ margin: '8px 0' }}>
                  <button
                    className={`dbc-mod-toggle-btn ${reasonMode === 'manual' ? 'dbc-mod-toggle-btn-active' : ''}`}
                    onClick={() => setReasonMode('manual')}
                    style={{ fontSize: '0.62rem' }}
                  >
                    ✍️ Manual Reason
                  </button>
                  <button
                    className={`dbc-mod-toggle-btn ${reasonMode === 'ai' ? 'dbc-mod-toggle-btn-active' : ''}`}
                    onClick={() => setReasonMode('ai')}
                    style={{ fontSize: '0.62rem' }}
                  >
                    🤖 AI Prompt
                  </button>
                </div>

                {/* Reason Input Box */}
                <textarea
                  className="dbc-textarea"
                  style={{ minHeight: '60px', maxHeight: '100px', fontSize: '0.72rem', padding: '8px 12px' }}
                  placeholder={reasonMode === 'manual' ? "Provide reason for moderation action..." : "AI Prompt: e.g. 'repeated spamming of links in #general'"}
                  value={modReasonInput}
                  onChange={e => setModReasonInput(e.target.value)}
                />

                {/* Action buttons */}
                {reasonMode === 'ai' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    <button
                      className="dbc-mover-btn dbc-mover-btn-start"
                      onClick={handleGenerateAIReason}
                      disabled={isAIGenerating || Object.keys(selectedModUsers).filter(k => selectedModUsers[k]).length === 0}
                      style={{ fontSize: '0.72rem', padding: '8px' }}
                    >
                      {isAIGenerating ? (
                        <>
                          <span className="dbc-spinner" /> Drafting Notice...
                        </>
                      ) : (
                        <>🤖 Generate AI Reason</>
                      )}
                    </button>

                    <button
                      className="dbc-mover-btn dbc-mover-btn-stop"
                      onClick={() => {
                        if (isAIGenerating) return;
                        const selectedList = Object.keys(selectedModUsers).filter(k => selectedModUsers[k]);
                        if (selectedList.length === 0) return;
                        setIsAIGenerating(true);
                        setTimeout(() => {
                          const actionName = modAction.toUpperCase();
                          const promptText = modReasonInput.trim() || 'General violation of server policies';
                          const generated = `⚖️ DISCORD GATEWAY SECURITY COMMISSION\n==========================================\nOFFICIAL DIRECTIVE FOR SANCTION: ${actionName}\nTarget Accounts: ${selectedList.join(', ')}\nSecurity Timestamp: ${new Date().toLocaleString()}\nSystem Node: Kioola Orchestrator Agent\n------------------------------------------\n\nAI-GENERATED DECISION SUMMARY:\nFollowing a deep telemetry scan of user activity logs, it has been resolved to issue a server-wide ${actionName} to the designated accounts.\n\nPROMPT INPUT FOR DETERMINATION:\n"${promptText}"\n\nENFORCEMENT STATUS: Cryptographically banned via OS firewall.`;

                          setAiDraftedReason(generated);
                          setIsAIGenerating(false);

                          // Execute
                          setBannedUsers(prev => {
                            const copy = { ...prev };
                            selectedList.forEach(user => {
                              copy[user] = (modAction === 'ban' ? 'banned' : modAction === 'kick' ? 'kicked' : 'timeout') as any;
                            });
                            return copy;
                          });
                          triggerBotBroadcast('bot-discord', ['#alerts'], `🛡️ AI MODERATION: User(s) [${selectedList.join(', ')}] have been ${modAction.toUpperCase()} automatically by AI. Reason: ${promptText}`);
                        }, 1000);
                      }}
                      disabled={isAIGenerating || Object.keys(selectedModUsers).filter(k => selectedModUsers[k]).length === 0}
                      style={{ fontSize: '0.72rem', padding: '8px', background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', boxShadow: '0 4px 12px rgba(168, 85, 247, 0.25)' }}
                    >
                      ⚡ AI Generate & Auto-Execute
                    </button>
                  </div>
                ) : (
                  <button
                    className="dbc-mover-btn dbc-mover-btn-stop"
                    onClick={handleExecuteModAction}
                    disabled={Object.keys(selectedModUsers).filter(k => selectedModUsers[k]).length === 0}
                    style={{ fontSize: '0.72rem', padding: '8px', marginTop: '6px' }}
                  >
                    Execute Moderation Action
                  </button>
                )}

                {/* AI Drafted Reason Notice Card */}
                {reasonMode === 'ai' && aiDraftedReason && (
                  <div className="dbc-ai-notice-box" style={{ marginTop: '12px' }}>
                    <div className="dbc-ai-notice-header">
                      <span>🤖 AI REASON CONTEXT SUMMARY</span>
                    </div>
                    <pre className="dbc-ai-notice-body">{aiDraftedReason}</pre>
                  </div>
                )}

                {/* Revoke/Reset button */}
                {Object.keys(selectedModUsers).filter(k => selectedModUsers[k] && bannedUsers[k] && bannedUsers[k] !== 'active').length > 0 && (
                  <button
                    className="dbc-reset-btn"
                    style={{ width: '100%', marginTop: '12px', borderColor: 'rgba(16, 185, 129, 0.25)', color: '#10b981' }}
                    onClick={() => setBannedUsers(prev => {
                      const copy = { ...prev };
                      Object.keys(selectedModUsers).forEach(k => {
                        if (selectedModUsers[k]) {
                          delete copy[k];
                        }
                      });
                      return copy;
                    })}
                  >
                    🔄 Revoke Disciplinary Action for Selected
                  </button>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="dbc-body dbc-analytics-body">
            
            {/* Left Panel: DM Directory */}
            <div className="dbc-panel dbc-channels-panel">
              <div className="dbc-panel-header">
                <span>📨 DM Member Directory</span>
              </div>
              
              {/* Search Box */}
              <div className="dbc-search-container">
                <div className="dbc-search-mode-row">
                  <button 
                    className={`dbc-search-mode-btn ${searchMode === 'manual' ? 'active' : ''}`}
                    onClick={() => { setSearchMode('manual'); setAiSearchResultUsers(null); }}
                  >
                    🔍 Text Search
                  </button>
                  <button 
                    className={`dbc-search-mode-btn ${searchMode === 'ai' ? 'active' : ''}`}
                    onClick={() => setSearchMode('ai')}
                  >
                    🤖 AI Filter
                  </button>
                </div>
                {searchMode === 'manual' ? (
                  <input
                    type="text"
                    className="dbc-search-input"
                    placeholder="Search by name (@...) or tag..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                ) : (
                  <div className="dbc-ai-search-row">
                    <input
                      type="text"
                      className="dbc-search-input"
                      placeholder="Ask AI: e.g. 'find online users'"
                      value={aiSearchPrompt}
                      onChange={e => setAiSearchPrompt(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAISearch(); }}
                    />
                    <button className="dbc-ai-search-btn" onClick={handleAISearch} disabled={isAiSearching}>
                      {isAiSearching ? <span className="dbc-spinner" /> : 'Go'}
                    </button>
                    {aiSearchResultUsers !== null && (
                      <button className="dbc-ai-search-clear" onClick={() => { setAiSearchPrompt(''); setAiSearchResultUsers(null); }} title="Clear Filter">
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="dbc-channel-list" style={{ marginTop: '10px' }}>
                {getFilteredUsers('all').map(user => {
                  const isSelected = !!selectedDmUsers[user.name];
                  const userStatus = bannedUsers[user.name] || 'active';
                  
                  return (
                    <div
                      key={user.tag}
                      className={`dbc-member-card ${isSelected ? 'dbc-member-selected' : ''} ${userStatus !== 'active' ? 'dbc-member-moderated' : ''}`}
                      onClick={() => setSelectedDmUsers(prev => ({ ...prev, [user.name]: !prev[user.name] }))}
                    >
                      <div className="dbc-member-av-wrap">
                        <span className="dbc-user-av" style={{ background: user.avatarColor, width: '24px', height: '24px', fontSize: '0.75rem' }}>
                          {user.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className={`dbc-status-badge dbc-status-${user.status}`} />
                      </div>
                      <div className="dbc-member-info">
                        <div className="dbc-member-header-row">
                          <span className="dbc-member-name" style={{ fontSize: '0.72rem' }}>{user.name}</span>
                          <span className="dbc-member-tag">#{user.tag}</span>
                        </div>
                        <span className="dbc-member-status-text" style={{ fontSize: '0.55rem' }}>
                          {userStatus !== 'active' ? (
                            <span className={`dbc-badge-${userStatus}`}>{userStatus.toUpperCase()}</span>
                          ) : (
                            user.customStatus || 'Active Member'
                          )}
                        </span>
                      </div>
                      <div className="dbc-member-checkbox">
                        <label className="dbc-check-wrap" onClick={e => e.stopPropagation()} style={{ pointerEvents: 'none', margin: 0 }}>
                          <input type="checkbox" checked={isSelected} readOnly />
                          <span className="dbc-checkmark" style={{ borderRadius: '4px' }} />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Center Panel: Monitoring Dashboard */}
            <div className="dbc-panel dbc-monitor-grid-panel" style={{ flex: 1, minWidth: 0 }}>
              {/* Channel visibility configuration */}
              <div className="dbc-panel-header">
                <span>📡 Live Channel Visibility Config & Pin Panel</span>
              </div>
              <div className="dbc-channel-control-grid">
                {[...mockTextChannels, ...voiceChannels].map(ch => {
                  const isMuted = !!mutedChannels[ch.id];
                  const isPinned = !!pinnedChannels[ch.id];
                  const count = messageCounts[ch.id] || 0;
                  
                  return (
                    <div key={ch.id} className={`dbc-ch-control-card ${isPinned ? 'pinned' : ''} ${isMuted ? 'muted' : ''}`}>
                      <div className="dbc-ch-control-info">
                        <span className="dbc-ch-control-name">
                          {isPinned && '📌 '}{ch.id.startsWith('vc-') ? '🔊' : '＃'} {ch.name}
                        </span>
                        <span className="dbc-ch-control-count">{count} messages stored</span>
                      </div>
                      <div className="dbc-ch-control-actions">
                        <button 
                          className={`dbc-ch-btn-icon ${isPinned ? 'active' : ''}`}
                          onClick={() => setPinnedChannels(prev => ({ ...prev, [ch.id]: !prev[ch.id] }))}
                          title={isPinned ? "Unpin channel" : "Pin channel to top"}
                        >
                          📌
                        </button>
                        <button 
                          className={`dbc-ch-btn-icon ${isMuted ? 'active' : ''}`}
                          onClick={() => setMutedChannels(prev => ({ ...prev, [ch.id]: !prev[ch.id] }))}
                          title={isMuted ? "Unmute channel" : "Mute channel (hide texts)"}
                        >
                          🔕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stored Live Transmission log of all incoming messages */}
              <div className="dbc-panel-header" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <span>📟 Stored Chat Transmissions (Excluding Muted)</span>
              </div>
              <div className="dbc-analytics-logger">
                {/* Pinned Messages sitting at the top */}
                {chatMessages
                  .filter(msg => pinnedChannels[msg.channelId] && !mutedChannels[msg.channelId])
                  .map(msg => (
                    <div key={`pinned-${msg.id}`} className="dbc-log-msg-bubble pinned-bubble">
                      <span className="dbc-pinned-indicator">📌 PINNED</span>
                      <div className="dbc-log-msg-header">
                        <span className="dbc-log-msg-av" style={{ background: msg.avatarColor }}>
                          {msg.sender.slice(0,2).toUpperCase()}
                        </span>
                        <span className="dbc-log-msg-sender">{msg.sender}</span>
                        <span className="dbc-log-msg-time">[{msg.timestamp}]</span>
                        <span className="dbc-log-msg-ch">in {msg.channelId.startsWith('vc-') ? '🔊' : '＃'}{mockTextChannels.find(t => t.id === msg.channelId)?.name || voiceChannels.find(v => v.id === msg.channelId)?.name || 'channel'}</span>
                      </div>
                      <p className="dbc-log-msg-text">{msg.text}</p>
                    </div>
                  ))
                }
                
                {/* Standard Messages */}
                {chatMessages
                  .filter(msg => !mutedChannels[msg.channelId])
                  .map(msg => (
                    <div key={msg.id} className={`dbc-log-msg-bubble ${msg.isSystem ? 'system-bubble' : ''}`}>
                      <div className="dbc-log-msg-header">
                        <span className="dbc-log-msg-av" style={{ background: msg.avatarColor }}>
                          {msg.sender.slice(0,2).toUpperCase()}
                        </span>
                        <span className="dbc-log-msg-sender">{msg.sender}</span>
                        <span className="dbc-log-msg-time">[{msg.timestamp}]</span>
                        <span className="dbc-log-msg-ch">in {msg.channelId.startsWith('vc-') ? '🔊' : '＃'}{mockTextChannels.find(t => t.id === msg.channelId)?.name || voiceChannels.find(v => v.id === msg.channelId)?.name || 'channel'}</span>
                      </div>
                      <p className="dbc-log-msg-text">{msg.text}</p>
                    </div>
                  ))
                }
                {chatMessages.filter(msg => !mutedChannels[msg.channelId]).length === 0 && (
                  <div className="dbc-terminal-empty">No activity packets received yet... Incoming simulated chats will display here.</div>
                )}
              </div>
            </div>

            {/* Right Panel: Settings, DMs & Lifecycle */}
            <div className="dbc-panel dbc-mover-control-panel">
              <div className="dbc-panel-header">
                <span>⚙️ AFK & Bot Automation Settings</span>
              </div>
              <div className="dbc-mover-settings" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {/* AFK switch */}
                <div className="dbc-setting-item">
                  <div className="dbc-setting-info">
                    <span className="dbc-setting-title">AFK Mode Auto-Text</span>
                    <span className="dbc-setting-desc">Spawns periodic replies to keep server active</span>
                  </div>
                  <label className="dbc-check-wrap">
                    <input type="checkbox" checked={isAfkActive} onChange={e => setIsAfkActive(e.target.checked)} />
                    <span className="dbc-checkmark" style={{ borderRadius: '4px' }} />
                  </label>
                </div>

                {/* AFK interval */}
                <div className="dbc-setting-item">
                  <div className="dbc-setting-info">
                    <span className="dbc-setting-title">AFK Interval (s)</span>
                  </div>
                  <div className="dbc-number-input-wrap">
                    <button className="dbc-num-btn" onClick={() => setAfkInterval(v => Math.max(5, v - 5))} disabled={!isAfkActive}>-</button>
                    <input
                      type="number"
                      className="dbc-num-input"
                      value={afkInterval}
                      onChange={e => setAfkInterval(Math.max(5, parseInt(e.target.value) || 5))}
                      disabled={!isAfkActive}
                    />
                    <button className="dbc-num-btn" onClick={() => setAfkInterval(v => v + 5)} disabled={!isAfkActive}>+</button>
                  </div>
                </div>

                {/* Bad word scanner switch */}
                <div className="dbc-setting-item">
                  <div className="dbc-setting-info">
                    <span className="dbc-setting-title">AI Bad Word Scanner</span>
                    <span className="dbc-setting-desc">Sweeps chat logs and logs SYSTEM security warnings</span>
                  </div>
                  <label className="dbc-check-wrap">
                    <input type="checkbox" checked={isBadWordScannerActive} onChange={e => setIsBadWordScannerActive(e.target.checked)} />
                    <span className="dbc-checkmark" style={{ borderRadius: '4px' }} />
                  </label>
                </div>
              </div>

              {/* User Lifecycle settings */}
              <div className="dbc-panel-header">
                <span>📊 User Lifecycle AI Reporter</span>
              </div>
              <div className="dbc-mover-settings" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div className="dbc-setting-item">
                  <div className="dbc-setting-info">
                    <span className="dbc-setting-title">Welcome Ch</span>
                  </div>
                  <select 
                    className="dbc-webhook-input" 
                    style={{ width: '130px', padding: '4px', background: 'black', border: '1px solid rgba(255,255,255,0.08)' }}
                    value={welcomeChannelId} 
                    onChange={e => setWelcomeChannelId(e.target.value)}
                  >
                    {mockTextChannels.map(tc => <option key={tc.id} value={tc.id}>#{tc.name}</option>)}
                  </select>
                </div>

                <div className="dbc-setting-item">
                  <div className="dbc-setting-info">
                    <span className="dbc-setting-title">Leave Ch</span>
                  </div>
                  <select 
                    className="dbc-webhook-input" 
                    style={{ width: '130px', padding: '4px', background: 'black', border: '1px solid rgba(255,255,255,0.08)' }}
                    value={leaveChannelId} 
                    onChange={e => setLeaveChannelId(e.target.value)}
                  >
                    {mockTextChannels.map(tc => <option key={tc.id} value={tc.id}>#{tc.name}</option>)}
                  </select>
                </div>

                <button className="dbc-mover-btn dbc-mover-btn-start" onClick={handleGenerateLifecycleReport} disabled={isGeneratingReport}>
                  {isGeneratingReport ? <><span className="dbc-spinner" /> Analyzing Logs...</> : <>⚡ Run Lifecycle Analysis</>}
                </button>

                {lifecycleReport && (
                  <div className="dbc-ai-notice-box" style={{ marginTop: '8px' }}>
                    <div className="dbc-ai-notice-header">
                      <span>🤖 USER LIFECYCLE AI REPORT</span>
                    </div>
                    <pre className="dbc-ai-notice-body" style={{ maxHeight: '150px', overflowY: 'auto' }}>{lifecycleReport}</pre>
                  </div>
                )}
              </div>

              {/* DM gateway compose */}
              <div className="dbc-panel-header">
                <span>✉️ DM Gateway Composer</span>
              </div>
              <div className="dbc-mover-settings" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="dbc-target-display" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                  <span className="dbc-target-label">Send DM Target List:</span>
                  <span className="dbc-target-value" style={{ color: '#cbd5e1', fontWeight: 800, fontSize: '0.65rem' }}>
                    {Object.keys(selectedDmUsers).filter(k => selectedDmUsers[k]).length > 0 ? (
                      Object.keys(selectedDmUsers).filter(k => selectedDmUsers[k]).join(', ')
                    ) : 'None Selected'}
                  </span>
                </div>

                <div className="dbc-mod-toggle">
                  <button className={`dbc-mod-toggle-btn ${dmMode === 'manual' ? 'dbc-mod-toggle-btn-active' : ''}`} onClick={() => setDmMode('manual')} style={{ fontSize: '0.62rem' }}>
                    ✍️ Manual DM
                  </button>
                  <button className={`dbc-mod-toggle-btn ${dmMode === 'ai' ? 'dbc-mod-toggle-btn-active' : ''}`} onClick={() => setDmMode('ai')} style={{ fontSize: '0.62rem' }}>
                    🤖 AI Draft DM
                  </button>
                </div>

                {dmMode === 'manual' ? (
                  <textarea
                    className="dbc-textarea"
                    style={{ minHeight: '60px', maxHeight: '100px', fontSize: '0.7rem' }}
                    placeholder="Type private message to send to targets..."
                    value={dmText}
                    onChange={e => setDmText(e.target.value)}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <textarea
                      className="dbc-textarea"
                      style={{ minHeight: '50px', maxHeight: '80px', fontSize: '0.7rem' }}
                      placeholder="Prompt: e.g. 'welcome new booster to community channel'"
                      value={dmPrompt}
                      onChange={e => setDmPrompt(e.target.value)}
                    />
                    <button className="dbc-mover-btn dbc-mover-btn-start" onClick={handleGenerateDM} disabled={isDmGenerating || !dmPrompt.trim()}>
                      {isDmGenerating ? <><span className="dbc-spinner" /> Drafting...</> : <>🤖 Generate DM</>}
                    </button>
                    {aiDmDraft && (
                      <div className="dbc-ai-notice-box" style={{ marginTop: '4px' }}>
                        <pre className="dbc-ai-notice-body" style={{ maxHeight: '80px', overflowY: 'auto' }}>{aiDmDraft}</pre>
                      </div>
                    )}
                  </div>
                )}

                <button
                  className="dbc-mover-btn dbc-mover-btn-stop"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)', marginTop: 'auto' }}
                  onClick={handleSendDM}
                  disabled={Object.keys(selectedDmUsers).filter(k => selectedDmUsers[k]).length === 0 || (dmMode === 'manual' ? !dmText.trim() : !aiDmDraft)}
                >
                  {isDmSuccess ? '✅ DMs Sent!' : `🚀 Send DM to ${Object.keys(selectedDmUsers).filter(k => selectedDmUsers[k]).length} user(s)`}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ── Footer: Stats + Send ── */}
        {activeTab === 'broadcast' && (
          <div className="dbc-footer">
            <div className="dbc-footer-left">
              <div className="dbc-footer-stats">
                <span className="dbc-stat">
                  <span className="dbc-stat-num" style={{ color: '#06b6d4' }}>{selectedCount}</span>
                  <span className="dbc-stat-label">selected</span>
                </span>
                <span className="dbc-stat-div" />
                <span className="dbc-stat">
                  <span className="dbc-stat-num" style={{ color: '#8b5cf6' }}>
                    {Object.keys(selectedChannels).filter(k => selectedChannels[k] && allVCIds.includes(k)).length}
                  </span>
                  <span className="dbc-stat-label">voice</span>
                </span>
                <span className="dbc-stat-div" />
                <span className="dbc-stat">
                  <span className="dbc-stat-num" style={{ color: '#10b981' }}>
                    {Object.keys(selectedChannels).filter(k => selectedChannels[k] && allTCIds.includes(k)).length}
                  </span>
                  <span className="dbc-stat-label">text</span>
                </span>
              </div>
              <button className="dbc-reset-btn" onClick={() => setSelectedChannels({})}>Reset Selection</button>
            </div>

            <div className="dbc-footer-right">
              <button className="dbc-clear-btn" onClick={() => { setBroadcastText(''); setActiveTemplateId(null); }}>
                Clear Message
              </button>
              <button
                className={`dbc-send-btn ${broadcastSuccess ? 'dbc-send-success' : ''}`}
                disabled={isBroadcasting || broadcastSuccess || !broadcastText.trim() || selectedCount === 0}
                onClick={handleSend}
              >
                {isBroadcasting ? (
                  <>
                    <span className="dbc-spinner" />
                    Transmitting to {selectedCount} channel{selectedCount !== 1 ? 's' : ''}...
                  </>
                ) : broadcastSuccess ? (
                  '✅ Broadcast Sent!'
                ) : (
                  `🚀 Send to ${selectedCount > 0 ? selectedCount : '—'} Channel${selectedCount !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
