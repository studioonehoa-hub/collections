import type { CurrentUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/auth";

export function PlaceholderScreen({
  title,
  sub,
  user,
}: {
  title: string;
  sub: string;
  user: CurrentUser & { role: NonNullable<CurrentUser["role"]> };
}) {
  return (
    <section>
      <h2 className="text-[17px] font-semibold text-gray-900">{title}</h2>
      <p className="text-gray-500 text-[12.5px] mb-4">{sub}</p>
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
        Access confirmed server-side for <span className="font-semibold">{ROLE_LABEL[user.role]}</span> ({user.email}).
        Screen content ships next.
      </div>
    </section>
  );
}
