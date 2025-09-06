import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Activity, X } from "lucide-react";

interface ActionLog {
  id: string;
  action: string;
  timestamp: Date;
  type: 'success' | 'warning' | 'error' | 'info';
}

let actionCounter = 0;
const actionLogs: ActionLog[] = [];

export const logAction = (action: string, type: ActionLog['type'] = 'info') => {
  const newLog: ActionLog = {
    id: `action-${++actionCounter}`,
    action,
    timestamp: new Date(),
    type
  };
  actionLogs.unshift(newLog);
  if (actionLogs.length > 50) {
    actionLogs.pop();
  }
  
  // Trigger custom event to notify components
  window.dispatchEvent(new CustomEvent('actionLogged', { detail: newLog }));
};

export function ActionLogger() {
  const [logs, setLogs] = useState<ActionLog[]>(actionLogs);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleActionLogged = () => {
      setLogs([...actionLogs]);
    };

    window.addEventListener('actionLogged', handleActionLogged);
    return () => window.removeEventListener('actionLogged', handleActionLogged);
  }, []);

  const clearLogs = () => {
    actionLogs.length = 0;
    setLogs([]);
    logAction("Action log cleared", "info");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getTypeColor = (type: ActionLog['type']) => {
    switch (type) {
      case 'success': return 'bg-fleet-active text-fleet-active-foreground';
      case 'warning': return 'bg-fleet-warning text-fleet-warning-foreground';
      case 'error': return 'bg-fleet-danger text-fleet-danger-foreground';
      default: return 'bg-primary text-primary-foreground';
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsVisible(true)}
          className="shadow-lg"
        >
          <Activity className="h-4 w-4 mr-2" />
          Show Actions ({logs.length})
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Live Actions</span>
            <Badge variant="outline" className="text-xs">{logs.length}</Badge>
          </CardTitle>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" onClick={clearLogs}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="max-h-64 overflow-y-auto space-y-2">
          {logs.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No actions yet. Click buttons to see live activity!
            </div>
          ) : (
            logs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-start space-x-2 p-2 border rounded text-xs">
                <Badge className={`${getTypeColor(log.type)} text-xs`}>
                  {log.type}
                </Badge>
                <div className="flex-1 space-y-1">
                  <p className="font-medium">{log.action}</p>
                  <div className="flex items-center space-x-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(log.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
          {logs.length > 10 && (
            <div className="text-xs text-muted-foreground text-center pt-2">
              ... and {logs.length - 10} more actions
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
