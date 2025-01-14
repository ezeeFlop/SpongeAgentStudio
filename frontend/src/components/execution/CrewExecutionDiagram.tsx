import React from 'react';
import { WebSocketMessage } from '../../lib/api/hooks';
import { Loader2 } from 'lucide-react';

interface CrewExecutionDiagramProps {
  messages: WebSocketMessage[];
  isConnected: boolean;
}

interface TaskOutput {
  description: string;
  agent: string;
  output: {
    raw: string;
    agent: string;
    description: string;
    expected_output: string;
    summary: string;
  };
  status: string | null;
}

export function CrewExecutionDiagram({ messages, isConnected }: CrewExecutionDiagramProps) {
  // Get the latest execution state from messages
  const latestMessage = messages[messages.length - 1];
  const executionState = latestMessage?.payload.data?.execution_state;
  const result = latestMessage?.payload.data?.result;

  // Extract agent and task states
  const agentStates = executionState?.agent_states || {};
  const taskStates = executionState?.task_states || {};
  const currentAgent = executionState?.current_agent;
  const currentTask = executionState?.current_task;

  return (
    <div className="space-y-6">
      {/* Agents Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Agents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(agentStates).map(([agentId, state]) => (
            <div
              key={agentId}
              className={`p-4 rounded-lg border ${
                currentAgent === agentId
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {currentAgent === agentId && state === 'executing' && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                )}
                <span className="font-medium">{agentId}</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {state}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Tasks</h3>
        <div className="grid grid-cols-1 gap-4">
          {Object.entries(taskStates).map(([taskId, state]) => (
            <div
              key={taskId}
              className={`p-4 rounded-lg border ${
                currentTask === taskId
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {currentTask === taskId && state === 'executing' && (
                  <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                )}
                <span className="font-medium">{taskId}</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {state}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Result Section */}
      {result && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Result</h3>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <span className="capitalize">{result.status}</span>
              </div>
              {result.error && (
                <div className="text-red-500">{result.error}</div>
              )}
              {result.output && (
                <div className="space-y-4">
                  <div className="font-medium">Output:</div>
                  <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm">
                    {result.output.raw}
                  </pre>
                  {Object.entries(result.output.tasks).map(([taskDesc, task]) => {
                    const taskOutput = task as TaskOutput;
                    return (
                      <div key={taskDesc} className="border-t pt-4">
                        <div className="font-medium">{taskOutput.agent}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {taskOutput.description}
                        </div>
                        <pre className="mt-2 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm">
                          {taskOutput.output.raw}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 