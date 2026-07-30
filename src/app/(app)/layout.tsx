import { requireUser, ROLE_LABEL } from "@/lib/auth";
import { NAV_ITEMS } from "@/lib/nav";
import { NavBar } from "@/components/NavBar";
import { signOut } from "@/app/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950">
      <header className="relative bg-white text-neutral-800 px-5 py-2.5 flex items-center gap-4 flex-wrap">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 bg-gray-900 pointer-events-none"
          style={{
            height: 54,
            clipPath:
              "path('M 0,0 L 4000,0 L 4000,10 L 300,10 C 280,10 280,54 260,54 L 60,54 C 40,54 40,10 20,10 L 0,10 Z')",
          }}
        />
        <div className="leading-tight relative z-10 pl-1">
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
