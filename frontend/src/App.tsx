import { Routes, Route } from 'react-router-dom'
import { BrowserRouter as Router } from 'react-router-dom'
import { Providers } from './providers'
import MainLayout from '@/components/layouts/MainLayout'
import Dashboard from '@/pages/Dashboard'
import AgentList from '@/pages/agents/AgentList'
import AgentEditor from '@/components/editors/AgentEditor'
import CrewList from '@/pages/crews/CrewList'
import CrewEditor from '@/components/editors/CrewEditor'
import TaskList from '@/pages/tasks/TaskList'
import TaskEditor from '@/components/editors/TaskEditor'
import Execution from '@/pages/Execution'
import Monitoring from '@/pages/Monitoring'
import Settings from '@/pages/Settings'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'
import { Toaster } from 'sonner'

export default function App() {
  return (
    <Providers>
      <Router>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              
              {/* Agent Routes */}
              <Route path="agents" element={<AgentList />} />
              <Route path="agents/new" element={<AgentEditor />} />
              <Route path="agents/:id" element={<AgentEditor />} />
              
              {/* Crew Routes */}
              <Route path="crews" element={<CrewList />} />
              <Route path="crews/new" element={<CrewEditor />} />
              <Route path="crews/:id" element={<CrewEditor />} />
              
              {/* Task Routes */}
              <Route path="tasks" element={<TaskList />} />
              <Route path="tasks/new" element={<TaskEditor />} />
              <Route path="tasks/:id" element={<TaskEditor />} />
              
              {/* Execution & Monitoring */}
              <Route path="execution" element={<Execution />} />
              <Route path="monitoring" element={<Monitoring />} />
              
              {/* Settings */}
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
          <Toaster position="top-right" richColors />
        </ErrorBoundary>
      </Router>
    </Providers>
  )
} 