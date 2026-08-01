import './org-chart.css'
import { ImportScreen } from './components/ImportScreen'
import { SandboxScreen } from './components/SandboxScreen'
import { useOrgChart } from './model/useOrgChart'

export function OrgChartApp() {
  const api = useOrgChart()

  return (
    <div className="org-chart">
      {api.screen === 'import' ? (
        <ImportScreen api={api} />
      ) : (
        <SandboxScreen api={api} />
      )}
    </div>
  )
}
