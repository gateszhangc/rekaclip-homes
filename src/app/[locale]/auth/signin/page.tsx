import SignForm from "@/components/sign/form";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAuthEnabled } from "@/lib/auth";
import NextImage from "next/image";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl: string | undefined }>;
}) {
  if (!isAuthEnabled()) {
    return redirect("/");
  }

  const { callbackUrl } = await searchParams;
  const session = await auth();
  if (session) {
    return redirect(callbackUrl || "/");
  }

  return (
    <div className="landing-raphael dark flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/" className="flex items-center gap-2 self-center font-medium hover:opacity-80 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm text-primary-foreground">
            <NextImage
              src="/imgs/logos/logo.png"
              alt="logo"
              width={20}
              height={20}
              sizes="20px"
              className="size-5"
            />
          </div>
          <span className="text-xl font-serif tracking-tight">{process.env.NEXT_PUBLIC_PROJECT_NAME}</span>
        </a>
        <SignForm />
      </div>
    </div>
  );
}
