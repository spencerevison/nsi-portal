"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { SlidersHorizontal } from "lucide-react";

export function UserMenu() {
  const { user } = useUser();
  const router = useRouter();
  const prevImageUrl = useRef(user?.imageUrl);

  // when Clerk's client-side user state changes (eg avatar update),
  // refresh server components so the new data is fetched
  useEffect(() => {
    if (prevImageUrl.current && user?.imageUrl !== prevImageUrl.current) {
      router.refresh();
    }
    prevImageUrl.current = user?.imageUrl;
  }, [user?.imageUrl, router]);

  return (
    <div className="w-7">
      <UserButton>
        <UserButton.MenuItems>
          <UserButton.Link
            href="/profile"
            label="Profile & Settings"
            labelIcon={<SlidersHorizontal className="size-4" />}
          />
          <UserButton.Action label="manageAccount" />
        </UserButton.MenuItems>
      </UserButton>
    </div>
  );
}
