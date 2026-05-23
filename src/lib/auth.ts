const isAuthGloballyDisabled =
  process.env.NEXT_PUBLIC_AUTH_DISABLED === "true" ||
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "false";

export function isGoogleAuthEnabled(): boolean {
  return !!(
    !isAuthGloballyDisabled &&
    process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED !== "false" &&
    process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID
  );
}

export function isGitHubAuthEnabled(): boolean {
  return !!(
    !isAuthGloballyDisabled &&
    process.env.NEXT_PUBLIC_AUTH_GITHUB_ENABLED === "true"
  );
}

export function isGoogleOneTapEnabled(): boolean {
  return !!(
    !isAuthGloballyDisabled &&
    process.env.NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED === "true" &&
    process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID
  );
}

export function isAuthEnabled(): boolean {
  if (isAuthGloballyDisabled) {
    return false;
  }

  return (
    isGoogleAuthEnabled() ||
    isGitHubAuthEnabled() ||
    isGoogleOneTapEnabled()
  );
}
