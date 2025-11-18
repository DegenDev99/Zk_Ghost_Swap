export function getOrCreateSessionId(): string {
  const SESSION_KEY = "zkswap_session_id";
  
  let sessionId = localStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  
  return sessionId;
}

export function clearSessionId(): void {
  localStorage.removeItem("zkswap_session_id");
}
