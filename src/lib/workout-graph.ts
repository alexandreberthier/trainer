import type { Intensity, PlannedWorkout, WorkoutBlock } from './types'
import { formatMinutes } from './format'

export interface GraphSegment {
  label: string
  durationMin: number
  intensity: Intensity
  target: string
}

export interface DisplayRow {
  kind: 'single' | 'repeat'
  label: string
  durationMin: number
  intensity: Intensity
  target: string
  repeats?: number
  steps?: GraphSegment[]
}

export function stepMinutes(step: { durationMin?: number; distanceM?: number }): number {
  if (step.durationMin && step.durationMin > 0) return step.durationMin
  if (step.distanceM && step.distanceM > 0) {
    if (step.distanceM <= 800) return Math.max(1, (step.distanceM / 100) * 2.3)
    return Math.max(1, step.distanceM / 160)
  }
  return 4
}

export function blockMinutes(block: WorkoutBlock): number {
  if (block.repeats && block.steps?.length) {
    return block.repeats * block.steps.reduce((sum, step) => sum + stepMinutes(step), 0)
  }
  if (block.durationMin && block.durationMin > 0) return block.durationMin
  return stepMinutes(block)
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

export function displayRows(workout: PlannedWorkout): DisplayRow[] {
  return workout.structure
    .map((block) => {
      if (block.repeats && block.repeats > 1 && block.steps?.length) {
        const steps = block.steps.map((step) => ({
          label: step.label,
          durationMin: stepMinutes(step),
          intensity: step.intensity,
          target: step.target,
        }))
        return {
          kind: 'repeat' as const,
          label: block.label,
          durationMin: blockMinutes(block),
          intensity: block.intensity,
          target: block.target,
          repeats: block.repeats,
          steps,
        }
      }
      return {
        kind: 'single' as const,
        label: block.label,
        durationMin: blockMinutes(block),
        intensity: block.intensity,
        target: block.target,
      }
    })
    .filter((row) => row.durationMin > 0)
}

export function structureTotal(workout: PlannedWorkout): number {
  return workout.structure.reduce((sum, block) => sum + blockMinutes(block), 0)
}

export function workoutRecipe(workout: PlannedWorkout): string {
  return displayRows(workout)
    .map((row) => {
      if (row.kind === 'repeat' && row.steps?.length) {
        const inner = row.steps
          .map((step) => `${formatMinutes(step.durationMin)} ${step.label}`)
          .join(' / ')
        return `${row.repeats}× (${inner})`
      }
      return `${formatMinutes(row.durationMin)} ${row.label}`
    })
    .join('  →  ')
}
