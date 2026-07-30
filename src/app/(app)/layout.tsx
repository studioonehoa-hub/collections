import { requireUser, ROLE_LABEL } from "@/lib/auth";
import { NAV_ITEMS } from "@/lib/nav";
import { NavBar } from "@/components/NavBar";
import { signOut } from "@/app/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950">
      <header className="relative min-h-[60px] bg-white text-neutral-800 px-5 py-2.5 flex items-center gap-4 flex-wrap">
        {/* Full-width thin band. */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-2.5 bg-gray-900 pointer-events-none" />
        {/* Notch — true CSS border-radius (always smooth) instead of a hand-tuned
            curve, centered with left-1/2/-translate-x-1/2 so it's dead-center at
            any viewport width rather than a fixed pixel offset from the left. */}
        <div
          aria-hidden
          className="absolute left-1/2 top-0 -translate-x-1/2 w-64 h-[54px] bg-gray-900 rounded-b-[26px] pointer-events-none"
        />
        <div className="absolute left-1/2 top-2 -translate-x-1/2 leading-tight z-10 text-center">
          <div className="font-black text-[23px] uppercase tracking-tight text-white">Koolector</div>
          <div className="text-[10px] text-neutral-300 tracking-wide -mt-0.5">
            Billing and Collections Mastered
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-neutral-500 relative z-10">
          <span>
            {user.email} · <span className="text-neutral-700">{ROLE_LABEL[user.role]}</span>
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="bg-neutral-100 border border-neutral-300 text-neutral-800 px-2.5 py-1 text-xs"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      <NavBar items={items} />

      <main className="max-w-5xl w-full mx-auto p-5 flex-1 text-gray-100">{children}</main>
    </div>
  );
}
