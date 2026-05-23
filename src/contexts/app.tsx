"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { cacheGet, cacheRemove } from "@/lib/cache";

import { CacheKey } from "@/services/constant";
import { ContextValue } from "@/types/context";
import { User } from "@/types/user";
import useOneTapLogin from "@/hooks/useOneTapLogin";
import { useSession } from "next-auth/react";
import { isAuthEnabled, isGoogleOneTapEnabled } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";

type SessionUser = {
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

const buildSessionUser = (sessionUser?: SessionUser | null): User | null => {
  if (!sessionUser) {
    return null;
  }

  const email = sessionUser.email?.trim() || "";
  const name = sessionUser.name?.trim() || "";
  const nickname = name || (email ? email.split("@")[0] : "User");

  return {
    email: email || name || "User",
    nickname,
    avatar_url: sessionUser.image || "",
  };
};

const AppContext = createContext({} as ContextValue);

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  if (isAuthEnabled() && isGoogleOneTapEnabled()) {
    useOneTapLogin();
  }

  const { data: session } = isAuthEnabled() ? useSession() : { data: null };

  const [showSignModal, setShowSignModal] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  const [showFeedback, setShowFeedback] = useState<boolean>(false);

  const authEventSentForUserUuidRef = useRef<string | null>(null);
  const logoutEventSentForUserUuidRef = useRef<string | null>(null);
  const previousUserRef = useRef<User | null>(null);

  const fetchUserInfo = async function () {
    try {
      const resp = await fetch("/api/get-user-info", {
        method: "POST",
      });

      if (!resp.ok) {
        throw new Error("fetch user info failed with status: " + resp.status);
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setUser(data);

      updateInvite(data);
    } catch (e) {
      console.log("fetch user info failed");
    }
  };

  const updateInvite = async (user: User) => {
    try {
      if (user.invited_by) {
        // user already been invited
        console.log("user already been invited", user.invited_by);
        return;
      }

      const inviteCode = cacheGet(CacheKey.InviteCode);
      if (!inviteCode) {
        // no invite code
        return;
      }

      const createdAtMs = Date.parse(user.created_at);
      if (Number.isNaN(createdAtMs)) {
        console.log("invalid user created_at", user.created_at);
        return;
      }

      const currentTimeMs = Date.now();
      const timeDiff = Math.floor((currentTimeMs - createdAtMs) / 1000);

      if (timeDiff <= 0 || timeDiff > 7200) {
        // user created more than 2 hours
        console.log("user created more than 2 hours");
        return;
      }

      // update invite relation
      console.log("update invite", inviteCode, user.uuid);
      const req = {
        invite_code: inviteCode,
        user_uuid: user.uuid,
      };
      const resp = await fetch("/api/update-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req),
      });
      if (!resp.ok) {
        throw new Error("update invite failed with status: " + resp.status);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setUser(data);
      cacheRemove(CacheKey.InviteCode);
    } catch (e) {
      console.log("update invite failed: ", e);
    }
  };

  useEffect(() => {
    if (!session?.user) {
      setUser(null);
      return;
    }

    const sessionUser = buildSessionUser(session.user);

    setUser((prev) => {
      if (!sessionUser) {
        return prev ?? null;
      }

      if (prev?.uuid && prev.email === sessionUser.email) {
        return prev;
      }

      return sessionUser;
    });

    fetchUserInfo();
  }, [session]);

  useEffect(() => {
    const prevUser = previousUserRef.current;
    const prevUuid = prevUser?.uuid;
    const nextUuid = user?.uuid;

    if (prevUuid && !nextUuid) {
      if (logoutEventSentForUserUuidRef.current !== prevUuid) {
        logoutEventSentForUserUuidRef.current = prevUuid;
        trackEvent("logout", {
          method: prevUser?.signin_provider || "unknown",
        });
      }

      // Allow the same user to be tracked again after a new login.
      authEventSentForUserUuidRef.current = null;
    }

    previousUserRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!user?.uuid) {
      return;
    }

    if (authEventSentForUserUuidRef.current === user.uuid) {
      return;
    }

    authEventSentForUserUuidRef.current = user.uuid;

    const method = user.signin_provider || "unknown";
    const createdAtMs =
      user.created_at instanceof Date
        ? user.created_at.getTime()
        : typeof user.created_at === "string"
        ? Date.parse(user.created_at)
        : Number.NaN;

    const diffMs = Number.isFinite(createdAtMs) ? Date.now() - createdAtMs : Number.NaN;
    const isNewSignup =
      Number.isFinite(diffMs) && diffMs >= 0 && diffMs <= 10 * 60 * 1000;

    trackEvent(isNewSignup ? "sign_up" : "login", { method });
  }, [user?.uuid, user?.signin_provider, user?.created_at]);

  return (
    <AppContext.Provider
      value={{
        showSignModal,
        setShowSignModal,
        user,
        setUser,
        showFeedback,
        setShowFeedback,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
