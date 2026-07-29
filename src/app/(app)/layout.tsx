import { requireUser, ROLE_LABEL } from "@/lib/auth";
import { NAV_ITEMS } from "@/lib/nav";
import { NavBar } from "@/components/NavBar";
import { signOut } from "@/app/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-gray-900 text-white px-5 py-2.5 flex items-center gap-4 flex-wrap">
        <div className="font-bold text-[15px]">
          🏢 Vista Court <span className="text-blue-300">Collections</span>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
          <span>
            {user.email} · <span className="text-gray-200">{ROLE_LABEL[user.role]}</span>
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md bg-gray-800 border border-gray-700 text-gray-200 px-2.5 py-1 text-xs"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      <NavBar items={items} />

      <main className="max-w-5xl w-full mx-auto p-5 flex-1">{children}</main>
    </div>
  );
}
