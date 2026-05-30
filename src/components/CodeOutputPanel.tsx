import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAgent, type WorkspaceFile } from '../context/AgentContext';
import { FileText, Terminal, ShieldAlert, FolderOpen, Check, Plus, X } from './Icons';
import './CodeOutputPanel.css';

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  file?: WorkspaceFile;
  fileCount: number;
  folderCount: number;
}

interface DepNode {
  file: WorkspaceFile;
  direction: 'upstream' | 'downstream' | 'selected';
  depth: number;
}

export const CodeOutputPanel: React.FC = () => {
  const { 
    files, 
    setFiles,
    activeFile, 
    setActiveFile, 
    toolLogs, 
    projects, 
    activeProject, 
    addProject, 
    setActiveProject 
  } = useAgent();

  const [activeTab, setActiveTab] = useState<'raw' | 'error' | 'workspace'>('raw');
  const [rawText, setRawText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  
  // VS Code Command Palette style prompt state
  const [showPalette, setShowPalette] = useState<boolean>(false);
  const [paletteQuery, setPaletteQuery] = useState<string>('');

  // Selector 2: Custom Visual File Icon Dropdown (File Detector)
  const [selectedFilterType, setSelectedFilterType] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [filterQuery, setFilterQuery] = useState<string>('');
  // User-injected custom options for Selector 2
  const [customFilterOptions, setCustomFilterOptions] = useState<{ value: string; label: string }[]>([]);

  // Dependency analysis state
  const [selectedDepFile, setSelectedDepFile] = useState<WorkspaceFile | null>(null);
  const [excludedPaths, setExcludedPaths] = useState<Set<string>>(new Set());
  const [showExtraction, setShowExtraction] = useState<boolean>(false);
  const [extractionCopied, setExtractionCopied] = useState<boolean>(false);

  // Show Chain: paths currently chain-highlighted in the tree
  const [chainHighlightPaths, setChainHighlightPaths] = useState<Set<string>>(new Set());
  const [chainRootPath, setChainRootPath] = useState<string | null>(null);

  // Selector 3: Ignore Directories state
  const [ignoredDirs, setIgnoredDirs] = useState<string[]>(['node_modules', '.git', '.system_generated']);
  const [ignoreInput, setIgnoreInput] = useState<string>('');

  // Toggle for Selector 2 & Selector 3 controls visibility
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Hidden file input for webkitdirectory folder loading
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Sync rawText with activeFile content when selected
  useEffect(() => {
    if (activeFile) {
      setRawText(activeFile.content);
    }
  }, [activeFile]);

  // Handle template text initialization
  useEffect(() => {
    if (files.length === 0 && !rawText) {
      setRawText(
        `// Paste your AI-generated code or text output here...\n// Or run one of the simulation scenarios to view workspace modifications.\n\nfunction kioolaAgent() {\n  console.log("Cockpit active & listening...");\n}`
      );
    }
  }, [files, rawText]);

  // Dynamically enrich files with imports if missing on load (handles JS, TS, and Python)
  useEffect(() => {
    let changed = false;
    const enriched = files.map(f => {
      if (f.type === 'code' && f.imports === undefined) {
        const ext = f.path.split('.').pop()?.toLowerCase();
        const imports: string[] = [];
        if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') {
          const importRegex = /import\s+(?:(?:\s*[a-zA-Z0-9_*,\s{}]+\s*from\s+)?['"]([^'"]+)['"])/g;
          let match;
          while ((match = importRegex.exec(f.content)) !== null) {
            if (match[1] && (match[1].startsWith('.') || match[1].startsWith('/'))) {
              imports.push(match[1]);
            }
          }
        } else if (ext === 'py') {
          const lines = f.content.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            const fromMatch = trimmed.match(/^from\s+(\.+[a-zA-Z0-9_\.]*|[a-zA-Z0-9_\.]+)\s+import\s+/);
            if (fromMatch && fromMatch[1]) {
              imports.push(fromMatch[1]);
              continue;
            }
            const importMatch = trimmed.match(/^import\s+([a-zA-Z0-9_\.,\s]+)/);
            if (importMatch && importMatch[1]) {
              const modules = importMatch[1].split(',');
              for (let mod of modules) {
                mod = mod.trim().split(/\s+as\s+/)[0].trim();
                if (mod) imports.push(mod);
              }
            }
          }
        }
        changed = true;
        return { ...f, imports };
      }
      return f;
    });

    if (changed) {
      setFiles(enriched);
    }
  }, [files, setFiles]);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  // Find failed tool logs
  const failedLogs = toolLogs.filter(log => log.status === 'failed');

  // Trigger OS native folder selection dialog
  const handleOpenFolderClick = () => {
    if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  // Read selected directory files and load into workspace directory tree
  const handleDirectorySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const firstFilePath = selectedFiles[0].webkitRelativePath;
    const rootFolderName = firstFilePath.split('/')[0] || 'local-project';

    const loadedFiles: WorkspaceFile[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const relativePath = file.webkitRelativePath;
      
      let type: 'code' | 'text' | 'image' | 'diff' = 'code';
      const ext = relativePath.split('.').pop()?.toLowerCase();
      if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext || '')) {
        type = 'image';
      } else if (['md', 'txt', 'log', 'lock', 'yml', 'yaml'].includes(ext || '')) {
        type = 'text';
      }

      const content = await new Promise<string>((resolve) => {
        if (type === 'image') {
          resolve(`[Binary Image Asset: ${file.name}]`);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve((event.target?.result as string) || '');
        };
        reader.onerror = () => {
          resolve('// Error reading file content');
        };
        reader.readAsText(file);
      });

      const imports: string[] = [];
      if (type === 'code' && (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx')) {
        const importRegex = /import\s+(?:(?:\s*[a-zA-Z0-9_*,\s{}]+\s*from\s+)?['"]([^'"]+)['"])/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          if (match[1] && (match[1].startsWith('.') || match[1].startsWith('/'))) {
            imports.push(match[1]);
          }
        }
      }

      loadedFiles.push({
        path: relativePath,
        content,
        type,
        imports: imports.length > 0 ? imports : undefined
      });
    }

    if (loadedFiles.length > 0) {
      setFiles(loadedFiles);
      addProject(rootFolderName);
      setActiveProject(rootFolderName);
    }
  };

  // Inject typed text as a NEW custom option in Selector 2 dropdown
  const handleInjectFilter = () => {
    const label = filterQuery.trim();
    if (!label) return;
    const value = `custom_${label}`;
    // Don't add duplicates
    if (!customFilterOptions.find(o => o.value === value)) {
      setCustomFilterOptions(prev => [...prev, { value, label }]);
    }
    setSelectedFilterType(value);
    setFilterQuery('');
  };

  // Extract unique folders dynamically from file paths
  const uniqueFolders = useMemo(() => {
    const folders = new Set<string>();
    files.forEach(f => {
      const parts = f.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        folders.add(parts.slice(0, i).join('/'));
      }
    });
    projects.forEach(p => {
      if (p && p.trim() && p !== '/') {
        folders.add(p.trim());
      }
    });
    return Array.from(folders).sort();
  }, [files, projects]);

  const filteredFolders = useMemo(() => {
    if (!paletteQuery.trim()) return uniqueFolders;
    const q = paletteQuery.toLowerCase();
    return uniqueFolders.filter(f => f.toLowerCase().includes(q));
  }, [uniqueFolders, paletteQuery]);

  // ─── Live Match Highlights / Detector Logic ───────────────────────────
  
  // Checks if a specific file matches Selector 2 icon select or text query
  const isFileMatching = useCallback((file: WorkspaceFile): boolean => {
    const hasFilter = selectedFilterType !== 'all' || filterQuery.trim() !== '';
    if (!hasFilter) return false;

    // 1. Custom injected option: match by label text against filename
    if (selectedFilterType.startsWith('custom_')) {
      const customLabel = selectedFilterType.replace(/^custom_/, '').toLowerCase();
      return file.path.toLowerCase().includes(customLabel) || file.content.toLowerCase().includes(customLabel);
    }

    // 2. Match selected file type
    if (selectedFilterType !== 'all') {
      const ext = file.path.split('.').pop()?.toLowerCase();
      let typeMatch = false;
      if (selectedFilterType === 'ts') typeMatch = ext === 'ts' || ext === 'tsx';
      else if (selectedFilterType === 'js') typeMatch = ext === 'js' || ext === 'jsx';
      else if (selectedFilterType === 'css') typeMatch = ext === 'css';
      else if (selectedFilterType === 'html') typeMatch = ext === 'html';
      else if (selectedFilterType === 'json') typeMatch = ext === 'json';
      else if (selectedFilterType === 'img') typeMatch = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext || '');
      else if (selectedFilterType === 'md') typeMatch = ext === 'md' || ext === 'txt';
      
      if (!typeMatch) return false;
    }

    // 3. Match search string
    if (filterQuery.trim()) {
      const q = filterQuery.trim().toLowerCase();
      if (!file.path.toLowerCase().includes(q) && !file.content.toLowerCase().includes(q)) {
        return false;
      }
    }

    return true;
  }, [selectedFilterType, filterQuery, customFilterOptions]);

  // Recursively check if a folder node has any matching descendants
  const checkDescendantMatch = useCallback((node: TreeNode): boolean => {
    if (!node.isFolder) {
      return node.file ? isFileMatching(node.file) : false;
    }
    return node.children.some(child => checkDescendantMatch(child));
  }, [isFileMatching]);

  // ─── Filter files by Active workspace folder & Ignore List ──────────
  const filesInActiveProject = useMemo(() => {
    let result = files;
    if (activeProject) {
      result = files.filter((f) => f.path.startsWith(activeProject));
    }
    if (ignoredDirs.length > 0) {
      result = result.filter((f) => {
        const pathLower = f.path.toLowerCase();
        return !ignoredDirs.some((ignored) => {
          const term = ignored.trim().toLowerCase();
          if (!term) return false;
          // Split path by / to check if directory name matches the term
          const segments = pathLower.split('/');
          return segments.some((seg, idx) => {
            // If it is the last segment, it's the filename itself, not a directory
            if (idx === segments.length - 1) return false;
            return seg === term;
          });
        });
      });
    }
    return result;
  }, [files, activeProject, ignoredDirs]);

  // ─── Dependency Resolution ────────────────────────────────────────────

  const resolveImportPath = useCallback((importPath: string, fromFile: string): WorkspaceFile | undefined => {
    const ext = fromFile.split('.').pop()?.toLowerCase();
    if (ext === 'py') {
      const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/'));
      const fromParts = fromDir.split('/').filter(Boolean);

      // Detect relative dots in python import, e.g. "from ..utils import X" -> "..utils"
      const dotsMatch = importPath.match(/^\.+/);
      if (dotsMatch) {
        const dotCount = dotsMatch[0].length;
        const remainder = importPath.substring(dotCount);
        const remainderPath = remainder.replace(/\./g, '/');

        const resolvedParts = [...fromParts];
        // In python relative import: "." is current folder, ".." is parent folder, etc.
        // Therefore, we pop (dotCount - 1) directories.
        for (let i = 0; i < dotCount - 1; i++) {
          resolvedParts.pop();
        }

        if (remainderPath) {
          resolvedParts.push(remainderPath);
        }
        
        const resolvedPath = resolvedParts.join('/');
        return files.find(f => {
          const fp = f.path.replace(/\\/g, '/');
          return fp === `${resolvedPath}.py` || fp.endsWith(`/${resolvedPath}.py`) || 
                 fp === `${resolvedPath}/__init__.py` || fp.endsWith(`/${resolvedPath}/__init__.py`);
        });
      } else {
        // Absolute import, e.g. "import math" or "from project.sub.module import X"
        const modulePath = importPath.replace(/\./g, '/');
        
        // A. Try relative to fromDir
        const localParts = [...fromParts, modulePath];
        const localPath = localParts.join('/');
        let found = files.find(f => {
          const fp = f.path.replace(/\\/g, '/');
          return fp === `${localPath}.py` || fp.endsWith(`/${localPath}.py`) ||
                 fp === `${localPath}/__init__.py` || fp.endsWith(`/${localPath}/__init__.py`);
        });
        if (found) return found;

        // B. Try absolute from workspace root
        found = files.find(f => {
          const fp = f.path.replace(/\\/g, '/');
          return fp === `${modulePath}.py` || fp.endsWith(`/${modulePath}.py`) ||
                 fp === `${modulePath}/__init__.py` || fp.endsWith(`/${modulePath}/__init__.py`);
        });
        if (found) return found;
      }
      return undefined;
    }

    // Default JS/TS import resolution
    const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/'));
    let resolvedBase = importPath;

    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const fromParts = fromDir.split('/').filter(Boolean);
      const importParts = importPath.split('/');
      const resolved = [...fromParts];

      for (const part of importParts) {
        if (part === '.') continue;
        if (part === '..') { resolved.pop(); continue; }
        resolved.push(part);
      }
      resolvedBase = resolved.join('/');
    }

    return files.find(f => {
      const fBase = f.path.replace(/\.(ts|tsx|js|jsx)$/, '');
      const rBase = resolvedBase.replace(/\.(ts|tsx|js|jsx)$/, '');
      return fBase === rBase || f.path === resolvedBase;
    });
  }, [files]);

  // Build the set of all paths in the import chain of a file (both upstream imports + downstream importers)
  const buildChainPaths = useCallback((file: WorkspaceFile): Set<string> => {
    const visited = new Set<string>();
    const collect = (f: WorkspaceFile) => {
      if (visited.has(f.path)) return;
      visited.add(f.path);
      if (f.imports) {
        for (const imp of f.imports) {
          const target = resolveImportPath(imp, f.path);
          if (target) collect(target);
        }
      }
      // Also find who imports this file (downstream)
      for (const other of files) {
        if (other.path === f.path || visited.has(other.path)) continue;
        if (other.imports?.some(imp => resolveImportPath(imp, other.path)?.path === f.path)) {
          collect(other);
        }
      }
    };
    collect(file);
    return visited;
  }, [files, resolveImportPath]);

  // Toggle "Show Chain" mode for a file node
  const handleShowChain = (file: WorkspaceFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (chainRootPath === file.path) {
      setChainHighlightPaths(new Set());
      setChainRootPath(null);
    } else {
      const paths = buildChainPaths(file);
      setChainHighlightPaths(paths);
      setChainRootPath(file.path);
    }
  };


  const buildDepChain = useCallback((file: WorkspaceFile): DepNode[] => {
    const visited = new Set<string>();
    const chain: DepNode[] = [];

    const collectUpstream = (f: WorkspaceFile, depth: number) => {
      if (!f.imports) return;
      for (const imp of f.imports) {
        const target = resolveImportPath(imp, f.path);
        if (target && !visited.has(target.path)) {
          visited.add(target.path);
          chain.push({ file: target, direction: 'upstream', depth });
          collectUpstream(target, depth + 1);
        }
      }
    };

    const collectDownstream = (f: WorkspaceFile, depth: number) => {
      for (const otherFile of files) {
        if (otherFile.path === f.path || visited.has(otherFile.path)) continue;
        if (otherFile.imports) {
          const importsThis = otherFile.imports.some(imp => {
            const resolved = resolveImportPath(imp, otherFile.path);
            return resolved?.path === f.path;
          });
          if (importsThis) {
            visited.add(otherFile.path);
            chain.push({ file: otherFile, direction: 'downstream', depth });
            collectDownstream(otherFile, depth + 1);
          }
        }
      }
    };

    visited.add(file.path);
    chain.push({ file, direction: 'selected', depth: 0 });
    collectUpstream(file, 1);

    collectDownstream(file, 1);

    return chain;
  }, [files, resolveImportPath]);

  const depChain = useMemo(() => {
    if (!selectedDepFile) return [];
    return buildDepChain(selectedDepFile);
  }, [selectedDepFile, buildDepChain]);

  const toggleExclude = (path: string) => {
    setExcludedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const extractedCode = useMemo(() => {
    return depChain
      .filter(node => !excludedPaths.has(node.file.path))
      .map(node => `// ========== ${node.file.path} ==========\n${node.file.content}`)
      .join('\n\n');
  }, [depChain, excludedPaths]);

  const handleCopyExtraction = () => {
    navigator.clipboard.writeText(extractedCode);
    setExtractionCopied(true);
    setTimeout(() => setExtractionCopied(false), 2000);
  };

  // ─── File Tree Builder ────────────────────────────────────────────────

  const countChildren = (nodes: TreeNode[]): { files: number; folders: number } => {
    let fc = 0, dc = 0;
    for (const n of nodes) {
      if (n.isFolder) {
        dc++;
        const sub = countChildren(n.children);
        fc += sub.files;
        dc += sub.folders;
      } else {
        fc++;
      }
    }
    return { files: fc, folders: dc };
  };

  const buildFileTree = (fileList: WorkspaceFile[]): TreeNode[] => {
    if (fileList.length === 0) return [];

    const root: TreeNode = { name: 'root', path: '', isFolder: true, children: [], fileCount: 0, folderCount: 0 };

    fileList.forEach((file) => {
      let relativePath = file.path;
      if (activeProject && file.path.startsWith(activeProject)) {
        const prefixLength = activeProject.endsWith('/') ? activeProject.length : activeProject.length + 1;
        relativePath = file.path.substring(prefixLength);
      }

      if (!relativePath) return;

      const parts = relativePath.split('/').filter(Boolean);
      let current = root;

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        const currentPath = activeProject 
          ? `${activeProject}/${parts.slice(0, index + 1).join('/')}` 
          : parts.slice(0, index + 1).join('/');

        let existing = current.children.find((c) => c.name === part);

        if (!existing) {
          existing = {
            name: part,
            path: currentPath,
            isFolder: !isLast,
            children: [],
            file: isLast ? file : undefined,
            fileCount: 0,
            folderCount: 0,
          };
          current.children.push(existing);
        }

        current = existing;
      });
    });

    const processTree = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach((node) => {
        if (node.isFolder && node.children.length > 0) {
          processTree(node.children);
          const counts = countChildren(node.children);
          node.fileCount = counts.files;
          node.folderCount = counts.folders;
        }
      });
    };

    processTree(root.children);

    // Render activeProject itself as the visual ROOT parent node in tree, exactly like VS Code!
    if (activeProject) {
      const counts = countChildren(root.children);
      const rootFolderNode: TreeNode = {
        name: activeProject.split('/').pop() || activeProject,
        path: activeProject,
        isFolder: true,
        children: root.children,
        fileCount: counts.files,
        folderCount: counts.folders
      };
      return [rootFolderNode];
    }

    return root.children;
  };

  // ─── Tree Node Renderer ───────────────────────────────────────────────

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isFolderCollapsed = collapsedFolders[node.path];
    const indent = depth * 16;

    // Highlights detector match state
    const isMatch = !node.isFolder && node.file ? isFileMatching(node.file) : false;
    const isDescendantMatch = node.isFolder ? checkDescendantMatch(node) : false;
    const hasAnyActiveFilter = selectedFilterType !== 'all' || filterQuery.trim() !== '';

    // Chain highlight state
    const isChainActive = chainHighlightPaths.size > 0;
    const isInChain = !node.isFolder && node.file ? chainHighlightPaths.has(node.file.path) : false;
    const isChainRoot = !node.isFolder && node.file ? chainRootPath === node.file.path : false;
    // For folders: check if any descendant is in chain
    const hasFolderChainChild = node.isFolder
      ? node.children.some(c => !c.isFolder && c.file && chainHighlightPaths.has(c.file.path))
      : false;

    // Calculate node wrapper class names
    let treeNodeClasses = 'tree-node';
    if (node.isFolder) {
      treeNodeClasses += ' tree-folder';
      if (isChainActive) {
        treeNodeClasses += hasFolderChainChild ? ' chain-folder-match' : ' faded-node';
      } else if (hasAnyActiveFilter) {
        treeNodeClasses += isDescendantMatch ? ' match-highlight folder-match' : ' faded-node';
      }
    } else {
      treeNodeClasses += ' tree-file';
      if (activeFile?.path === node.path) treeNodeClasses += ' active';
      if (selectedDepFile?.path === node.path) treeNodeClasses += ' dep-selected';
      if (isChainActive) {
        if (isChainRoot) treeNodeClasses += ' chain-root-node';
        else if (isInChain) treeNodeClasses += ' chain-link-node';
        else treeNodeClasses += ' faded-node';
      } else if (hasAnyActiveFilter) {
        treeNodeClasses += isMatch ? ' match-highlight file-match' : ' faded-node';
      }
    }

    if (node.isFolder) {
      const directFiles = node.children.filter(c => !c.isFolder).length;
      const directFolders = node.children.filter(c => c.isFolder).length;

      return (
        <div key={node.path} className="tree-node-group">
          <div
            className={treeNodeClasses}
            style={{ paddingLeft: `${indent + 12}px` }}
            onClick={() => toggleFolder(node.path)}
          >
            <span className={`tree-chevron ${isFolderCollapsed ? 'collapsed' : 'expanded'}`}>
              ▼
            </span>
            <FolderOpen size={14} className="tree-folder-icon" />
            <span className="tree-node-name">{node.name}</span>
            {isDescendantMatch && !isChainActive && <span className="detector-match-indicator">MATCH</span>}
            {hasFolderChainChild && isChainActive && <span className="chain-folder-badge">CHAIN</span>}
            <span className="folder-stats-badge">
              {directFiles} file{directFiles !== 1 ? 's' : ''}
              {directFolders > 0 && ` · ${directFolders} dir`}
            </span>
          </div>

          {!isFolderCollapsed && node.children && (
            <div className="tree-children-list">
              {node.children.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div
          key={node.path}
          className={treeNodeClasses}
          style={{ paddingLeft: `${indent + 26}px` }}
          onClick={() => {
            if (node.file) {
              setActiveFile(node.file);
              setActiveTab('raw');
            }
          }}
        >
          <FileText size={14} className="tree-file-icon" />
          <span className="tree-node-name">{node.name}</span>
          {isMatch && !isChainActive && <span className="detector-match-indicator">DETECTED</span>}
          {isChainRoot && <span className="chain-root-badge">ROOT</span>}
          {isInChain && !isChainRoot && <span className="chain-link-badge">CHAIN</span>}
          {node.file && <span className="tree-file-type">{node.file.type}</span>}
          {/* Show Chain button — always visible on any file */}
          {node.file && (
            <button
              className={`show-chain-btn ${isChainRoot ? 'chain-btn-active' : ''}`}
              title={isChainRoot ? 'Clear chain highlight' : 'Show import chain'}
              onClick={(e) => handleShowChain(node.file!, e)}
            >
              {isChainRoot ? '✕ Chain' : '⛓ Chain'}
            </button>
          )}
          {/* Dependency analysis button — show when file has imports */}
          {node.file && (
            <button
              className="dep-analyze-btn"
              title="Open dependency chain panel"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDepFile(node.file!);
                setExcludedPaths(new Set());
                setShowExtraction(false);
              }}
            >
              🔗
            </button>
          )}
        </div>
      );
    }
  };

  const fileTree = buildFileTree(filesInActiveProject);

  // ─── Dependency Chain Direction Color ─────────────────────────────────
  const getDepColor = (dir: string) => {
    switch (dir) {
      case 'selected': return '#06b6d4';
      case 'upstream': return '#8b5cf6';
      case 'downstream': return '#10b981';
      default: return '#64748b';
    }
  };

  const getDepLabel = (dir: string) => {
    switch (dir) {
      case 'selected': return '● SELECTED';
      case 'upstream': return '↑ IMPORTS';
      case 'downstream': return '↓ IMPORTED BY';
      default: return '';
    }
  };

  // ─── Custom Premium File Icon Renderer for Selector 2 ─────────────────
  const renderFileTypeIcon = (type: string, size = 14) => {
    switch (type) {
      case 'all':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="svg-file-icon">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          </svg>
        );
      case 'ts':
        return <span className="file-icon-badge ts-badge">TS</span>;
      case 'js':
        return <span className="file-icon-badge js-badge">JS</span>;
      case 'css':
        return <span className="file-icon-badge css-badge">CSS</span>;
      case 'html':
        return <span className="file-icon-badge html-badge">HTML</span>;
      case 'json':
        return <span className="file-icon-badge json-badge">{}</span>;
      case 'img':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="svg-file-icon">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        );
      case 'md':
        return <span className="file-icon-badge md-badge">MD</span>;
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" className="svg-file-icon">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          </svg>
        );
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Files' },
    { value: 'ts', label: 'TypeScript (.ts, .tsx)' },
    { value: 'js', label: 'JavaScript (.js, .jsx)' },
    { value: 'css', label: 'Stylesheets (.css)' },
    { value: 'html', label: 'Markup (.html)' },
    { value: 'json', label: 'Configuration (.json)' },
    { value: 'img', label: 'Images / Assets' },
    { value: 'md', label: 'Documentation (.md)' },
    ...customFilterOptions, // User-injected options appear at bottom
  ];

  const activeFilterLabel = useMemo(() => {
    return filterOptions.find(o => o.value === selectedFilterType)?.label || 'All Files';
  }, [selectedFilterType]);

  return (
    <div className="code-output-panel-container">
      {/* Native directory/folder input element for loading local files directly */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleDirectorySelect}
        multiple
        style={{ display: 'none' }}
        {...({
          webkitdirectory: '',
          directory: ''
        } as any)}
      />

      {/* VS Code style Command Palette Prompt overlay */}
      {showPalette && (
        <div className="palette-overlay" onClick={() => setShowPalette(false)}>
          <div className="palette-modal" onClick={(e) => e.stopPropagation()}>
            <div className="palette-input-wrapper">
              <FolderOpen size={16} className="palette-input-icon" />
              <input
                type="text"
                className="palette-input"
                placeholder="Type path or select folder to open... (Enter to open, Esc to close)"
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const finalPath = paletteQuery.trim();
                    if (finalPath) {
                      addProject(finalPath);
                      setActiveProject(finalPath);
                    } else {
                      setActiveProject('');
                    }
                    setShowPalette(false);
                    setPaletteQuery('');
                  } else if (e.key === 'Escape') {
                    setShowPalette(false);
                  }
                }}
                autoFocus
              />
              <button className="palette-close-btn" onClick={() => setShowPalette(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="palette-results-list">
              <div 
                className={`palette-result-item ${!activeProject ? 'active' : ''}`}
                onClick={() => {
                  setActiveProject('');
                  setShowPalette(false);
                }}
              >
                <FolderOpen size={14} className="palette-item-icon text-muted" />
                <div className="palette-item-details">
                  <span className="palette-item-name">[All Files]</span>
                  <span className="palette-item-path">Show all workspace files without folder constraint</span>
                </div>
              </div>
              {filteredFolders.map((folder) => (
                <div
                  key={folder}
                  className={`palette-result-item ${activeProject === folder ? 'active' : ''}`}
                  onClick={() => {
                    addProject(folder);
                    setActiveProject(folder);
                    setShowPalette(false);
                    setPaletteQuery('');
                  }}
                >
                  <FolderOpen size={14} className="palette-item-icon neon-cyan-text" />
                  <div className="palette-item-details">
                    <span className="palette-item-name">{folder.split('/').pop() || folder}</span>
                    <span className="palette-item-path">{folder}</span>
                  </div>
                </div>
              ))}
              {paletteQuery.trim() && !uniqueFolders.includes(paletteQuery.trim()) && (
                <div
                  className="palette-result-item create-option"
                  onClick={() => {
                    const finalPath = paletteQuery.trim();
                    addProject(finalPath);
                    setActiveProject(finalPath);
                    setShowPalette(false);
                    setPaletteQuery('');
                  }}
                >
                  <Plus size={14} className="palette-item-icon neon-green-text" />
                  <div className="palette-item-details">
                    <span className="palette-item-name">Open folder: "{paletteQuery.trim()}"</span>
                    <span className="palette-item-path">Add new search target directory to explorer</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Panel Headers / Tabs */}
      <div className="panel-tabs">
        <button
          className={`panel-tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
          onClick={() => setActiveTab('raw')}
        >
          <FileText size={13} />
          <span>Raw Text / Code</span>
        </button>

        <button
          className={`panel-tab-btn error-tab ${activeTab === 'error' ? 'active' : ''}`}
          onClick={() => setActiveTab('error')}
        >
          <ShieldAlert size={13} className={failedLogs.length > 0 ? 'pulse-error' : ''} />
          <span>Errors</span>
          {failedLogs.length > 0 && <span className="error-count-badge">{failedLogs.length}</span>}
        </button>

        <button
          className={`panel-tab-btn ${activeTab === 'workspace' ? 'active' : ''}`}
          onClick={() => setActiveTab('workspace')}
        >
          <FolderOpen size={13} />
          <span>Workspace Directory</span>
          {files.length > 0 && <span className="workspace-count-badge">{files.length}</span>}
        </button>
      </div>

      {/* Panel Body */}
      <div className="panel-tab-content">
        {/* Tab 1: Raw Text / Code */}
        {activeTab === 'raw' && (
          <div className="raw-tab-container">
            <div className="tab-actions-bar">
              <span className="tab-bar-info">
                {activeFile ? `📄 Editing: ${activeFile.path}` : '📝 Code Editor Sandbox'}
              </span>
              <button className="copy-code-btn" onClick={handleCopy}>
                {copied ? <Check size={12} style={{ color: '#10b981' }} /> : null}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="text-editor-workspace">
              <textarea
                className="raw-code-textarea"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste your code or console output here..."
                spellCheck="false"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Errors */}
        {activeTab === 'error' && (
          <div className="errors-tab-container">
            <div className="tab-actions-bar">
              <span className="tab-bar-info">🚨 Tool Execution Failure Log</span>
            </div>
            <div className="text-editor-workspace">
              <textarea
                className="errors-textarea"
                readOnly
                value={
                  failedLogs.length === 0
                    ? "All systems operational. Zero compilation or tool execution failures detected."
                    : failedLogs
                        .map(
                          (log) =>
                            `[${log.timestamp}] Tool Execution Failed: ${log.name}\n` +
                            `Arguments: ${log.args}\n` +
                            `Failure Output:\n${log.output}\n` +
                            `========================================\n`
                        )
                        .join('\n')
                }
                placeholder="No errors reported."
                spellCheck="false"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Workspace Directory */}
        {activeTab === 'workspace' && (
          <div className="workspace-tab-container">
            {/* Code Extraction Full View */}
            {showExtraction ? (
              <div className="code-extraction-view">
                <div className="extraction-header">
                  <div className="extraction-header-left">
                    <button className="extraction-back-btn" onClick={() => setShowExtraction(false)}>
                      ← Back to Tree
                    </button>
                    <span className="extraction-title">
                      📄 Extracted Code ({depChain.filter(n => !excludedPaths.has(n.file.path)).length} files)
                    </span>
                  </div>
                  <button className="copy-code-btn" onClick={handleCopyExtraction}>
                    {extractionCopied ? <Check size={12} style={{ color: '#10b981' }} /> : null}
                    <span>{extractionCopied ? 'Copied!' : 'Copy All'}</span>
                  </button>
                </div>
                <textarea
                  className="extraction-textarea"
                  readOnly
                  value={extractedCode}
                  spellCheck="false"
                />
              </div>
            ) : (
              <>
                {/* Selector 1: Open Folder Select (triggers native file input directory picker + saves path) */}
                <div className="selector-section">
                  <div className="selector-title">
                    <FolderOpen size={12} className="neon-cyan-text" />
                    <span>Selector 1: Active Workspace Folder</span>
                  </div>
                  <div className="project-selector-bar">
                    <div className="project-selector-left">
                      <select
                        className="project-select"
                        value={activeProject}
                        onChange={(e) => setActiveProject(e.target.value)}
                      >
                        <option value="">[All Files] (Root Workspace)</option>
                        {projects.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      className="project-add-btn" 
                      title="Load local folder directly from computer..."
                      onClick={handleOpenFolderClick}
                    >
                      <FolderOpen size={12} />
                      <span>📂 Open Folder...</span>
                    </button>
                  </div>
                </div>

                {/* Toggle button for Selector 2 & Selector 3 */}
                <div className="advanced-toggle-bar">
                  <button 
                    className={`advanced-toggle-btn ${showAdvancedFilters ? 'active' : ''}`}
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    title="Toggle Selector 2 (Live Match Detector) & Selector 3 (Ignore Directory)"
                  >
                    <span className="toggle-btn-label">
                      ⚙️ {showAdvancedFilters ? 'Hide Advanced Options' : 'Show Advanced Options'} (Selector 2 & 3)
                    </span>
                    <span className="toggle-btn-chevron">{showAdvancedFilters ? '▲' : '▼'}</span>
                  </button>
                </div>

                <div className={`advanced-selectors-wrapper ${showAdvancedFilters ? 'expanded' : 'collapsed'}`}>
                  {/* Selector 3: Ignore Directories Selector */}
                  <div className="selector-section">
                    <div className="selector-title">
                      <ShieldAlert size={12} className="neon-red-text" />
                      <span>Selector 3: Ignore Directory Selector</span>
                    </div>
                    <div className="ignore-selector-bar">
                      <div className="ignore-input-wrapper">
                        <input
                          type="text"
                          className="ignore-string-input"
                          value={ignoreInput}
                          onChange={(e) => setIgnoreInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = ignoreInput.trim();
                              if (val && !ignoredDirs.includes(val)) {
                                setIgnoredDirs([...ignoredDirs, val]);
                                setIgnoreInput('');
                              }
                            }
                          }}
                          placeholder="Type folder name to ignore (e.g. dist, temp) & Enter..."
                        />
                        <button
                          className="ignore-add-btn"
                          onClick={() => {
                            const val = ignoreInput.trim();
                            if (val && !ignoredDirs.includes(val)) {
                              setIgnoredDirs([...ignoredDirs, val]);
                              setIgnoreInput('');
                            }
                          }}
                        >
                          Ignore
                        </button>
                      </div>
                    </div>
                    
                    <div className="ignored-tags-container">
                      {ignoredDirs.length > 0 ? (
                        ignoredDirs.map(dir => (
                          <span 
                            key={dir} 
                            className="ignored-tag" 
                            title="Click to stop ignoring this directory" 
                            onClick={() => setIgnoredDirs(ignoredDirs.filter(d => d !== dir))}
                          >
                            <span className="ignored-tag-text">{dir}</span>
                            <span className="ignored-tag-remove">×</span>
                          </span>
                        ))
                      ) : (
                        <span className="no-ignored-text">No directories currently ignored</span>
                      )}
                      {ignoredDirs.length > 0 && (
                        <button className="clear-all-ignored-btn" onClick={() => setIgnoredDirs([])}>
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Selector 2: Custom Visual File Icon Dropdown + Text search / Inject folder path input */}
                  <div className="selector-section">
                    <div className="selector-title">
                      <Terminal size={12} className="neon-purple-text" />
                      <span>Selector 2: Live Match Detector Option</span>
                    </div>
                    <div className="option-filter-bar">
                      {/* Custom Visual React Select showing file type icons */}
                      <div className="custom-dropdown-container">
                        <button
                          className="custom-dropdown-trigger"
                          onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                          title="Select file type to detect"
                        >
                          {renderFileTypeIcon(selectedFilterType, 13)}
                          <span className="dropdown-trigger-text">{activeFilterLabel}</span>
                          <span className="dropdown-trigger-chevron">▼</span>
                        </button>

                        {showFilterDropdown && (
                          <>
                            <div className="custom-dropdown-backdrop" onClick={() => setShowFilterDropdown(false)} />
                            <div className="custom-dropdown-menu">
                              {filterOptions.map((opt) => (
                                <div
                                  key={opt.value}
                                  className={`custom-dropdown-item ${selectedFilterType === opt.value ? 'active' : ''}`}
                                  onClick={() => {
                                    setSelectedFilterType(opt.value);
                                    setShowFilterDropdown(false);
                                  }}
                                >
                                  <span className="item-icon-wrapper">
                                    {renderFileTypeIcon(opt.value, 12)}
                                  </span>
                                  <span className="item-label-text">{opt.label}</span>
                                  {selectedFilterType === opt.value && (
                                    <Check size={12} className="item-checked-icon neon-green-text" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="filter-input-wrapper">
                        <input
                          type="text"
                          className="filter-string-input"
                          value={filterQuery}
                          onChange={(e) => setFilterQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleInjectFilter()}
                          placeholder="Type to detect or inject as option..."
                        />
                        <div className="filter-input-actions">
                          {filterQuery.trim() && (
                            <button 
                              className="filter-inject-btn" 
                              title="Inject as new Selector 2 option"
                              onClick={handleInjectFilter}
                            >
                              <Plus size={11} />
                              <span>Add Option</span>
                            </button>
                          )}
                          {filterQuery && (
                            <button className="filter-clear-btn" onClick={() => setFilterQuery('')} title="Clear text search">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* File Tree */}
                <div className="directory-tree-list">
                  {fileTree.length === 0 ? (
                    <div className="empty-directory-view">
                      <Terminal size={24} style={{ opacity: 0.3 }} />
                      <p>No files generated in current workspace.</p>
                    </div>
                  ) : (
                    fileTree.map((node) => renderTreeNode(node, 0))
                  )}
                </div>

                {/* Dependency Analysis Panel */}
                {selectedDepFile && (
                  <div className="dep-analysis-panel">
                    <div className="dep-panel-header">
                      <span className="dep-panel-title">
                        🔗 Dependency Chain: <strong>{selectedDepFile.path.split('/').pop()}</strong>
                      </span>
                      <div className="dep-panel-actions">
                        <button
                          className="dep-extract-btn"
                          onClick={() => setShowExtraction(true)}
                        >
                          📋 Extract Code
                        </button>
                        <button
                          className="dep-close-btn"
                          onClick={() => { setSelectedDepFile(null); setExcludedPaths(new Set()); }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="dep-chain-list">
                      {depChain.map((node, idx) => {
                        const isExcluded = excludedPaths.has(node.file.path);
                        const prevDir = idx > 0 ? depChain[idx - 1].direction : null;
                        const showDirLabel = node.direction !== prevDir;

                        return (
                          <React.Fragment key={node.file.path}>
                            {showDirLabel && (
                              <div className="dep-direction-label" style={{ color: getDepColor(node.direction) }}>
                                {getDepLabel(node.direction)}
                              </div>
                            )}
                            <div
                              className={`dep-chain-node ${isExcluded ? 'excluded' : ''} ${node.direction}`}
                              style={{ borderLeftColor: getDepColor(node.direction) }}
                            >
                              <label className="dep-node-checkbox-label" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  className="dep-node-checkbox"
                                  checked={!isExcluded}
                                  onChange={() => toggleExclude(node.file.path)}
                                />
                              </label>
                              <FileText size={13} style={{ color: getDepColor(node.direction), flexShrink: 0 }} />
                              <span className="dep-node-path">{node.file.path}</span>
                              {node.file.imports && node.file.imports.length > 0 && (
                                <span className="dep-node-import-count">
                                  {node.file.imports.length} import{node.file.imports.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            {idx < depChain.length - 1 && depChain[idx + 1].direction === node.direction && (
                              <div className="dep-chain-connector" style={{ borderColor: getDepColor(node.direction) }} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    <div className="dep-panel-footer">
                      <span className="dep-summary-text">
                        {depChain.filter(n => !excludedPaths.has(n.file.path)).length} / {depChain.length} files selected
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
