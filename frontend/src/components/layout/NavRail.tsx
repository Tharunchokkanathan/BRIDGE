import React from 'react';
import {
  IconDashboard,
  IconListDetails,
  IconRoute,
  IconShieldCheck,
  IconChartBar,
  IconFileSpreadsheet,
  IconCpu,
  IconFileText,
  IconSettings,
  IconPalette,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from '@tabler/icons-react';

export interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
}

export interface NavRailProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const NAV_ITEMS: NavItem[] = [
  { name: 'Command Center', path: '/command-center', icon: <IconDashboard size={18} /> },
  { name: 'Risk Queue', path: '/risk-queue', icon: <IconListDetails size={18} /> },
  { name: 'Route Optimizer', path: '/route-optimizer', icon: <IconRoute size={18} /> },
  { name: 'Interventions', path: '/interventions', icon: <IconShieldCheck size={18} /> },
  { name: 'Zone Priors', path: '/zone-priors', icon: <IconChartBar size={18} /> },
  { name: 'Batch Scoring', path: '/batch-scoring', icon: <IconFileSpreadsheet size={18} /> },
  { name: 'Model Governance', path: '/model-governance', icon: <IconCpu size={18} /> },
  { name: 'Audit & Disclosures', path: '/audit', icon: <IconFileText size={18} /> },
  { name: 'Settings', path: '/settings', icon: <IconSettings size={18} /> },
  { name: 'Styleguide', path: '/styleguide', icon: <IconPalette size={18} /> },
];

export const NavRail: React.FC<NavRailProps> = ({
  currentPath,
  onNavigate,
  collapsed,
  onToggleCollapse,
}) => {
  const normalizedPath = currentPath === '/' ? '/command-center' : currentPath;

  return (
    <aside
      className={`h-screen bg-[var(--surface)] border-r border-[var(--border)] flex flex-col shrink-0 transition-all duration-150 select-none ${
        collapsed ? 'w-14' : 'w-56'
      }`}
      aria-label="Sidebar Navigation"
    >
      {/* Brand Header */}
      <div className="h-12 border-b border-[var(--border)] flex items-center px-3.5 gap-2.5 overflow-hidden">
        <div className="w-7 h-7 rounded-[3px] bg-[var(--accent)] text-white flex items-center justify-center font-mono text-[13px] font-bold shrink-0 tracking-wider">
          BR
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-semibold text-[13px] text-[var(--ink)] tracking-tight leading-none truncate">
              BRIDGE
            </div>
            <div className="font-mono text-[10px] text-[var(--ink-muted)] leading-none mt-1 truncate">
              Dispatch Desk
            </div>
          </div>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            normalizedPath === item.path ||
            (item.path === '/command-center' && normalizedPath === '/');

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigate(item.path)}
              title={collapsed ? item.name : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-[13px] transition-colors font-medium text-left cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] ${
                isActive
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-muted)]'
              }`}
            >
              <span className={`shrink-0 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)]'}`}>
                {item.icon}
              </span>

              {!collapsed && (
                <span className="truncate flex-1">{item.name}</span>
              )}

              {!collapsed && item.badge && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-[2px] bg-[var(--surface-sunken)] text-[var(--ink-muted)]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Rail Collapse Toggle */}
      <div className="p-2 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 p-1.5 rounded-[4px] text-[12px] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-muted)] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)]"
          title={collapsed ? 'Expand Sidebar ( [ )' : 'Collapse Sidebar ( [ )'}
        >
          {collapsed ? (
            <IconLayoutSidebarLeftExpand size={18} />
          ) : (
            <>
              <IconLayoutSidebarLeftCollapse size={16} />
              <span className="flex-1 text-left">Collapse rail</span>
              <kbd className="font-mono text-[10px] text-[var(--ink-faint)] bg-[var(--surface-sunken)] px-1 rounded-[2px]">
                [
              </kbd>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
