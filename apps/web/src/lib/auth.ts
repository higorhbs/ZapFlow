import Cookies from "js-cookie";

export function setToken(token: string) {
  Cookies.set("zf_token", token, { expires: 30, sameSite: "lax", path: "/" });
}

export function getToken(): string | undefined {
  return Cookies.get("zf_token");
}

export function removeToken() {
  Cookies.remove("zf_token", { path: "/" });
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
