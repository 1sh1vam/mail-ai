import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuthStore, useMailStore } from '@/store';
import { LogOut, RefreshCw } from 'lucide-react';
import { useState, useCallback } from 'react';

interface HeaderProps {
  onRefresh?: () => void;
}

export function Header({ onRefresh }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const { clearFilter, setInboxPage } = useMailStore.getState();
    clearFilter();
    setInboxPage(1);
    onRefresh?.();
    // Brief delay to show animation
    setTimeout(() => setIsRefreshing(false), 500);
  }, [onRefresh]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="flex h-14 items-center justify-end border-b border-border px-4 bg-background gap-3">
      {/* Refresh Button */}
      <Button 
        type="button" 
        variant="ghost" 
        size="icon"
        onClick={handleRefresh}
        disabled={isRefreshing}
        title="Refresh"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>

      {/* User Menu */}
      <span className="text-sm text-muted-foreground hidden sm:block">
        {user?.email}
      </span>
      <Avatar className="h-8 w-8">
        <AvatarImage src={user?.picture} alt={user?.name} />
        <AvatarFallback>{user?.name ? getInitials(user.name) : '?'}</AvatarFallback>
      </Avatar>
      <Button variant="ghost" size="icon" onClick={logout} title="Logout">
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  );
}
