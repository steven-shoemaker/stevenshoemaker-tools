import './decision-matrix.css'
import { MatrixScreen } from './components/MatrixScreen'
import { useDecisionMatrix } from './model/useDecisionMatrix'

export function DecisionMatrixApp() {
  const api = useDecisionMatrix()

  return (
    <div className="decision-matrix">
      <MatrixScreen api={api} />
    </div>
  )
}
