import { getCurrentUser, ROLE_LABEL } from "@/lib/auth";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { NAV_ITEMS } from "@/lib/nav";

export default async function ForbiddenPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const homeHref = NAV_ITEMS.find((item) => user.role && item.roles.includes(user.role))?.href;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm bg-neutral-800 border border-neutral-700 p-6 shadow-sm text-center">
        <h1 className="text-base font-bold text-gray-100 mb-1">403 — Not allowed</h1>
        <p className="text-sm text-gray-400 mb-6">
          {user.role ? ROLE_LABEL[user.role] : "Your role"} doesn&apos;t have access to that
          screen.
        </p>
        <div className="flex gap-2">
          {homeHref && (
            <a
              href={homeHref}
              className="flex-1 bg-neutral-100 text-neutral-900 text-sm font-semibold py-2"
            >
              Back
            </a>
          )}
          <form action={signOut} className="flex-1">
            <button
              type="submit"
              className="w-full bg-gray-900 border border-neutral-600 text-gray-100 text-sm font-semibold py-2"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
