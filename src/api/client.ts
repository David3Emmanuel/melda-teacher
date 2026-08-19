// The teacher app's single door to the backend. Every screen reads through `api.*`
// (which returns the server-computed models) and writes through it too; nothing in
// the app recomputes insights or holds the Anthropic key anymore.
//
// The JWT is not imported from the store here (that would be a cycle): the session
// store pushes it in via setAuthToken after login/hydrate and clears it on logout.

import type {
  AdaptSectionInput,
  AdaptationDraft,
  AssignmentProgress,
  AuthResponse,
  ClassCard,
  ConceptDetail,
  CreateAdaptationRequest,
  CreateAssignmentRequest,
  CreateLessonRequest,
  DraftLessonInput,
  DraftQuizInput,
  InsightsResponse,
  Lesson,
  LessonDraft,
  LoginRequest,
  QuizDraft,
  StudentDetail,
} from 'melda-shared';

// EXPO_PUBLIC_ is inlined into the bundle at build time. This is a URL, not a
// secret - the Anthropic key stays on the server. Defaults to the backend dev port.
const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** The session store pushes the JWT here after login/hydrate, and clears it on logout. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** Registered by the session store so an expired token logs the user out once, everywhere. */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

/** A non-2xx response, carrying the HTTP status and the server's error message. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : null),
      ...(authToken ? { authorization: `Bearer ${authToken}` } : null),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return payload as T;
}

export const api = {
  login: (body: LoginRequest) => request<AuthResponse>('POST', '/auth/login', body),

  myClasses: () => request<ClassCard[]>('GET', '/me/classes'),

  insights: (classId: string) => request<InsightsResponse>('GET', `/classes/${classId}/insights`),
  conceptDetail: (classId: string, conceptId: string) =>
    request<ConceptDetail>('GET', `/classes/${classId}/concepts/${conceptId}`),
  studentDetail: (classId: string, studentId: string) =>
    request<StudentDetail>('GET', `/classes/${classId}/students/${studentId}`),

  lessons: (classId: string) => request<Lesson[]>('GET', `/classes/${classId}/lessons`),
  lesson: (lessonId: string) => request<Lesson>('GET', `/lessons/${lessonId}`),

  assignments: (classId: string) =>
    request<AssignmentProgress[]>('GET', `/classes/${classId}/assignments`),
  assignment: (assignmentId: string) =>
    request<AssignmentProgress>('GET', `/assignments/${assignmentId}`),

  createLesson: (classId: string, body: CreateLessonRequest) =>
    request<{ id: string }>('POST', `/classes/${classId}/lessons`, body),
  createAssignment: (classId: string, body: CreateAssignmentRequest) =>
    request<{ id: string }>('POST', `/classes/${classId}/assignments`, body),
  createAdaptation: (lessonId: string, body: CreateAdaptationRequest) =>
    request<{ id: string }>('POST', `/lessons/${lessonId}/adaptations`, body),
  publishLesson: (lessonId: string) =>
    request<{ ok: boolean }>('POST', `/lessons/${lessonId}/publish`),
  resetDemo: (classId: string) =>
    request<{ ok: boolean; classId: string }>('POST', `/classes/${classId}/reset`),

  draftLesson: (body: DraftLessonInput) => request<LessonDraft>('POST', '/ai/draft-lesson', body),
  draftQuiz: (body: DraftQuizInput) => request<QuizDraft>('POST', '/ai/draft-quiz', body),
  adaptSection: (body: AdaptSectionInput) =>
    request<AdaptationDraft>('POST', '/ai/adapt-section', body),
};
