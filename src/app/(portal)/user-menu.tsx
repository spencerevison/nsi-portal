"use client";

import { UserButton } from "@clerk/nextjs";
import { SlidersHorizontal } from "lucide-react";

export function UserMenu() {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link
          href="/profile"
          label="Settings"
          labelIcon={<SlidersHorizontal className="size-4" />}
        />
        <UserButton.Action label="manageAccount" />
      </UserButton.MenuItems>
    </UserButton>
  );
}
