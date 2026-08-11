import { Navigate, Route, Routes } from 'react-router-dom'
import { ToolsLanding } from './pages/ToolsLanding'
import { DecisionMatrixApp } from './tools/decision-matrix/DecisionMatrixApp'
import { OrgChartApp } from './tools/org-chart/OrgChartApp'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ToolsLanding />} />
      <Route path="/org-chart" element={<OrgChartApp />} />
      <Route path="/decision-matrix" element={<DecisionMatrixApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
