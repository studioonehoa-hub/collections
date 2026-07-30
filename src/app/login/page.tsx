"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-neutral-800 border border-neutral-700 p-6 shadow-sm"
      >
        <h1 className="font-black text-[25px] uppercase tracking-tight text-gray-100">Koolector</h1>
        <p className="text-[11px] text-gray-500 tracking-wide mt-0.5">Billing and Collections Mastered</p>
        <p className="text-sm text-gray-400 mb-6 mt-3">Sign in to continue</p>

        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-800 text-red-300 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <label htmlFor="email" className="block text-xs font-semibold text-gray-300 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 border border-neutral-600 bg-neutral-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-neutral-400"
        />

        <label htmlFor="password" className="block text-xs font-semibold text-gray-300 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 border border-neutral-600 bg-neutral-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-neutral-400"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-neutral-100 text-neutral-900 text-sm font-semibold py-2 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
