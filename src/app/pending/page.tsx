import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/actions";

export default async function PendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role) redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm text-center">
        <h1 className="text-base font-bold text-gray-100 mb-1">Account pending</h1>
        <p className="text-sm text-gray-400 mb-6">
          Signed in as {user.email}. Your account doesn&apos;t have a role assigned yet — ask
          the Super Admin to set one before you can continue.
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-lg bg-gray-900 border border-gray-700 text-gray-100 text-sm font-semibold py-2"
          >
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
