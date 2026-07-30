import { requireUser, ROLE_LABEL } from "@/lib/auth";
import { NAV_ITEMS } from "@/lib/nav";
import { NavBar } from "@/components/NavBar";
import { signOut } from "@/app/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950">
      <div className="h-2 bg-black" />
      <header className="bg-white text-neutral-800 px-5 py-2.5 flex items-center gap-4 flex-wrap">
        <div className="leading-tight">
          <div className="font-black text-[23px] uppercase tracking-tight text-neutral-900">Koolector</div>
          <div className="text-[10px] text-neutral-500 tracking-wide -mt-0.5">
            Billing and Collections Mastered
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-neutral-500">
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
