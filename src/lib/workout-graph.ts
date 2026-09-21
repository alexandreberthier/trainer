import type { Intensity, PlannedWorkout, WorkoutBlock } from './types'

export interface GraphSegment {
  label: string
  durationMin: number
  intensity: Intensity
  target: string
}

function stepMinutes(step: { durationMin?: number; distanceM?: number }): number {
  if (step.durationMin && step.durationMin > 0) return step.durationMin
  if (step.distanceM && step.distanceM > 0) return Math.max(0.6, step.distanceM / 70)
  return 4
}

export function workoutSegments(workout: PlannedWorkout): GraphSegment[] {
  const out: GraphSegment[] = []
  for (const block of workout.structure) {
    if (block.repeats && block.repeats > 1 && block.steps?.length) {
      for (let i = 0; i < block.repeats; i++) {
        for (const step of block.steps) {
          out.push({
            label: step.label,
            durationMin: stepMinutes(step),
            intensity: step.intensity,
            target: step.target,
          })
        }
      }
      continue
    }
    out.push({
      label: block.label,
      durationMin: blockMinutes(block),
      intensity: block.intensity,
      target: block.target,
    })
  }
  return out.filter((s) => s.durationMin > 0)
}

function blockMinutes(block: WorkoutBlock): number {
  if (block.durationMin && block.durationMin > 0) return block.durationMin
  if (block.repeats && block.steps?.length) {
    return block.repeats * block.steps.reduce((sum, step) => sum + stepMinutes(step), 0)
  }
  return stepMinutes(block)
}
