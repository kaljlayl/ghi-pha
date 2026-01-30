import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import type { Notification } from '../types';

const BellIcon = ({ hasUnread }: { hasUnread: boolean }) => (
  <svg
    className={`w-6 h-6 transition-all ${hasUnread ? 'animate-pulse' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  </svg>
);

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

const getPriorityColor = (priority: string): string => {
  switch (priority.toLowerCase()) {
    case 'critical':
      return 'border-ghi-critical/30 bg-ghi-critical/5';
    case 'high':
      return 'border-ghi-warning/30 bg-ghi-warning/5';
    default:
      return 'border-ghi-teal/20 bg-ghi-teal/5';
  }
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications(30000);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Refresh notifications on page navigation
  useEffect(() => {
    refresh();
  }, [location.pathname, refresh]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.action_url) {
      navigate(notification.action_url);
    }

    setIsOpen(false);
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAllAsRead();
  };

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 rounded-xl glass-panel border-ghi-teal/20 hover:border-ghi-teal/50 transition-all group"
      >
        <div className="text-ghi-teal group-hover:text-white transition-colors">
          <BellIcon hasUnread={unreadCount > 0} />
        </div>
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-ghi-critical flex items-center justify-center shadow-[0_0_10px_#FF3131]">
            <span className="text-[10px] font-black text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>
          </div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[600px] overflow-hidden glass-panel rounded-2xl border border-ghi-blue/10 shadow-2xl">
          {/* Header */}
          <div className="p-4 border-b border-ghi-blue/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white tracking-wider uppercase">Notifications</h3>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                {unreadCount} unread
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[9px] font-bold uppercase tracking-wider text-ghi-teal hover:text-white transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
            {loading && (
              <div className="p-8 text-center">
                <div className="text-ghi-teal text-sm font-bold animate-pulse">Loading...</div>
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-slate-500 text-sm">No notifications</p>
              </div>
            )}

            {!loading && notifications.length > 0 && (
              <div className="divide-y divide-ghi-blue/10">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-4 text-left hover:bg-ghi-teal/5 transition-all border-l-4 ${
                      notification.read
                        ? 'border-l-transparent opacity-70'
                        : 'border-l-ghi-teal'
                    } ${getPriorityColor(notification.priority)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-[11px] font-bold text-white truncate">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-ghi-teal shadow-[0_0_6px_#00F2FF] flex-shrink-0"></div>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-600 font-bold uppercase">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {notification.priority !== 'Normal' && (
                            <span
                              className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                                notification.priority === 'Critical'
                                  ? 'bg-ghi-critical/20 text-ghi-critical'
                                  : 'bg-ghi-warning/20 text-ghi-warning'
                              }`}
                            >
                              {notification.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
