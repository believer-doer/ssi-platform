"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        // Force a hard refresh to clear all client-side state/context
        window.location.assign("/login");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-200 group"
      title="Logout"
    >
      <LogOut className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isLoading ? 'animate-pulse' : ''}`} />
      <span>{isLoading ? "Logging out..." : "Logout"}</span>
    </button>
  );
}
