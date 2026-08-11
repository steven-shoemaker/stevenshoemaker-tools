import type { MatrixState } from './types'
import { newId, scoreKey } from './types'

export function createDemoState(): MatrixState {
  const optA = { id: newId(), name: 'Mountain Lodge' }
  const optB = { id: newId(), name: 'Coastal City' }
  const optC = { id: newId(), name: 'Downtown Hotel' }

  const critCost = { id: newId(), name: 'Cost', weight: 30 }
  const critTravel = { id: newId(), name: 'Travel ease', weight: 25 }
  const critActivities = { id: newId(), name: 'Activities', weight: 25 }
  const critWeather = { id: newId(), name: 'Weather', weight: 20 }

  const scores: MatrixState['scores'] = {
    [scoreKey(optA.id, critCost.id)]: 4,
    [scoreKey(optA.id, critTravel.id)]: 2,
    [scoreKey(optA.id, critActivities.id)]: 5,
    [scoreKey(optA.id, critWeather.id)]: 3,

    [scoreKey(optB.id, critCost.id)]: 3,
    [scoreKey(optB.id, critTravel.id)]: 4,
    [scoreKey(optB.id, critActivities.id)]: 4,
    [scoreKey(optB.id, critWeather.id)]: 5,

    [scoreKey(optC.id, critCost.id)]: 2,
    [scoreKey(optC.id, critTravel.id)]: 5,
    [scoreKey(optC.id, critActivities.id)]: 3,
    [scoreKey(optC.id, critWeather.id)]: 4,
  }

  return {
    title: 'Team offsite location',
    options: [optA, optB, optC],
    criteria: [critCost, critTravel, critActivities, critWeather],
    scores,
    scaleMin: 1,
    scaleMax: 5,
  }
}
