import "@/app/globals.css";

import { Link } from "@/i18n/navigation";
import { MdOutlineHome } from "react-icons/md";
import React from "react";

export default function LocaleLegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Link
        className="text-base-content cursor-pointer hover:opacity-80 transition-opacity"
        href="/"
      >
        <MdOutlineHome className="text-2xl mx-8 my-8" />
      </Link>
      <div className="text-md max-w-3xl mx-auto leading-loose pt-4 pb-8 px-8 prose prose-slate dark:prose-invert prose-headings:font-semibold prose-a:text-primary hover:prose-a:text-primary/80 prose-strong:text-base-content prose-code:text-base-content prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md">
        {children}
      </div>
    </div>
  );
}

