import React from 'react';
import { useCrewWebSocket } from '../../lib/api/hooks';
import { Loader2, AlertCircle } from 'lucide-react';

interface CrewExecutionStatusProps {
  crewId: string;
}

export function CrewExecutionStatus({ crewId }: CrewExecutionStatusProps) {
  const { isConnected, isConnecting, error, messages, logs } = useCrewWebSocket(crewId);

  // Get the latest status from messages
  const latestStatus = messages[messages.length - 1]?.status;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {isConnecting && (
          <div className="flex items-center gap-2 text-yellow-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Connecting...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span>{error.message}</span>
          </div>
        )}

        {isConnected && !error && (
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${latestStatus === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <span>{latestStatus || 'Connected'}</span>
          </div>
        )}
      </div>

      {/* Logs section */}
      {logs && logs.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Execution Logs</h3>
          <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="text-sm font-mono text-gray-300">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 