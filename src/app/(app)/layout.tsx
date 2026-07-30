import { requireUser, ROLE_LABEL } from "@/lib/auth";
import { NAV_ITEMS } from "@/lib/nav";
import { NavBar } from "@/components/NavBar";
import { signOut } from "@/app/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950">
      <header className="relative bg-white text-neutral-800 flex flex-col items-center gap-1 px-5 pb-3">
        {/* Full-width thin band. */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-5 bg-gray-900 pointer-events-none" />

        {/* Notch + logo always sit on their own row (mt-5 clears the band above),
            centered via mx-auto. The controls sit on a second row below. Two
            separate rows can never overlap at any viewport width — no breakpoint
            math to get wrong. */}
        <div className="relative isolate w-fit mx-auto mt-5 px-6 pt-1.5 pb-2.5">
          <div aria-hidden className="absolute inset-0 -z-10 bg-gray-900 rounded-b-[26px] pointer-events-none" />
          <div className="leading-tight text-center">
            <div className="font-black text-[23px] uppercase tracking-tight text-white">Koolector</div>
            <div className="text-[10px] text-neutral-300 tracking-wide -mt-0.5">
              Billing and Collections Mastered
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center flex-wrap gap-3 text-xs text-neutral-500 relative z-10">
          <span className="truncate max-w-[220px] sm:max-w-none">
            {user.email} · <span className="text-neutral-700">{ROLE_LABEL[user.role]}</span>
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="bg-neutral-100 border border-neutral-300 text-neutral-800 px-2.5 py-1 text-xs shrink-0"
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
