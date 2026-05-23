"use client";

import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/app";
import { useTranslations } from "next-intl";

export default function SignIn() {
  const t = useTranslations();
  const { setShowSignModal } = useAppContext();

  return (
    <Button
      variant="default"
      onClick={() => setShowSignModal(true)}
      className="cursor-pointer landing-hero-button bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
    >
      {t("user.sign_in")}
    </Button>
  );
}
