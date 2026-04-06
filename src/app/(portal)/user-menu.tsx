"use client";

import { UserButton } from "@clerk/nextjs";
import { Settings } from "lucide-react";

export function UserMenu() {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link
          href="/profile"
          label="Settings"
          labelIcon={<Settings className="size-4" />}
        />
        <UserButton.Action label="manageAccount" />
      </UserButton.MenuItems>
    </UserButton>
  );
}
