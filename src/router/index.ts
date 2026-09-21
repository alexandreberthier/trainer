import { createRouter, createWebHistory } from 'vue-router'
import { useTrainerStore } from '@/stores/trainer'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'welcome', component: () => import('@/views/WelcomeView.vue') },
    {
      path: '/app',
      component: () => import('@/views/AppShell.vue'),
      children: [
        { path: '', name: 'today', component: () => import('@/views/TodayView.vue') },
        { path: 'calendar', name: 'calendar', component: () => import('@/views/CalendarView.vue') },
        { path: 'fitness', name: 'fitness', component: () => import('@/views/FitnessView.vue') },
        { path: 'workout/:id', name: 'workout', component: () => import('@/views/WorkoutView.vue') },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const store = useTrainerStore()
  if (to.path.startsWith('/app') && !store.onboardingDone) return { name: 'welcome' }
  if (to.name === 'welcome' && store.onboardingDone) return { name: 'today' }
  return true
})

export default router
