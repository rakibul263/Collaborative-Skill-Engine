const JWT_KEY = "cse_jwt_token";

export const getJWT = () => localStorage.getItem(JWT_KEY);
export const setJWT = (token) => localStorage.setItem(JWT_KEY, token);
export const clearJWT = () => localStorage.removeItem(JWT_KEY);
export const hasJWT = () => !!localStorage.getItem(JWT_KEY);

export const isTokenExpired = (token, bufferSeconds = 30) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload?.exp) return true;
    return payload.exp * 1000 < Date.now() + bufferSeconds * 1000;
  } catch {
    return true;
  }
};
