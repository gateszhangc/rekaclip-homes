"use client";

import { signIn } from "next-auth/react";
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export default function () {
  const { data: session, status } = useSession();
  const oneTapRef = useRef<null | ((options: Record<string, unknown>, cb: (response: any) => void) => void)>(null);

  const loadOneTap = async () => {
    if (oneTapRef.current) {
      return oneTapRef.current;
    }
    const mod = await import("google-one-tap");
    oneTapRef.current = mod.default;
    return oneTapRef.current;
  };

  const oneTapLogin = async function () {
    const options = {
      client_id: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID,
      auto_select: false,
      cancel_on_tap_outside: false,
      context: "signin",
    };

    // console.log("onetap login trigger", options);

    const googleOneTap = await loadOneTap();
    if (!googleOneTap) return;

    googleOneTap(options, (response: any) => {
      console.log("onetap login ok", response);
      handleLogin(response.credential);
    });
  };

  const handleLogin = async function (credentials: string) {
    const res = await signIn("google-one-tap", {
      credential: credentials,
      redirect: false,
    });
    console.log("signIn ok", res);
  };

  useEffect(() => {
    // console.log("one tap login status", status, session);

    if (status === "unauthenticated") {
      oneTapLogin();

      const intervalId = setInterval(() => {
        oneTapLogin();
      }, 3000);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [status]);

  return <></>;
}
