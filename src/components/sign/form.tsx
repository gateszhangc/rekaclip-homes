"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiGithub, SiGoogle } from "react-icons/si";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isGitHubAuthEnabled, isGoogleAuthEnabled } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

export default function SignForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const t = useTranslations();
  const googleAuthEnabled = isGoogleAuthEnabled();
  const githubAuthEnabled = isGitHubAuthEnabled();

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/40 bg-card/60 backdrop-blur-md shadow-2xl">
        <CardHeader className="text-center space-y-2 pt-8">
          <CardTitle className="text-3xl font-serif landing-title-highlight pb-2">
            {t("sign_modal.sign_in_title")}
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground/80">
            {t("sign_modal.sign_in_description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <div className="grid gap-6">
            <div className="flex flex-col gap-4">
              {googleAuthEnabled && (
                <Button
                  variant="outline"
                  className="w-full h-12 text-base rounded-full landing-hero-button hover:bg-primary/10 hover:border-primary/50 hover:text-foreground transition-all duration-300"
                  onClick={() => signIn("google")}
                >
                  <SiGoogle className="w-5 h-5 mr-2" />
                  {t("sign_modal.google_sign_in")}
                </Button>
              )}
              {githubAuthEnabled && (
                <Button
                  variant="outline"
                  className="w-full h-12 text-base rounded-full landing-hero-button hover:bg-primary/10 hover:border-primary/50 hover:text-foreground transition-all duration-300"
                  onClick={() => signIn("github")}
                >
                  <SiGithub className="w-5 h-5 mr-2" />
                  {t("sign_modal.github_sign_in")}
                </Button>
              )}
            </div>

            {false && (
              <>
                <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border/50">
                  <span className="relative z-10 bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      className="h-12 rounded-lg bg-background/50 border-input/50 focus:border-primary/50 focus:ring-primary/20"
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <a
                        href="#"
                        className="ml-auto text-sm underline-offset-4 hover:underline text-muted-foreground hover:text-primary"
                      >
                        Forgot your password?
                      </a>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      className="h-12 rounded-lg bg-background/50 border-input/50 focus:border-primary/50 focus:ring-primary/20"
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-full text-base font-semibold shadow-lg hover:shadow-primary/20">
                    Login
                  </Button>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <a href="#" className="underline underline-offset-4 hover:text-primary">
                    Sign up
                  </a>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary transition-colors">
        By clicking continue, you agree to our{" "}
        <Link href="/terms-of-service" target="_blank">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy-policy" target="_blank">
          Privacy Policy
        </Link>
        .
      </div>
    </div>
  );
}
