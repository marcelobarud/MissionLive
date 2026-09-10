export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type Avatar = { type: 'preset' | 'upload' | 'google' | null; presetId: string | null; url: string | null };
export type PlatformRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';
export type User = { id: string; email: string; name: string; avatarUrl?: string | null; avatar?: Avatar; platformRole?: PlatformRole; timezone?: string; onboardingCompletedAt?: string | null; preferences?: Record<string, boolean | string | number>; phone?: string | null; birthDate?: string | null; countryCode?: string | null; region?: string | null; city?: string | null };
export type Category = { id: string; name: string };
export type StepAssignmentMode = 'ALL_PARTICIPANTS' | 'SPECIFIC_PARTICIPANT';
export type Step = { id: string; title: string; description?: string | null; position: number; assignmentMode?: StepAssignmentMode; assigneeUserId?: string | null; assigneeName?: string | null; assignee?: User | null; assigneeAvailable?: boolean; applicable?: boolean; progresses?: { userId: string; completed: boolean; completedAt?: string | null }[] };
export type ProgressSummary = { completedSteps: number; totalSteps: number; participantCount: number; completedParticipants: number; unavailableSteps?: number };
export type ParticipantProgressStep = Pick<Step, 'id' | 'title' | 'position' | 'assignmentMode' | 'assigneeUserId' | 'assigneeName' | 'assignee' | 'assigneeAvailable'> & { completed: boolean; completedAt: string | null };
export type ParticipantProgress = { userId: string; name: string; avatarUrl?: string | null; avatar?: Avatar; role: string; completedSteps: number; totalSteps: number; percentage: number; completed: boolean; status: 'not-started' | 'in-progress' | 'nearly-complete' | 'completed'; steps: ParticipantProgressStep[] };
export type ParticipantsProgress = { totalParticipants: number; participantsCompleted: number; collectiveCompletedSteps: number; collectiveTotalSteps: number; collectivePercentage: number; unavailableSteps?: number; participants: ParticipantProgress[] };
export type Goal = { id: string; ownerUserId: string; owner?: User; name: string; description?: string | null; status: string; startDate: string; endDate?: string | null; recurrenceType?: 'NONE' | 'DAILY'; recurrenceTimezone?: string | null; completedToday?: boolean; occurrenceLocalDate?: string | null; completionMode?: string | null; completionOverrideReason?: string | null; customCategory?: string | null; category?: Category | null; team?: { id: string; name: string; ownerUserId?: string; owner?: User; members?: { id: string; user: User; role: string }[] } | null; tags: string[]; steps: Step[]; members?: { id: string; user: User; role: string }[]; progressSummary?: ProgressSummary; participantsProgress?: ParticipantsProgress };
export type Team = { id: string; ownerUserId: string; owner?: User; name: string; description?: string | null; imageUrl?: string | null; accessRole?: string; members: { id: string; user: User; role: string }[]; goals: { id: string; name: string; status: string }[] };
export type TeamDetail = Omit<Team, 'goals'> & { goals: Goal[] };
export type Dashboard = { counts: { completed: number; open: number; thisMonth: number; thisYear: number; total: number; completionRate: number; activeProgress: number }; categoryBreakdown: { label: string; count: number }[]; contextBreakdown: { label: string; count: number }[]; upcomingDeadlines: Goal[]; overdueGoals: Goal[]; nearlyCompleteGoals: Goal[]; completionTimeline: { label: string; count: number }[]; recentGoals: Goal[] };
export type AdminOverview = { users: { total: number; active: number; newThisMonth: number }; goals: { total: number; active: number; completed: number }; teams: { total: number }; photos: { total: number } };
export type AdminUserStatus = 'active' | 'disabled';
export type AdminUser = { id: string; name: string; email: string; status: AdminUserStatus; platformRole: PlatformRole; createdAt: string };
export type AdminUsersResponse = { items: AdminUser[]; pagination: { page: number; pageSize: number; totalItems: number; totalPages: number } };
export type AdminUserDetail = { user: AdminUser; stats: { goalsCreated: number; teams: number; photos: number } };
export type AdminUserStatusResponse = { user: AdminUser; changed: boolean };
export type Invite = { id: string; targetType: string; expiresAt: string; url?: string };
export type Reminder = { id: string; creatorUserId: string; targetUserId: string; goalId: string; goalStepId?: string | null; remindAt: string; timezone: string; status: string; recurrenceType?: 'ONCE' | 'DAILY'; timeOfDay?: string | null; creator?: Pick<User, 'id' | 'name' | 'avatarUrl'>; target?: Pick<User, 'id' | 'name' | 'avatarUrl'>; goalStep?: { id: string; title: string } | null; goal?: { id: string; name: string; status: string; endDate?: string | null } };
export type GoalPhoto = { id: string; title: string; description: string; author: Pick<User, 'id' | 'name' | 'avatarUrl'> & { avatar?: Avatar }; task: { id: string | null; title: string; removed?: boolean } | null; occurrenceLocalDate?: string | null; createdAt: string; thumbnailUrl: string; imageUrl: string; canDelete: boolean };
export type GoalPhotoPage = { items: GoalPhoto[]; nextOffset: number | null; hasMore: boolean };
export type ActivityEvent = { id: string; eventType: string; metadata: Record<string, string | number | boolean>; createdAt: string; actor: User; targetUser?: User | null; goal?: { id: string; name: string } | null; team?: { id: string; name: string } | null };
export type ActivityPage = { items: ActivityEvent[]; nextOffset: number | null; hasMore: boolean };
export type Comment = { id: string; body: string; createdAt: string; updatedAt: string; author: User; reactions: { emoji: string; count: number; reacted: boolean }[] };
export type GoalTemplate = { id: string; name: string; description?: string | null; isOfficial: boolean; tags?: string[]; steps: string[] };
export type Rhythm = { applicable: boolean; state: string; reason?: string; timePercent?: number; progressPercent?: number; delta?: number };
export type CalendarData = { from: string; to: string; goals: Goal[]; reminders: { id: string; remindAt: string; goal: { id: string; name: string } }[] };
export type Notification = { id: string; type: string; title: string; body: string; goalId?: string | null; teamId?: string | null; readAt?: string | null; createdAt: string };

async function request<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'include', headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
  if (!response.ok) { const body = await response.json().catch(() => ({})) as { message?: string | string[] }; const message = Array.isArray(body.message) ? body.message.join(', ') : body.message; throw new Error(message || 'Não foi possível concluir a ação.'); }
  if (response.status === 204) return undefined as T; return response.json() as Promise<T>;
}
const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const api = {
  me: () => request<{ user: User }>('/auth/me'),
  login: (body: { email: string; password: string; rememberMe: boolean }) => request<{ user: User }>('/auth/login', json(body)),
  register: (body: { name: string; email: string; password: string }) => request<{ user: User; verificationToken?: string }>('/auth/register', json(body)),
  verifyEmail: (token: string) => request('/auth/verify-email', json({ token })),
  forgotPassword: (email: string) => request<{ accepted: boolean; resetToken?: string }>('/auth/forgot-password', json({ email })),
  resetPassword: (token: string, password: string) => request('/auth/reset-password', json({ token, password })),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  categories: () => request<Category[]>('/categories'),
  dashboard: () => request<Dashboard>('/dashboard'),
  adminOverview: () => request<AdminOverview>('/admin/overview'),
  adminUsers: (query: { page?: number; pageSize?: number; search?: string; status?: AdminUserStatus } = {}) => { const params = new URLSearchParams(); if (query.page !== undefined) params.set('page', String(query.page)); if (query.pageSize !== undefined) params.set('pageSize', String(query.pageSize)); if (query.search) params.set('search', query.search); if (query.status) params.set('status', query.status); const suffix = params.toString() ? `?${params.toString()}` : ''; return request<AdminUsersResponse>(`/admin/users${suffix}`); },
  adminUser: (id: string) => request<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`),
  updateAdminUserStatus: (id: string, status: AdminUserStatus) => request<AdminUserStatusResponse>(`/admin/users/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  goals: (query: Record<string, string | undefined> = {}) => { const params = new URLSearchParams(); for (const [key, value] of Object.entries(query)) if (value) params.set(key, value); const suffix = params.toString() ? `?${params.toString()}` : ''; return request<Goal[]>(`/goals${suffix}`); },
  goal: (id: string) => request<Goal>(`/goals/${id}`),
  createGoal: (body: Record<string, unknown>) => request<Goal>('/goals', json(body)),
  updateGoal: (id: string, body: Record<string, unknown>) => request<Goal>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  cancelGoal: (id: string) => request<{ cancelled: boolean }>(`/goals/${id}/cancel`, { method: 'PATCH' }),
  deleteGoal: (id: string) => request<{ deleted: boolean }>(`/goals/${id}`, { method: 'DELETE' }),
  archiveGoal: (id: string) => request<{ archived: boolean }>(`/goals/${id}/archive`, { method: 'PATCH' }),
  updateProgress: (goalId: string, stepId: string, completed: boolean) => request<Goal>(`/goals/${goalId}/steps/${stepId}/progress`, { method: 'PUT', body: JSON.stringify({ completed }) }),
  addStep: (goalId: string, title: string, description?: string, assignment?: Pick<Step, 'assignmentMode' | 'assigneeUserId'>) => request<Goal>(`/goals/${goalId}/steps`, json({ title, description, ...assignment })),
  updateStep: (goalId: string, stepId: string, body: { title: string; description?: string; assignmentMode?: StepAssignmentMode; assigneeUserId?: string | null }) => request<Goal>(`/goals/${goalId}/steps/${stepId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  removeStep: (goalId: string, stepId: string) => request<Goal>(`/goals/${goalId}/steps/${stepId}`, { method: 'DELETE' }),
  goalPhotos: (goalId: string, query: { limit?: number; offset?: number } = {}) => { const params = new URLSearchParams(); if (query.limit !== undefined) params.set('limit', String(query.limit)); if (query.offset !== undefined) params.set('offset', String(query.offset)); const suffix = params.toString() ? `?${params.toString()}` : ''; return request<GoalPhotoPage>(`/goals/${goalId}/photos${suffix}`); },
  createGoalPhoto: async (goalId: string, file: File, body: { title: string; description: string; goalStepId?: string }) => { const form = new FormData(); form.append('file', file); form.append('title', body.title); form.append('description', body.description); if (body.goalStepId) form.append('goalStepId', body.goalStepId); const response = await fetch(`${API_URL}/goals/${goalId}/photos`, { method: 'POST', body: form, credentials: 'include' }); if (!response.ok) { const result = await response.json().catch(() => ({})) as { message?: string | string[] }; const message = Array.isArray(result.message) ? result.message.join(', ') : result.message; throw new Error(message || 'Não foi possível adicionar a foto.'); } return response.json() as Promise<GoalPhoto>; },
  deleteGoalPhoto: (goalId: string, photoId: string) => request<{ deleted: boolean }>(`/goals/${goalId}/photos/${photoId}`, { method: 'DELETE' }),
  mediaUrl: (path: string) => `${API_URL}${path}`,
  reorderSteps: (goalId: string, stepIds: string[]) => request<Goal>(`/goals/${goalId}/steps/reorder`, { method: 'PATCH', body: JSON.stringify({ stepIds }) }),
  override: (goalId: string, reason: string) => request<Goal>(`/goals/${goalId}/override`, json({ reason })),
  updateGoalMember: (goalId: string, memberId: string, role: string) => request<Goal>(`/goals/${goalId}/members/${memberId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeGoalMember: (goalId: string, memberId: string) => request<Goal>(`/goals/${goalId}/members/${memberId}`, { method: 'DELETE' }),
  teams: () => request<Team[]>('/teams'),
  team: (id: string) => request<TeamDetail>(`/teams/${id}`),
  createTeam: (body: { name: string; description?: string }) => request<Team>('/teams', json(body)),
  createTeamWithGoal: (body: Record<string, unknown>) => request<TeamDetail>('/teams/with-goal', json(body)),
  updateTeam: (id: string, body: { name: string; description?: string }) => request<TeamDetail>(`/teams/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  uploadTeamImage: async (id: string, file: File) => { const form = new FormData(); form.append('file', file); const response = await fetch(`${API_URL}/teams/${id}/image`, { method: 'POST', body: form, credentials: 'include' }); if (!response.ok) { const body = await response.json().catch(() => ({})) as { message?: string | string[] }; const message = Array.isArray(body.message) ? body.message.join(', ') : body.message; throw new Error(message || 'Não foi possível enviar a imagem da equipe.'); } return response.json() as Promise<TeamDetail>; },
  removeTeamImage: (id: string) => request<TeamDetail>(`/teams/${id}/image`, { method: 'DELETE' }),
  removeTeam: (id: string) => request<{ deleted: boolean }>(`/teams/${id}`, { method: 'DELETE' }),
  updateTeamMember: (teamId: string, memberId: string, role: string) => request<TeamDetail>(`/teams/${teamId}/members/${memberId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeTeamMember: (teamId: string, memberId: string) => request<TeamDetail>(`/teams/${teamId}/members/${memberId}`, { method: 'DELETE' }),
  invite: (targetType: 'goal' | 'team', targetId: string) => request<Invite>('/invites', json({ targetType, targetId })),
  previewInvite: (token: string) => request<{ targetType: string; name: string; expiresAt: string }>(`/invites/${token}`),
  acceptInvite: (token: string) => request<{ accepted: boolean }>('/invites/accept', json({ token })),
  revokeInvite: (id: string) => request<{ revoked: boolean }>(`/invites/${id}/revoke`, { method: 'POST' }),
  reminders: () => request<Reminder[]>('/reminders'),
  createReminder: (body: { goalId: string; targetUserId?: string; goalStepId?: string; remindAt?: string; timezone: string; recurrenceType?: 'ONCE' | 'DAILY'; timeOfDay?: string }) => request<Reminder>('/reminders', json(body)),
  cancelReminder: (id: string) => request<{ cancelled: boolean }>(`/reminders/${id}`, { method: 'DELETE' }),
  pushPublicKey: () => request<{ publicKey: string | null; enabled: boolean }>('/push/public-key'),
  subscribePush: (body: { endpoint: string; p256dh: string; auth: string }) => request<{ id: string }>('/push/subscriptions', json(body)),
  unsubscribePush: (endpoint: string) => request<{ removed: boolean }>('/push/subscriptions', { method: 'DELETE', body: JSON.stringify({ endpoint }) }),
  activity: (query: { limit?: number; offset?: number } = {}) => { const params = new URLSearchParams(); if (query.limit !== undefined) params.set('limit', String(query.limit)); if (query.offset !== undefined) params.set('offset', String(query.offset)); const suffix = params.toString() ? `?${params.toString()}` : ''; return request<ActivityPage>(`/activity${suffix}`); },
  comments: (goalId: string) => request<Comment[]>(`/goals/${goalId}/comments`),
  createComment: (goalId: string, body: string) => request<Comment>(`/goals/${goalId}/comments`, json({ body })),
  updateComment: (commentId: string, body: string) => request<Comment>(`/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify({ body }) }),
  deleteComment: (commentId: string) => request<{ deleted: boolean }>(`/comments/${commentId}`, { method: 'DELETE' }),
  toggleReaction: (commentId: string, emoji: string) => request<Comment>(`/comments/${commentId}/reactions`, { method: 'PUT', body: JSON.stringify({ emoji }) }),
  templates: () => request<GoalTemplate[]>('/templates'),
  useTemplate: (id: string, body: { startDate: string; endDate?: string }) => request<Goal>(`/templates/${id}/use`, json(body)),
  calendar: (from?: string, to?: string) => request<CalendarData>(`/calendar?from=${encodeURIComponent(from ?? '')}&to=${encodeURIComponent(to ?? '')}`),
  rhythm: (goalId: string) => request<Rhythm>(`/goals/${goalId}/rhythm`),
  updateProfile: (body: { name?: string; avatarUrl?: string; timezone?: string; preferences?: Record<string, boolean | string | number>; phone?: string | null; birthDate?: string | null; countryCode?: string | null; region?: string | null; city?: string | null }) => request<User>('/auth/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  setAvatarPreset: (presetId: string) => request<User>('/profile/avatar/preset', { method: 'PATCH', body: JSON.stringify({ presetId }) }),
  uploadAvatar: async (file: File) => { const response = await fetch(`${API_URL}/profile/avatar/upload`, { method: 'POST', body: (() => { const form = new FormData(); form.append('file', file); return form; })(), credentials: 'include' }); if (!response.ok) { const body = await response.json().catch(() => ({})) as { message?: string | string[] }; const message = Array.isArray(body.message) ? body.message.join(', ') : body.message; throw new Error(message || 'Não foi possível enviar a foto.'); } return response.json() as Promise<User>; },
  removeAvatar: () => request<User>('/profile/avatar', { method: 'DELETE' }),
  completeOnboarding: () => request<User>('/auth/onboarding/complete', json({})),
  sessions: () => request<{ id: string; createdAt: string; expiresAt: string; current: boolean }[]>('/auth/sessions'),
  revokeOtherSessions: () => request<{ revoked: boolean }>('/auth/sessions/revoke-others', json({})),
  notifications: () => request<Notification[]>('/notifications'),
  unreadNotifications: () => request<{ count: number }>('/notifications/unread-count'),
  readNotification: (id: string) => request<Notification>(`/notifications/${id}/read`, { method: 'PATCH' }),
  readAllNotifications: () => request<{ read: boolean }>('/notifications/read-all', json({})),
};
