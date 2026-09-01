const API_URL = 'http://localhost:3000';
export type User = { id: string; email: string; name: string };
export type Step = { id: string; title: string; description?: string | null; position: number; progresses?: { userId: string; completed: boolean }[] };
export type Goal = { id: string; name: string; description?: string | null; status: string; startDate: string; endDate?: string | null; customCategory?: string | null; category?: { name: string } | null; team?: { name: string } | null; tags: string[]; steps: Step[]; members?: { id: string; user: { name: string; email: string }; role: string }[] };
export type Team = { id: string; name: string; description?: string | null; members: { id: string; user: User; role: string }[]; goals: { id: string; name: string; status: string }[] };
export type Dashboard = { counts: { completed: number; open: number; thisMonth: number; thisYear: number; total: number; completionRate: number }; categoryBreakdown: { label: string; count: number }[]; recentGoals: Goal[] };

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
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  dashboard: () => request<Dashboard>('/dashboard'),
  goals: () => request<Goal[]>('/goals'),
  goal: (id: string) => request<Goal>(`/goals/${id}`),
  createGoal: (body: Record<string, unknown>) => request<Goal>('/goals', json(body)),
  updateProgress: (goalId: string, stepId: string, completed: boolean) => request<Goal>(`/goals/${goalId}/steps/${stepId}/progress`, { method: 'PUT', body: JSON.stringify({ completed }) }),
  addStep: (goalId: string, title: string) => request<Goal>(`/goals/${goalId}/steps`, json({ title })),
  override: (goalId: string, reason: string) => request<Goal>(`/goals/${goalId}/override`, json({ reason })),
  teams: () => request<Team[]>('/teams'),
  createTeam: (body: { name: string; description?: string }) => request<Team>('/teams', json(body)),
  invite: (targetType: 'goal' | 'team', targetId: string) => request<{ url: string; expiresAt: string }>('/invites', json({ targetType, targetId })),
  previewInvite: (token: string) => request<{ targetType: string; name: string; expiresAt: string }>(`/invites/${token}`),
  acceptInvite: (token: string) => request<{ accepted: boolean }>('/invites/accept', json({ token })),
};
