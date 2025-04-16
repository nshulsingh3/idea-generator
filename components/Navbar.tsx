"use client";

import { cn } from "@/lib/utils";
import { useAuth, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import SettingsModal from "./SettingsModal";

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();

  return (
    <nav>
      <div className="py-8">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-1">
            <span className="text-xl font-semibold">YT</span>
            <span className="text-xl">✨</span>
          </Link>
          {isSignedIn && (
            <div className="flex items-center space-x-8 ml-auto mr-4 text-md">
              <Link
                href="/videos"
                className={cn(
                  "text-md",
                  pathname.startsWith("/videos")
                    ? "border-b-2 border-red-500 text-red-500"
                    : "text-primary hover:text-red-500 transition-all"
                )}
              >
                Videos
              </Link>
              <Link
                href="/ideas"
                className={cn(
                  "text-md",
                  pathname.startsWith("/ideas")
                    ? "border-b-2 border-red-500 text-red-500"
                    : "text-primary hover:text-red-500 transition-all"
                )}
              >
                Ideas
              </Link>
              <SettingsModal />
              <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
            </div>
          )}
          {!isSignedIn && (
            <Link href="/videos">
              <Button className="font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl">
                Get Started Now
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
