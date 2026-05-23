import Header from "@/components/dashboard/header";
import { getUsers } from "@/models/user";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(value?: Date | string | null) {
  if (!value) {
    return "—";
  }

  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return "—";
  }

  return dateFormatter.format(dateValue);
}

function getInitial(value?: string | null) {
  if (!value) {
    return "U";
  }
  return value.trim().charAt(0).toUpperCase() || "U";
}

export default async function AdminUsersPage() {
  const users = (await getUsers(1, 50)) ?? [];

  const withAvatarCount = users.filter((user) => Boolean(user.avatar_url)).length;
  const withEmailCount = users.filter((user) => Boolean(user.email)).length;

  return (
    <div className="flex flex-col gap-4">
      <Header />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="relative isolate px-4 py-4 md:px-6 md:py-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(760px_260px_at_0%_0%,hsl(214_85%_58%_/_0.18),transparent_64%),radial-gradient(680px_240px_at_100%_0%,hsl(192_72%_48%_/_0.15),transparent_67%)]" />

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
              <div className="rounded-3xl border border-border/70 bg-card/85 p-6 shadow-[0_28px_80px_-58px_rgba(0,0,0,1)] backdrop-blur-sm">
                <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Latest 50 registered users and account profile information.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-card/85 p-5 shadow-[0_22px_60px_-54px_rgba(0,0,0,1)] backdrop-blur-sm">
                  <div className="text-2xl font-semibold">{users.length}</div>
                  <div className="mt-1 text-sm text-muted-foreground">Loaded Users</div>
                </div>
                <div className="rounded-2xl border border-sky-500/30 bg-sky-500/8 p-5 shadow-[0_22px_60px_-54px_rgba(0,0,0,1)] backdrop-blur-sm">
                  <div className="text-2xl font-semibold">{withAvatarCount}</div>
                  <div className="mt-1 text-sm text-muted-foreground">With Avatar</div>
                </div>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-5 shadow-[0_22px_60px_-54px_rgba(0,0,0,1)] backdrop-blur-sm">
                  <div className="text-2xl font-semibold">{withEmailCount}</div>
                  <div className="mt-1 text-sm text-muted-foreground">With Email</div>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/90 shadow-[0_28px_80px_-58px_rgba(0,0,0,1)] backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
                  <h2 className="font-semibold">Users</h2>
                  <span className="text-sm text-muted-foreground">{users.length} total</span>
                </div>

                {users.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                    No users found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/70 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                          <th className="px-6 py-3 font-medium">User</th>
                          <th className="px-6 py-3 font-medium">UUID</th>
                          <th className="px-6 py-3 font-medium">Email</th>
                          <th className="px-6 py-3 font-medium">Created At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {users.map((user, index) => {
                          const fallbackName = user.nickname || user.email || "User";
                          const rowKey = user.uuid || `${user.email || "user"}-${index}`;

                          return (
                            <tr key={rowKey} className="transition hover:bg-muted/30">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  {user.avatar_url ? (
                                    <img
                                      src={user.avatar_url}
                                      alt={`${fallbackName} avatar`}
                                      className="h-10 w-10 rounded-full border border-border/70 object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-muted/45 text-sm font-semibold text-foreground/80">
                                      {getInitial(fallbackName)}
                                    </div>
                                  )}

                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-foreground">
                                      {user.nickname || "Unnamed"}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {user.signin_provider || "password"}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                                {user.uuid || "—"}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {user.email || "—"}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {formatDate(user.created_at)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
