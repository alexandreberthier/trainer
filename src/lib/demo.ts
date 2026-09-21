import type { Activity } from './types'

function isoDaysAgo(days: number, hour = 7): string {
  const d = new Date()
  d.setHours(hour, 10, 0, 0)
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

let id = 9_000_000

function nextId(): number {
  id += 1
  return id
}

export function demoActivities(): Activity[] {
  const items: Activity[] = []

  const run5k = { name: '5k', distance: 5000, elapsed_time: 1350, moving_time: 1350 }
  const run10k = { name: '10k', distance: 10000, elapsed_time: 2840, moving_time: 2840 }
  const run1k = { name: '1k', distance: 1000, elapsed_time: 245, moving_time: 245 }

  for (let w = 0; w < 11; w++) {
    const base = w * 7
    items.push({
      id: nextId(),
      name: 'Easy Run',
      sport: 'run',
      start_date: isoDaysAgo(base + 1),
      distance_m: 8500,
      moving_time_s: 2980,
      elapsed_time_s: 3010,
      average_heartrate: 142,
      best_efforts: w === 2 ? [run5k, run1k] : w === 6 ? [run10k] : [run1k],
    })
    items.push({
      id: nextId(),
      name: w % 2 === 0 ? 'Threshold Ride' : 'Endurance Ride',
      sport: 'bike',
      start_date: isoDaysAgo(base + 2, 17),
      distance_m: w % 2 === 0 ? 38000 : 52000,
      moving_time_s: w % 2 === 0 ? 4200 : 6300,
      elapsed_time_s: w % 2 === 0 ? 4280 : 6420,
      average_watts: w % 2 === 0 ? 228 : 178,
      weighted_average_watts: w % 2 === 0 ? 241 : 186,
      device_watts: true,
      average_heartrate: w % 2 === 0 ? 158 : 136,
    })
    items.push({
      id: nextId(),
      name: 'Pool Swim',
      sport: 'swim',
      start_date: isoDaysAgo(base + 3, 6),
      distance_m: 2400,
      moving_time_s: 2580,
      elapsed_time_s: 3100,
      laps: [
        { distance: 400, moving_time: 430 },
        { distance: 200, moving_time: 208 },
        { distance: 100, moving_time: 102 },
      ],
    })
    items.push({
      id: nextId(),
      name: 'Long Ride',
      sport: 'bike',
      start_date: isoDaysAgo(base + 5, 8),
      distance_m: 72000,
      moving_time_s: 9000,
      elapsed_time_s: 9300,
      average_watts: 172,
      weighted_average_watts: 184,
      device_watts: true,
    })
    if (w % 2 === 1) {
      items.push({
        id: nextId(),
        name: 'Intervals',
        sport: 'run',
        start_date: isoDaysAgo(base + 4, 18),
        distance_m: 11000,
        moving_time_s: 3360,
        elapsed_time_s: 3480,
        average_heartrate: 162,
        best_efforts: [run5k, run1k],
      })
    }
  }

  items.push({
    id: nextId(),
    name: 'Parkrun 5k',
    sport: 'run',
    start_date: isoDaysAgo(18, 9),
    distance_m: 5000,
    moving_time_s: 1338,
    elapsed_time_s: 1338,
    average_heartrate: 176,
    best_efforts: [
      { name: '5k', distance: 5000, elapsed_time: 1338, moving_time: 1338 },
      { name: '1k', distance: 1000, elapsed_time: 248, moving_time: 248 },
    ],
  })

  return items.sort((a, b) => b.start_date.localeCompare(a.start_date))
}
