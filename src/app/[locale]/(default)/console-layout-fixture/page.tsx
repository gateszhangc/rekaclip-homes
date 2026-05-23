import ConsoleLayout from "@/components/console/layout";
import SignUser from "@/components/sign/user";
import type { Sidebar } from "@/types/blocks/sidebar";
import type { User } from "@/types/user";

const fixtureUser: User = {
  email: "nav@example.com",
  nickname: "NavUser",
  avatar_url: "",
};

const fixtureSidebar: Sidebar = {
  nav: {
    items: [
      {
        title: "My Orders",
        url: "/my-orders",
        icon: "RiOrderPlayLine",
      },
      {
        title: "My Credits",
        url: "/my-credits",
        icon: "RiBankCardLine",
      },
    ],
  },
};

export default async function ConsoleLayoutFixturePage() {
  return (
    <section className="space-y-6 py-8">
      <div
        data-testid="console-layout-fixture-nav"
        className="mx-auto flex max-w-6xl justify-end px-6 md:px-8"
      >
        <SignUser
          user={fixtureUser}
          triggerTestId="console-layout-nav-trigger"
          contentTestId="console-layout-nav-content"
        />
      </div>

      <ConsoleLayout sidebar={fixtureSidebar}>
        <div
          data-testid="console-layout-fixture-content"
          className="rounded-[24px] border border-border/70 bg-card/80 p-6 shadow-[0_18px_50px_rgba(15,15,25,0.24)]"
        >
          <h1 className="font-serif text-3xl font-semibold text-foreground">
            Console Layout Fixture
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifies that the shared console layout does not render a second
            account avatar.
          </p>
        </div>
      </ConsoleLayout>
    </section>
  );
}
