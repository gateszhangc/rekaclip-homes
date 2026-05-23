"use client";

import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Link } from "@/i18n/navigation";
import { User } from "@/types/user";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { NavItem } from "@/types/blocks/base";

interface SignUserProps {
  user: User;
  isAdmin?: boolean;
  triggerTestId?: string;
  contentTestId?: string;
}

export default function SignUser({
  user,
  isAdmin = false,
  triggerTestId,
  contentTestId,
}: SignUserProps) {
  const t = useTranslations();

  // Build dropdown items dynamically - removed nickname display per task 52
  const dropdownItems: NavItem[] = [
    {
      title: user.email,
    },
    {
      title: t("user.user_center"),
      url: "/my-orders",
    },

    // Only show Admin System for admin users
    ...(isAdmin ? [{
      title: t("user.admin_system"),
      url: "/admin/users",
    }] : []),
    {
      title: t("user.sign_out"),
      onClick: () => signOut(),
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar
          data-testid={triggerTestId}
          className="size-10 cursor-pointer ring-2 ring-primary/25 transition-all duration-300 hover:ring-primary/45"
        >
          <AvatarImage src={user.avatar_url} alt={user.nickname} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-semibold">
            {user.nickname?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-testid={contentTestId}
        className="mx-2 z-50 min-w-[320px] rounded-[24px] border border-white/10 bg-background/95 p-2 text-foreground shadow-[0_25px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
      >
        {dropdownItems.map((item, index) => (
          <React.Fragment key={index}>
            <DropdownMenuItem
              className="mx-1 cursor-pointer justify-center rounded-2xl px-4 py-3 text-foreground transition-all duration-200 hover:bg-primary/10 focus:bg-primary/15 focus:text-foreground"
            >
              {item.url ? (
                <Link href={item.url as any} target={item.target} className="w-full text-center">
                  {item.title}
                </Link>
              ) : index === 0 ? (
                <span className="w-full text-center text-muted-foreground">
                  {item.title}
                </span>
              ) : (
                <button onClick={item.onClick} className="w-full text-center">{item.title}</button>
              )}
            </DropdownMenuItem>
            {index !== dropdownItems.length - 1 && (
              <DropdownMenuSeparator className="mx-2 bg-white/10" />
            )}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
