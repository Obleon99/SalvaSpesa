"use client";

import { useEffect, useRef } from "react";
import { AuthDialog } from "./auth-dialog";
import { LocationDialog } from "./location-dialog";
import { ProfileDialog } from "./profile-dialog";
import { useUserState } from "@/lib/user-state";

export function AppDialogs() {
  const { ready, location, dialog, openDialog } = useUserState();
  const askedForLocation = useRef(false);

  useEffect(() => {
    if (ready && !location && !askedForLocation.current) {
      askedForLocation.current = true;
      openDialog("location");
    }
  }, [ready, location, openDialog]);

  if (dialog === "location") return <LocationDialog />;
  if (dialog === "profile") return <ProfileDialog />;
  if (dialog === "auth") return <AuthDialog />;
  return null;
}
