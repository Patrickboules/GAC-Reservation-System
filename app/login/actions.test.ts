import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { login } from "./actions";

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

interface SignInWithOAuthArgs {
  provider: string;
  options: { redirectTo: string };
}

function setupAuth(opts: { url?: string; error?: { message: string } }) {
  const signInWithOAuth = vi.fn<(args: SignInWithOAuthArgs) => Promise<{
    data: { url: string | null };
    error: { message: string } | null;
  }>>(async () => {
    if (opts.error) return { data: { url: null }, error: opts.error };
    return { data: { url: opts.url ?? "https://accounts.google.com/o/auth" }, error: null };
  });
  mocks.createClient.mockResolvedValue({ auth: { signInWithOAuth } });
  mocks.headers.mockResolvedValue(new Headers({ origin: "https://gac.example.com" }));
  return signInWithOAuth;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  });
});

describe("login", () => {
  it("builds the auth callback with a safe relative next path", async () => {
    const signInWithOAuth = setupAuth({});
    await expect(login(formData({ next: "/bookings" }))).rejects.toThrow();

    const call = signInWithOAuth.mock.calls[0][0];
    expect(call.options.redirectTo).toBe(
      "https://gac.example.com/auth/callback?next=%2Fbookings"
    );
  });

  it("drops an absolute-URL next value (open-redirect guard)", async () => {
    const signInWithOAuth = setupAuth({});
    await expect(login(formData({ next: "https://evil.example.com" }))).rejects.toThrow();

    const call = signInWithOAuth.mock.calls[0][0];
    expect(call.options.redirectTo).toBe("https://gac.example.com/auth/callback");
  });

  it("drops a protocol-relative next value (open-redirect guard)", async () => {
    const signInWithOAuth = setupAuth({});
    await expect(login(formData({ next: "//evil.example.com" }))).rejects.toThrow();

    const call = signInWithOAuth.mock.calls[0][0];
    expect(call.options.redirectTo).toBe("https://gac.example.com/auth/callback");
  });

  it("omits next entirely when none was provided", async () => {
    const signInWithOAuth = setupAuth({});
    await expect(login(formData({}))).rejects.toThrow();

    const call = signInWithOAuth.mock.calls[0][0];
    expect(call.options.redirectTo).toBe("https://gac.example.com/auth/callback");
  });

  it("redirects to /login with the error message when sign-in fails", async () => {
    setupAuth({ error: { message: "OAuth misconfigured" } });
    await expect(login(formData({}))).rejects.toThrow(
      "REDIRECT:/login?error=OAuth%20misconfigured"
    );
  });

  it("redirects to the provider URL on success", async () => {
    setupAuth({ url: "https://accounts.google.com/o/auth?state=abc" });
    await expect(login(formData({}))).rejects.toThrow(
      "REDIRECT:https://accounts.google.com/o/auth?state=abc"
    );
  });
});
