const API_URL = 'http://localhost:3000';

export type User = { id: string; email: string; name: string; avatarUrl?: string | null; timezone?: string };
export type Category = { id: string; name: string };
export type Step = { id: string; title: string; description?: string | null; position: number; progresses?: { userId: string; completed: boolean }[] };
export type ProgressSummary = { completedSteps: number; totalSteps: number; participantCount: number; completedParticipants: number };
export type Goal = { id: string; ownerUserId: string; owner?: User; name: string; description?: string | null; status: string; startDate: string; endDate?: string | null; completionMode?: string | null; completionOverrideReason?: string | null; customCategory?: string | null; category?: Category | null; team?: { id: string; name: string; ownerUserId?: string; owner?: User; members?: { id: string; user: User; role: string }[] } | null; tags: string[]; steps: Step[]; members?: { id: string; user: User; role: string }[]; progressSummary?: ProgressSummary };
export type Team = { id: string; ownerUserId: string; owner?: User; name: string; description?: string | null; accessRole?: string; members: { id: string; user: User; role: string }[]; goals: { id: string; name: string; status: string }[] };
export type TeamDetail = Omit<Team, 'goals'> & { goals: Goal[] };
export type Dashboard = { counts: { completed: number; open: number; thisMonth: number; thisYear: number; total: number; completionRate: number; activeProgress: number }; categoryBreakdown: { label: string; count: number }[]; contextBreakdown: { label: string; count: number }[]; upcomingDeadlines: Goal[]; overdueGoals: Goal[]; nearlyCompleteGoals: Goal[]; completionTimeline: { label: string; count: number }[]; recentGoals: Goal[] };
export type Invite = { id: string; targetType: string; expiresAt: string; url?: string };

async function request<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'include', headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
  if (!response.ok) { const body = await response.json().catch(() => ({})) as { message?: string | string[] }; const message = Array.isArray(body.message) ? body.message.join(', ') : body.message; throw new Error(message || 'Não foi possível concluir a ação.'); }
  if (response.status === 204) return undefined as T; return response.json() as Promise<T>;
}
const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const api = {
  me: () => request<{ user: User }>('/auth/me'),
  login: (body: { email: string; password: string }) => request<{ user: User }>('/auth/login', json(body)),
  register: (body: { name: string; email: string; password: string }) => request<{ user: User; verificationToken?: string }>('/auth/register', json(body)),
  verifyEmail: (token: string) => request('/auth/verify-email', json({ token })),
  forgotPassword: (email: string) => request<{ accepted: boolean; resetToken?: string }>('/auth/forgot-password', json({ email })),
  resetPassword: (token: string, password: string) => request('/auth/reset-password', json({ token, password })),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  categories: () => request<Category[]>('/categories'),
  dashboard: () => request<Dashboard>('/dashboard'),
  goals: (query: Record<string, string | undefined> = {}) => { const params = new URLSearchParams(); for (const [key, value] of Object.entries(query)) if (value) params.set(key, value); const suffix = params.toString() ? `?${params.toString()}` : ''; return request<Goal[]>(`/goals${suffix}`); },
  goal: (id: string) => request<Goal>(`/goals/${id}`),
  createGoal: (body: Record<string, unknown>) => request<Goal>('/goals', json(body)),
  updateGoal: (id: string, body: Record<string, unknown>) => request<Goal>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  cancelGoal: (id: string) => request<{ cancelled: boolean }>(`/goals/${id}`, { method: 'DELETE' }),
  archiveGoal: (id: string) => request<{ archived: boolean }>(`/goals/${id}/archive`, { method: 'PATCH' }),
  updateProgress: (goalId: string, stepId: string, completed: boolean) => request<Goal>(`/goals/${goalId}/steps/${stepId}/progress`, { method: 'PUT', body: JSON.stringify({ completed }) }),
  addStep: (goalId: string, title: string, description?: string) => request<Goal>(`/goals/${goalId}/steps`, json({ title, description })),
  updateStep: (goalId: string, stepId: string, body: { title: string; description?: string }) => request<Goal>(`/goals/${goalId}/steps/${stepId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  removeStep: (goalId: string, stepId: string) => request<Goal>(`/goals/${goalId}/steps/${stepId}`, { method: 'DELETE' }),
  reorderSteps: (goalId: string, stepIds: string[]) => request<Goal>(`/goals/${goalId}/steps/reorder`, { method: 'PATCH', body: JSON.stringify({ stepIds }) }),
  override: (goalId: string, reason: string) => request<Goal>(`/goals/${goalId}/override`, json({ reason })),
  updateGoalMember: (goalId: string, memberId: string, role: string) => request<Goal>(`/goals/${goalId}/members/${memberId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeGoalMember: (goalId: string, memberId: string) => request<Goal>(`/goals/${goalId}/members/${memberId}`, { method: 'DELETE' }),
  teams: () => request<Team[]>('/teams'),
  team: (id: string) => request<TeamDetail>(`/teams/${id}`),
  createTeam: (body: { name: string; description?: string }) => request<Team>('/teams', json(body)),
  createTeamWithGoal: (body: Record<string, unknown>) => request<TeamDetail>('/teams/with-goal', json(body)),
  updateTeam: (id: string, body: { name: string; description?: string }) => request<TeamDetail>(`/teams/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  removeTeam: (id: string) => request<{ deleted: boolean }>(`/teams/${id}`, { method: 'DELETE' }),
  updateTeamMember: (teamId: string, memberId: string, role: string) => request<TeamDetail>(`/teams/${teamId}/members/${memberId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeTeamMember: (teamId: string, memberId: string) => request<TeamDetail>(`/teams/${teamId}/members/${memberId}`, { method: 'DELETE' }),
  invite: (targetType: 'goal' | 'team', targetId: string) => request<Invite>('/invites', json({ targetType, targetId })),
  previewInvite: (token: string) => request<{ targetType: string; name: string; expiresAt: string }>(`/invites/${token}`),
  acceptInvite: (token: string) => request<{ accepted: boolean }>('/invites/accept', json({ token })),
  revokeInvite: (id: string) => request<{ revoked: boolean }>(`/invites/${id}/revoke`, { method: 'POST' }),
};
