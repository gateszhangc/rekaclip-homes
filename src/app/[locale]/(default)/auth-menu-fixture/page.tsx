import SignUser from "@/components/sign/user";
import type { User } from "@/types/user";

const adminUser: User = {
  email: "gateszhang92@gmail.com",
  nickname: "Admin",
  avatar_url: "",
};

const memberUser: User = {
  email: "member@example.com",
  nickname: "Member",
  avatar_url: "",
};

export default function AuthMenuFixturePage() {
  return (
    <section className="container py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Auth Menu Fixture</h1>
          <p className="text-muted-foreground">
            Controlled user-menu states for Playwright validation.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div
            data-testid="auth-menu-admin-fixture"
            className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-sm"
          >
            <div className="mb-4 space-y-1">
              <h2 className="text-lg font-medium">Admin User</h2>
              <p className="text-sm text-muted-foreground">
                Should expose the admin entry in the dropdown.
              </p>
            </div>
            <SignUser
              user={adminUser}
              isAdmin
              triggerTestId="auth-menu-admin-trigger"
              contentTestId="auth-menu-admin-content"
            />
          </div>

          <div
            data-testid="auth-menu-member-fixture"
            className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-sm"
          >
            <div className="mb-4 space-y-1">
              <h2 className="text-lg font-medium">Non-Admin User</h2>
              <p className="text-sm text-muted-foreground">
                Should not expose the admin entry in the dropdown.
              </p>
            </div>
            <SignUser
              user={memberUser}
              triggerTestId="auth-menu-member-trigger"
              contentTestId="auth-menu-member-content"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
