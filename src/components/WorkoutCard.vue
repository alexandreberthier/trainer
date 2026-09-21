<script setup lang="ts">
import { useRouter } from 'vue-router'
import SportBadge from './SportBadge.vue'
import type { PlannedWorkout } from '@/lib/types'

defineProps<{
  workout: PlannedWorkout
}>()

const router = useRouter()
</script>

<template>
  <button
    type="button"
    class="w-full rounded-2xl border border-line bg-paper p-4 text-left shadow-[0_1px_0_rgba(28,24,20,0.04)] transition hover:-translate-y-0.5 hover:border-ink/20"
    @click="router.push({ name: 'workout', params: { id: workout.id } })"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <SportBadge :sport="workout.sport" />
        <h3 class="mt-2 font-display text-xl leading-tight">{{ workout.title }}</h3>
      </div>
      <p class="text-sm text-ink-soft">{{ workout.durationMin }} min</p>
    </div>
    <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">{{ workout.description }}</p>
  </button>
</template>
