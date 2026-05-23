"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SiGoogle } from "react-icons/si";
import { FcGoogle } from "react-icons/fc";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signIn } from "next-auth/react";
import { useAppContext } from "@/contexts/app";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import NextImage from "next/image";
import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SignModal() {
  const { showSignModal, setShowSignModal } = useAppContext();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("google", { callbackUrl: window.location.href });
    } catch (err) {
      setError("Sign in failed. Please try again.");
      setIsLoading(false);
    }
  };

  const content = (
    <div className="flex flex-col items-center gap-6 py-6 w-full max-w-sm mx-auto">
      {/* Logo Area */}
      <div className="flex items-center justify-center rounded-2xl border border-border/50 bg-background/50 p-4 shadow-sm">
        <div className="relative w-16 h-16">
          <NextImage
            src="/favicon.svg"
            alt="Logo"
            fill
            className="object-contain"
          />
        </div>
      </div>

      {/* Text Area */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome to EasyClaw
        </h2>
        <p className="text-sm text-muted-foreground">
          Sign in to deploy and manage OpenClaw
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="w-full">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Action Area */}
      <div className="w-full">
        <Button
          className="w-full h-12 text-base rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-3 shadow-lg"
          onClick={handleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <FcGoogle className="w-6 h-6" />
          )}
          <span className="font-medium">
            {isLoading ? "Signing in..." : "Continue with Google"}
          </span>
        </Button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={showSignModal} onOpenChange={setShowSignModal}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl border border-border/70 bg-card/95 p-0 shadow-sm">
          <DialogTitle className="sr-only">Sign In</DialogTitle>
          <div className="p-8">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={showSignModal} onOpenChange={setShowSignModal}>
      <DrawerContent className="rounded-t-3xl border-t border-border/70 bg-card/95 shadow-sm">
        <DrawerTitle className="sr-only">Sign In</DrawerTitle>
        <div className="px-6 pb-12 pt-8">
          {content}
          <div className="mt-8">
            <DrawerClose asChild>
              <Button variant="ghost" className="w-full rounded-full">
                Cancel
              </Button>
            </DrawerClose>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
