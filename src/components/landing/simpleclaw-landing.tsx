"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/app";
import { isAuthEnabled } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import {
  BACKEND_TIMEOUT_ERROR_CODE,
  DISCORD_MESSAGE_CONTENT_INTENT_DISABLED_ERROR_CODE,
  DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE,
  NETWORK_UNSTABLE_ERROR_CODE,
  NO_AVAILABLE_ACCOUNT_ERROR_CODE,
  NO_AVAILABLE_NODE_ERROR_CODE,
  normalizeDeploymentErrorCode,
  SUBSCRIPTION_REQUIRED_ERROR_CODE,
  WHATSAPP_K8S_ONLY_ERROR_CODE,
  WHATSAPP_SESSION_UNAUTHORIZED_ERROR_CODE,
} from "@/lib/deploy-errors";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ExternalLink, Zap, Loader2, RefreshCw } from "lucide-react";

type TokenBackedChannel = "telegram" | "discord";
type ChannelId = TokenBackedChannel | "whatsapp";
type WhatsAppLoginStatus =
  | "starting"
  | "waiting_qr"
  | "qr_ready"
  | "connected"
  | "failed"
  | "cancelled";
type WhatsAppLoginSnapshot = {
  sessionId: string;
  status: WhatsAppLoginStatus;
  message: string;
  rawOutput: string;
  plainOutput: string;
  qrAscii: string | null;
  qrSvgDataUrl: string | null;
  qrUpdatedAt: string | null;
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
  exitCode: number | null;
  isTerminal: boolean;
};
type WhatsAppOutputMode = "plain" | "raw";
type DashboardSessionStatus = "starting" | "ready" | "failed";
type DashboardLogEntry = {
  id: string;
  level: "info" | "error";
  message: string;
  at: string;
};
type DashboardSessionSnapshot = {
  sessionId: string;
  status: DashboardSessionStatus;
  localPort: number | null;
  dashboardUrl: string | null;
  maskedDashboardUrl: string | null;
  startedAt: string;
  updatedAt: string;
  lastError: string | null;
  logs: DashboardLogEntry[];
  target: {
    namespace: string;
    deployment: string;
    pod: string;
    container: string;
    gatewayPort: number;
  };
};
type DashboardCopyState = "idle" | "copied" | "failed";

const MODELS = [
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    subtitle: "Available",
    icon: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Claude_AI_symbol.svg",
    available: true,
  },
  {
    id: "gpt-5-4",
    name: "GPT-5.4",
    subtitle: "Available",
    icon: "https://img.icons8.com/androidL/512/FFFFFF/chatgpt.png",
    available: true,
  },
  {
    id: "gemini-3-pro",
    name: "Gemini 3.1 Pro",
    subtitle: "Available",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Google_Gemini_icon_2025.svg/960px-Google_Gemini_icon_2025.svg.png",
    available: true,
  },
];

const CHANNELS: Array<{
  id: ChannelId;
  name: string;
  subtitle: string;
  icon: string;
  available: boolean;
}> = [
  {
    id: "telegram",
    name: "Telegram",
    subtitle: "Available",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/960px-Telegram_logo.svg.png",
    available: true,
  },
  {
    id: "discord",
    name: "Discord",
    subtitle: "Available",
    icon: "https://scbwi-storage-prod.s3.amazonaws.com/images/discord-mark-blue_rA6tXJo.png",
    available: true,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    subtitle: "Available",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/960px-WhatsApp.svg.png",
    available: true,
  },
];

const isTokenBackedChannel = (value: string): value is TokenBackedChannel =>
  value === "telegram" || value === "discord";

type DeployStatus = "idle" | "checking" | "running" | "failed";
type DeployFailureSource = "deploy_create" | "deploy_poll";
type TransientPollFailureAction = "retrying" | "failed" | "not_transient";

const TRANSIENT_NETWORK_PATTERNS = [
  /network/i,
  /fetch failed/i,
  /backend unavailable/i,
  /abort/i,
  /timeout/i,
  /econnrefused/i,
  /etimedout/i,
  /econnreset/i,
];

const parsePositiveInt = (
  raw: string | undefined,
  fallbackValue: number
): number => {
  if (!raw) {
    return fallbackValue;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }

  return Math.floor(parsed);
};

const getPollTransientFailureMax = (): number =>
  parsePositiveInt(
    process.env.NEXT_PUBLIC_DEPLOY_POLL_TRANSIENT_MAX ||
      process.env.DEPLOY_POLL_TRANSIENT_MAX,
    3
  );

const isTransientNetworkFailure = ({
  rawMessage,
  errorCode,
  httpStatus,
}: {
  rawMessage?: string | null;
  errorCode?: string | null;
  httpStatus?: number;
}): boolean => {
  const normalizedErrorCode = normalizeDeploymentErrorCode(errorCode, rawMessage);
  if (
    normalizedErrorCode === NO_AVAILABLE_ACCOUNT_ERROR_CODE ||
    normalizedErrorCode === NO_AVAILABLE_NODE_ERROR_CODE ||
    normalizedErrorCode === SUBSCRIPTION_REQUIRED_ERROR_CODE
  ) {
    return false;
  }

  if (typeof httpStatus === "number" && httpStatus >= 500) {
    return true;
  }

  if (normalizedErrorCode === NETWORK_UNSTABLE_ERROR_CODE) {
    return true;
  }

  const message = (rawMessage || "").trim();
  if (!message) {
    return false;
  }

  return TRANSIENT_NETWORK_PATTERNS.some((pattern) => pattern.test(message));
};

export default function SimpleClawLanding() {
  const { user, setShowSignModal, setUser } = useAppContext();
  const t = useTranslations("simpleclaw_landing");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<ChannelId | "">("");
  const [channelTokens, setChannelTokens] = useState<
    Partial<Record<TokenBackedChannel, string>>
  >({});
  const [status, setStatus] = useState<DeployStatus>("idle");
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [requestedModel, setRequestedModel] = useState<string | null>(null);
  const [resolvedModel, setResolvedModel] = useState<string | null>(null);
  const [whatsappLogin, setWhatsappLogin] = useState<WhatsAppLoginSnapshot | null>(
    null
  );
  const [isBootstrappingWhatsappLogin, setIsBootstrappingWhatsappLogin] =
    useState(false);
  const [isStartingWhatsappLogin, setIsStartingWhatsappLogin] = useState(false);
  const [isRefreshingWhatsappLogin, setIsRefreshingWhatsappLogin] =
    useState(false);
  const [isCancellingWhatsappLogin, setIsCancellingWhatsappLogin] =
    useState(false);
  const [whatsappLoginRequestError, setWhatsappLoginRequestError] = useState<
    string | null
  >(null);
  const [restoredWhatsappLoginOnLoad, setRestoredWhatsappLoginOnLoad] =
    useState(false);
  const [whatsappOutputMode, setWhatsappOutputMode] =
    useState<WhatsAppOutputMode>("plain");
  const [dashboardSession, setDashboardSession] =
    useState<DashboardSessionSnapshot | null>(null);
  const [isBootstrappingDashboard, setIsBootstrappingDashboard] =
    useState(false);
  const [isStartingDashboard, setIsStartingDashboard] = useState(false);
  const [isStoppingDashboard, setIsStoppingDashboard] = useState(false);
  const [dashboardRequestError, setDashboardRequestError] = useState<
    string | null
  >(null);
  const [restoredDashboardOnLoad, setRestoredDashboardOnLoad] = useState(false);
  const [dashboardCopyState, setDashboardCopyState] =
    useState<DashboardCopyState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [guideChannel, setGuideChannel] = useState<TokenBackedChannel | null>(null);
  const [showChannelGuide, setShowChannelGuide] = useState(false);
  const [guideToken, setGuideToken] = useState("");
  const hasRedirectedToPricingRef = useRef(false);
  const deployRequestInFlightRef = useRef(false);
  /** Prevents setInterval from stacking concurrent polls when each fetch is slower than the interval. */
  const deployPollInFlightRef = useRef(false);
  const pollTransientFailureCountRef = useRef(0);
  const maxPollTransientFailuresRef = useRef(getPollTransientFailureMax());
  const deployStartedAtRef = useRef<number | null>(null);
  const deploySuccessSentRef = useRef(false);
  const deployFailureSentRef = useRef(false);
  const deployContextRef = useRef<{
    channel: string;
    modelRequested: string | null;
    subscriptionTier: string | null;
  } | null>(null);

  const authEnabled = isAuthEnabled();
  const isSignedIn = authEnabled ? Boolean(user) : true;
  const noAvailableAccountMessage = t("errors.no_available_account");
  const networkUnstableMessage = t("errors.network_unstable");
  const noAvailableNodeMessage = t.has("errors.no_available_node")
    ? t("errors.no_available_node")
    : t("errors.deployment_failed_try_again");
  const discordIntentDisabledMessage = t.has(
    "errors.discord_message_content_intent_disabled"
  )
    ? t("errors.discord_message_content_intent_disabled")
    : "Discord Message Content Intent is disabled. Enable it in Discord Developer Portal before deploying.";
  const deploymentSeatUnavailableMessage = t.has(
    "errors.deployment_seat_unavailable"
  )
    ? t("errors.deployment_seat_unavailable")
    : t("errors.deployment_failed_try_again");
  const whatsappK8sOnlyMessage = t.has("errors.whatsapp_k8s_only")
    ? t("errors.whatsapp_k8s_only")
    : "WhatsApp deployments currently require the k8s runtime.";
  const whatsappSessionUnauthorizedMessage = t.has(
    "errors.whatsapp_session_unauthorized"
  )
    ? t("errors.whatsapp_session_unauthorized")
    : "This WhatsApp session is no longer valid. Start QR login again.";
  const whatsappLoginFailedMessage = t.has("errors.whatsapp_login_failed")
    ? t("errors.whatsapp_login_failed")
    : t("errors.deployment_failed_try_again");
  const whatsappLoginCancelledMessage = t.has("errors.whatsapp_login_cancelled")
    ? t("errors.whatsapp_login_cancelled")
    : t("errors.deployment_failed_try_again");
  const whatsappWaitForOutputTimeoutMessage = t.has("errors.whatsapp_wait_for_qr_timeout")
    ? t("errors.whatsapp_wait_for_qr_timeout")
    : t("errors.deployment_failed_try_again");
  const selectedTokenChannel = isTokenBackedChannel(selectedChannel)
    ? selectedChannel
    : null;
  const guideTitleKey =
    guideChannel === "discord" ? "discord.dialog_title" : "telegram.dialog_title";
  const guideTokenLabelKey =
    guideChannel === "discord" ? "discord.token_label" : "telegram.token_label";
  const guideTokenPlaceholderKey =
    guideChannel === "discord"
      ? "discord.token_placeholder"
      : "telegram.token_placeholder";
  const guideSaveLabelKey =
    guideChannel === "discord"
      ? "discord.save_and_connect"
      : "telegram.save_and_connect";

  const toUserFacingWhatsAppLoginMessage = (
    snapshot?: WhatsAppLoginSnapshot | null
  ): string | null => {
    if (!snapshot) {
      return null;
    }

    if (snapshot.status === "starting") {
      return t.has("whatsapp.status_starting")
        ? t("whatsapp.status_starting")
        : snapshot.message;
    }

    if (snapshot.status === "waiting_qr") {
      return t.has("whatsapp.status_waiting_qr")
        ? t("whatsapp.status_waiting_qr")
        : snapshot.message;
    }

    if (snapshot.status === "qr_ready") {
      return t.has("whatsapp.status_qr_ready")
        ? t("whatsapp.status_qr_ready")
        : snapshot.message;
    }

    if (snapshot.status === "connected") {
      return t.has("whatsapp.status_connected")
        ? t("whatsapp.status_connected")
        : snapshot.message;
    }

    if (snapshot.status === "cancelled") {
      return whatsappLoginCancelledMessage;
    }

    return whatsappLoginFailedMessage;
  };

  const formatWhatsappTimestamp = (value?: string | null): string => {
    if (!value) {
      return "—";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleTimeString();
  };

  const toUserFacingDashboardMessage = (
    snapshot?: DashboardSessionSnapshot | null
  ): string | null => {
    if (!snapshot) {
      return null;
    }

    if (snapshot.status === "starting") {
      return t.has("whatsapp.dashboard_status_starting")
        ? t("whatsapp.dashboard_status_starting")
        : "Starting Gateway Dashboard fallback...";
    }

    if (snapshot.status === "ready") {
      return t.has("whatsapp.dashboard_status_ready")
        ? t("whatsapp.dashboard_status_ready")
        : "Gateway Dashboard is ready.";
    }

    if (snapshot.lastError?.trim()) {
      return snapshot.lastError;
    }

    return t.has("whatsapp.dashboard_status_failed")
      ? t("whatsapp.dashboard_status_failed")
      : "Gateway Dashboard fallback failed.";
  };

  const openChannelGuide = (channel: TokenBackedChannel) => {
    setGuideChannel(channel);
    setGuideToken(channelTokens[channel] || "");
    setShowChannelGuide(true);
  };

  const releaseDeployRequestLock = () => {
    deployRequestInFlightRef.current = false;
  };

  const buildPricingHref = () => {
    if (typeof window === "undefined") {
      return "/pricing?source=deploy";
    }

    const [localeSegment] = window.location.pathname
      .split("/")
      .filter(Boolean);
    return localeSegment
      ? `/${localeSegment}/pricing?source=deploy`
      : "/pricing?source=deploy";
  };

  const toUserFacingDeployError = (
    message?: string | null,
    errorCode?: string | null
  ): string => {
    const raw = (message || "").trim();
    const normalizedErrorCode = normalizeDeploymentErrorCode(errorCode, raw);
    if (normalizedErrorCode === NO_AVAILABLE_ACCOUNT_ERROR_CODE) {
      if (/provider=kie\b/i.test(raw)) {
        return t.has("errors.no_available_kie_account")
          ? t("errors.no_available_kie_account")
          : "No Kie account is available right now. Please ask the admin to import a Kie account.";
      }
      return noAvailableAccountMessage;
    }

    if (normalizedErrorCode === NO_AVAILABLE_NODE_ERROR_CODE) {
      return noAvailableNodeMessage;
    }

    if (normalizedErrorCode === DEPLOYMENT_SEAT_UNAVAILABLE_ERROR_CODE) {
      return deploymentSeatUnavailableMessage;
    }

    if (
      normalizedErrorCode === DISCORD_MESSAGE_CONTENT_INTENT_DISABLED_ERROR_CODE
    ) {
      return discordIntentDisabledMessage;
    }

    if (normalizedErrorCode === NETWORK_UNSTABLE_ERROR_CODE) {
      return networkUnstableMessage;
    }

    if (normalizedErrorCode === BACKEND_TIMEOUT_ERROR_CODE) {
      return t.has("errors.deploy_backend_timeout")
        ? t("errors.deploy_backend_timeout")
        : "The deploy service took too long to respond. Please try again in a moment.";
    }

    if (normalizedErrorCode === WHATSAPP_K8S_ONLY_ERROR_CODE) {
      return whatsappK8sOnlyMessage;
    }

    if (normalizedErrorCode === WHATSAPP_SESSION_UNAUTHORIZED_ERROR_CODE) {
      return whatsappSessionUnauthorizedMessage;
    }

    if (/Timed out waiting for the first WhatsApp QR code/i.test(raw)) {
      return whatsappWaitForOutputTimeoutMessage;
    }

    if (/WhatsApp login was cancelled/i.test(raw)) {
      return whatsappLoginCancelledMessage;
    }

    if (/WhatsApp login/i.test(raw)) {
      return whatsappLoginFailedMessage;
    }

    if (TRANSIENT_NETWORK_PATTERNS.some((pattern) => pattern.test(raw))) {
      return networkUnstableMessage;
    }

    return t("errors.deployment_failed_try_again");
  };

  const redirectToPricing = (_source: DeployFailureSource) => {
    if (hasRedirectedToPricingRef.current) {
      return;
    }

    hasRedirectedToPricingRef.current = true;
    setStatus("idle");
    setError(null);
    setDeploymentId(null);

    window.location.assign(buildPricingHref());
  };

  const handleDeployFailure = ({
    rawMessage,
    errorCode,
    source,
  }: {
    rawMessage?: string | null;
    errorCode?: string | null;
    source: DeployFailureSource;
  }): boolean => {
    if (hasRedirectedToPricingRef.current) {
      return true;
    }

    const normalizedErrorCode = normalizeDeploymentErrorCode(errorCode, rawMessage);

    if (!deployFailureSentRef.current) {
      deployFailureSentRef.current = true;
      const durationMs =
        typeof deployStartedAtRef.current === "number"
          ? Date.now() - deployStartedAtRef.current
          : undefined;
      const ctx = deployContextRef.current;

      trackEvent("deploy_failed", {
        channel: ctx?.channel || selectedChannel || "unknown",
        model_requested:
          ctx?.modelRequested || requestedModel || selectedModel || null,
        model_resolved: resolvedModel || null,
        subscription_tier: ctx?.subscriptionTier || user?.subscriptionTier || null,
        error_code: normalizedErrorCode || errorCode || "unknown",
        source,
        duration_ms: typeof durationMs === "number" ? durationMs : undefined,
      });
    }

    if (normalizedErrorCode === SUBSCRIPTION_REQUIRED_ERROR_CODE) {
      redirectToPricing(source);
      return true;
    }

    setStatus("failed");
    setError(toUserFacingDeployError(rawMessage, normalizedErrorCode));
    return false;
  };

  const handleTransientPollFailure = ({
    rawMessage,
    errorCode,
    httpStatus,
  }: {
    rawMessage?: string | null;
    errorCode?: string | null;
    httpStatus?: number;
  }): TransientPollFailureAction => {
    if (!isTransientNetworkFailure({ rawMessage, errorCode, httpStatus })) {
      return "not_transient";
    }

    pollTransientFailureCountRef.current += 1;
    if (pollTransientFailureCountRef.current < maxPollTransientFailuresRef.current) {
      setStatus("checking");
      setError(null);
      return "retrying";
    }

    pollTransientFailureCountRef.current = 0;
    handleDeployFailure({
      rawMessage: networkUnstableMessage,
      source: "deploy_poll",
    });
    return "failed";
  };

  const ensureDeployEligibility = async (): Promise<boolean> => {
    if (!authEnabled) {
      return true;
    }

    if (!isSignedIn) {
      trackEvent("deploy_blocked", {
        reason: "not_signed_in",
        channel: selectedChannel || "unknown",
        model_requested: selectedModel || null,
        subscription_tier: user?.subscriptionTier || null,
      });
      setShowSignModal(true);
      return false;
    }

    try {
      const resp = await fetch("/api/get-user-info", { method: "POST" });
      const payload = await resp.json().catch(() => null);

      const code = payload?.code;
      const latestUser = payload?.data;

      if (!resp.ok || code !== 0 || !latestUser) {
        // Session may have expired.
        if (code === -2) {
          trackEvent("deploy_blocked", {
            reason: "session_expired",
            channel: selectedChannel || "unknown",
            model_requested: selectedModel || null,
            subscription_tier: user?.subscriptionTier || null,
          });
          setShowSignModal(true);
          return false;
        }
        return true;
      }

      setUser(latestUser);
      return true;
    } catch {
      return true;
    }
  };

  useEffect(() => {
    if (status !== "checking") {
      releaseDeployRequestLock();
    }
  }, [status]);

  useEffect(() => {
    if (status !== "checking" || !deploymentId) return;

    const startTime = Date.now();
    const MAX_POLLING_TIME = (() => {
      const raw = process.env.NEXT_PUBLIC_DEPLOY_POLL_TIMEOUT_MS;
      const parsed = raw ? Number(raw) : Number.NaN;
      // Default to 10 minutes (first deploy can include pulling a large image).
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 10 * 60 * 1000;
    })();
    const timeoutMinutes = Math.max(1, Math.round(MAX_POLLING_TIME / 60_000));

    const interval = window.setInterval(async () => {
      if (deployPollInFlightRef.current) {
        return;
      }
      deployPollInFlightRef.current = true;
      try {
        // Check timeout
        if (Date.now() - startTime > MAX_POLLING_TIME) {
          setStatus("failed");
          setError(t("errors.deployment_timeout", { minutes: timeoutMinutes }));
          window.clearInterval(interval);
          return;
        }

        const response = await fetch(`/api/deploy/${deploymentId}`);
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result?.code === -1) {
          const rawMessage =
            result?.message ||
            result?.error ||
            t("errors.failed_to_fetch_deployment_status");
          const errorCode =
            result?.error_code ||
            result?.errorCode ||
            result?.data?.error_code ||
            result?.data?.errorCode ||
            null;
          const transientAction = handleTransientPollFailure({
            rawMessage,
            errorCode,
            httpStatus: response.status,
          });
          if (transientAction === "retrying") {
            return;
          }
          if (transientAction === "failed") {
            window.clearInterval(interval);
            return;
          }
          handleDeployFailure({
            rawMessage,
            errorCode,
            source: "deploy_poll",
          });
          window.clearInterval(interval);
          return;
        }

        const data = result.data || result;
        pollTransientFailureCountRef.current = 0;
        const latestRequestedModel =
          data.requested_model ?? data.requestedModel ?? null;
        const latestResolvedModel =
          data.resolved_model ?? data.resolvedModel ?? null;

        if (latestRequestedModel) {
          setRequestedModel(latestRequestedModel);
        }
        if (latestResolvedModel) {
          setResolvedModel(latestResolvedModel);
        }

        if (data.status === "running") {
          if (!deploySuccessSentRef.current) {
            deploySuccessSentRef.current = true;
            const durationMs =
              typeof deployStartedAtRef.current === "number"
                ? Date.now() - deployStartedAtRef.current
                : undefined;
            const ctx = deployContextRef.current;
            trackEvent("deploy_succeeded", {
              channel: ctx?.channel || selectedChannel || "unknown",
              model_requested: latestRequestedModel ?? ctx?.modelRequested ?? null,
              model_resolved: latestResolvedModel ?? null,
              subscription_tier: ctx?.subscriptionTier || user?.subscriptionTier || null,
              duration_ms: typeof durationMs === "number" ? durationMs : undefined,
            });
          }
          setStatus("running");
          setError(null);
          window.clearInterval(interval);
        }
        if (data.status === "failed") {
          handleDeployFailure({
            rawMessage: data.error_message || data.errorMessage || null,
            errorCode: data.error_code || data.errorCode || null,
            source: "deploy_poll",
          });
          window.clearInterval(interval);
        }
      } catch (err) {
        const transientAction = handleTransientPollFailure({
          rawMessage: err instanceof Error ? err.message : null,
        });
        if (transientAction === "retrying") {
          return;
        }
        if (transientAction === "failed") {
          window.clearInterval(interval);
          return;
        }
        handleDeployFailure({
          rawMessage: err instanceof Error ? err.message : null,
          source: "deploy_poll",
        });
        window.clearInterval(interval);
      } finally {
        deployPollInFlightRef.current = false;
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, [deploymentId, status]);

  const handleChannelSelect = (channelId: string) => {
    if (isTokenBackedChannel(channelId)) {
      openChannelGuide(channelId);
    }
    setSelectedChannel(channelId as ChannelId);
    if (channelId !== "whatsapp") {
      setWhatsappLogin(null);
      setWhatsappLoginRequestError(null);
      setRestoredWhatsappLoginOnLoad(false);
    }
  };

  const handleSaveChannelToken = () => {
    if (!guideChannel) {
      return;
    }
    if (!guideToken.trim()) {
      setError(t("errors.enter_bot_token"));
      return;
    }
    setChannelTokens((current) => ({
      ...current,
      [guideChannel]: guideToken.trim(),
    }));
    setShowChannelGuide(false);
    setError(null);
  };

  const handleDeploy = async () => {
    if (deployRequestInFlightRef.current) {
      return;
    }
    deployRequestInFlightRef.current = true;

    trackEvent("deploy_clicked", {
      channel: selectedChannel || "unknown",
      model_requested: selectedModel || null,
      subscription_tier: user?.subscriptionTier || null,
    });

    const okToDeploy = await ensureDeployEligibility();
    if (!okToDeploy) {
      releaseDeployRequestLock();
      return;
    }

    if (!selectedChannel) {
      setError(t("errors.select_channel_before_deploying"));
      releaseDeployRequestLock();
      return;
    }
    if (selectedTokenChannel && !channelTokens[selectedTokenChannel]?.trim()) {
      setError(
        t(
          selectedTokenChannel === "discord"
            ? "errors.enter_discord_bot_token"
            : "errors.enter_telegram_bot_token"
        )
      );
      openChannelGuide(selectedTokenChannel);
      releaseDeployRequestLock();
      return;
    }

    hasRedirectedToPricingRef.current = false;
    pollTransientFailureCountRef.current = 0;
    setStatus("checking");
    setError(null);
    setRequestedModel(selectedModel || null);
    setResolvedModel(null);
    setDeploymentId(null);
    setWhatsappLogin(null);
    setWhatsappLoginRequestError(null);
    setRestoredWhatsappLoginOnLoad(false);
    setWhatsappOutputMode("plain");

    try {
      deployStartedAtRef.current = Date.now();
      deploySuccessSentRef.current = false;
      deployFailureSentRef.current = false;
      deployContextRef.current = {
        channel: selectedChannel || "unknown",
        modelRequested: selectedModel || null,
        subscriptionTier: user?.subscriptionTier || null,
      };

      trackEvent("deploy_started", {
        channel: deployContextRef.current.channel,
        model_requested: deployContextRef.current.modelRequested,
        subscription_tier: deployContextRef.current.subscriptionTier,
      });

      const channelToken = selectedTokenChannel
        ? channelTokens[selectedTokenChannel]?.trim() || ""
        : "";

      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: selectedChannel,
          ...(channelToken ? { channel_token: channelToken } : {}),
          ...(selectedModel ? { model: selectedModel } : {}),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      const rawError =
        payload?.message || payload?.error || t("errors.failed_to_start_deployment");
      const errorCode =
        payload?.error_code || payload?.errorCode || payload?.data?.error_code || payload?.data?.errorCode || null;

      if (!response.ok || payload?.code === -1) {
        handleDeployFailure({
          rawMessage: rawError,
          errorCode,
          source: "deploy_create",
        });
        return;
      }

      const deploymentData = payload.data || payload;
      const initialRequestedModel =
        deploymentData.requested_model ??
        deploymentData.requestedModel ??
        selectedModel ??
        null;
      const initialResolvedModel =
        deploymentData.resolved_model ?? deploymentData.resolvedModel ?? null;

      if (!deploymentData.deployment_id) {
        throw new Error(t("errors.invalid_response_missing_deployment_id"));
      }

      setRequestedModel(initialRequestedModel);
      setResolvedModel(initialResolvedModel);
      setDeploymentId(deploymentData.deployment_id);
    } catch (err) {
      console.error("Deploy error:", err);
      handleDeployFailure({
        rawMessage:
          err instanceof Error ? err.message : t("errors.failed_to_start_deployment"),
        source: "deploy_create",
      });
    }
  };

  const fetchCurrentWhatsAppLogin = async ({
    background = false,
  }: {
    background?: boolean;
  } = {}): Promise<WhatsAppLoginSnapshot | null> => {
    if (!deploymentId) {
      return null;
    }

    if (!background) {
      setIsRefreshingWhatsappLogin(true);
    }
    setWhatsappLoginRequestError(null);

    try {
      const response = await fetch(
        `/api/deploy/${deploymentId}/whatsapp-login/current`
      );

      if (response.status === 204) {
        setWhatsappLogin(null);
        setRestoredWhatsappLoginOnLoad(false);
        return null;
      }

      const payload = await response.json().catch(() => ({}));
      const rawError =
        payload?.message ||
        payload?.error ||
        t("errors.failed_to_fetch_deployment_status");
      const errorCode =
        payload?.error_code ||
        payload?.errorCode ||
        payload?.data?.error_code ||
        payload?.data?.errorCode ||
        null;

      if (!response.ok || payload?.code === -1) {
        if (!background) {
          setWhatsappLoginRequestError(toUserFacingDeployError(rawError, errorCode));
        }
        return null;
      }

      const data = (payload.data || payload) as WhatsAppLoginSnapshot;
      setWhatsappLogin(data);
      setRestoredWhatsappLoginOnLoad(false);
      return data;
    } catch (err) {
      if (!background) {
        setWhatsappLoginRequestError(
          toUserFacingDeployError(
            err instanceof Error ? err.message : null,
            NETWORK_UNSTABLE_ERROR_CODE
          )
        );
      }
      return null;
    } finally {
      if (!background) {
        setIsRefreshingWhatsappLogin(false);
      }
    }
  };

  const runWhatsAppLoginAction = async (
    path: "start" | "restart"
  ): Promise<void> => {
    if (!deploymentId) {
      return;
    }

    setIsStartingWhatsappLogin(true);
    setWhatsappLoginRequestError(null);

    try {
      const response = await fetch(
        `/api/deploy/${deploymentId}/whatsapp-login/${path}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const payload = await response.json().catch(() => ({}));
      const rawError =
        payload?.message ||
        payload?.error ||
        t("errors.failed_to_start_deployment");
      const errorCode =
        payload?.error_code ||
        payload?.errorCode ||
        payload?.data?.error_code ||
        payload?.data?.errorCode ||
        null;

      if (!response.ok || payload?.code === -1) {
        setWhatsappLoginRequestError(toUserFacingDeployError(rawError, errorCode));
        return;
      }

      const data = (payload.data || payload) as WhatsAppLoginSnapshot;
      setWhatsappLogin(data);
      setRestoredWhatsappLoginOnLoad(false);
    } catch (err) {
      setWhatsappLoginRequestError(
        toUserFacingDeployError(
          err instanceof Error ? err.message : null,
          NETWORK_UNSTABLE_ERROR_CODE
        )
      );
    } finally {
      setIsStartingWhatsappLogin(false);
    }
  };

  const fetchCurrentDashboardSession = async ({
    background = false,
  }: {
    background?: boolean;
  } = {}): Promise<DashboardSessionSnapshot | null> => {
    if (!deploymentId) {
      return null;
    }

    if (!background) {
      setIsBootstrappingDashboard(true);
    }
    setDashboardRequestError(null);

    try {
      const response = await fetch(
        `/api/deploy/${deploymentId}/openclaw-dashboard/current`
      );

      if (response.status === 204) {
        setDashboardSession(null);
        setRestoredDashboardOnLoad(false);
        return null;
      }

      const payload = await response.json().catch(() => ({}));
      const rawError =
        payload?.message ||
        payload?.error ||
        t("errors.failed_to_fetch_deployment_status");
      const errorCode =
        payload?.error_code ||
        payload?.errorCode ||
        payload?.data?.error_code ||
        payload?.data?.errorCode ||
        null;

      if (!response.ok || payload?.code === -1) {
        if (!background) {
          setDashboardRequestError(toUserFacingDeployError(rawError, errorCode));
        }
        return null;
      }

      const data = (payload.data || payload) as DashboardSessionSnapshot;
      setDashboardSession(data);
      setRestoredDashboardOnLoad(false);
      return data;
    } catch (err) {
      if (!background) {
        setDashboardRequestError(
          toUserFacingDeployError(
            err instanceof Error ? err.message : null,
            NETWORK_UNSTABLE_ERROR_CODE
          )
        );
      }
      return null;
    } finally {
      if (!background) {
        setIsBootstrappingDashboard(false);
      }
    }
  };

  const handleStartDashboard = async () => {
    if (!deploymentId || isStartingDashboard) {
      return;
    }

    setIsStartingDashboard(true);
    setDashboardRequestError(null);
    setDashboardCopyState("idle");

    try {
      const response = await fetch(
        `/api/deploy/${deploymentId}/openclaw-dashboard/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const payload = await response.json().catch(() => ({}));
      const rawError =
        payload?.message ||
        payload?.error ||
        t("errors.failed_to_start_deployment");
      const errorCode =
        payload?.error_code ||
        payload?.errorCode ||
        payload?.data?.error_code ||
        payload?.data?.errorCode ||
        null;

      if (!response.ok || payload?.code === -1) {
        setDashboardRequestError(toUserFacingDeployError(rawError, errorCode));
        return;
      }

      setDashboardSession((payload.data || payload) as DashboardSessionSnapshot);
      setRestoredDashboardOnLoad(false);
    } catch (err) {
      setDashboardRequestError(
        toUserFacingDeployError(
          err instanceof Error ? err.message : null,
          NETWORK_UNSTABLE_ERROR_CODE
        )
      );
    } finally {
      setIsStartingDashboard(false);
    }
  };

  const handleStopDashboard = async () => {
    if (!deploymentId || isStoppingDashboard) {
      return;
    }

    setIsStoppingDashboard(true);
    setDashboardRequestError(null);
    setDashboardCopyState("idle");

    try {
      const response = await fetch(
        `/api/deploy/${deploymentId}/openclaw-dashboard/stop`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        const rawError =
          payload?.message ||
          payload?.error ||
          t("errors.failed_to_start_deployment");
        const errorCode =
          payload?.error_code ||
          payload?.errorCode ||
          payload?.data?.error_code ||
          payload?.data?.errorCode ||
          null;

        if (!response.ok || payload?.code === -1) {
          setDashboardRequestError(toUserFacingDeployError(rawError, errorCode));
          return;
        }
      }

      setDashboardSession(null);
      setRestoredDashboardOnLoad(false);
    } catch (err) {
      setDashboardRequestError(
        toUserFacingDeployError(
          err instanceof Error ? err.message : null,
          NETWORK_UNSTABLE_ERROR_CODE
        )
      );
    } finally {
      setIsStoppingDashboard(false);
    }
  };

  const handleOpenDashboard = () => {
    if (!dashboardSession?.dashboardUrl) {
      return;
    }

    window.open(dashboardSession.dashboardUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyDashboard = async () => {
    if (!dashboardSession?.dashboardUrl) {
      return;
    }

    try {
      await copyText(dashboardSession.dashboardUrl);
      setDashboardCopyState("copied");
    } catch (err) {
      setDashboardCopyState("failed");
      setDashboardRequestError(
        toUserFacingDeployError(
          err instanceof Error ? err.message : null,
          NETWORK_UNSTABLE_ERROR_CODE
        )
      );
    }
  };

  useEffect(() => {
    if (
      status !== "running" ||
      selectedChannel !== "whatsapp" ||
      !deploymentId
    ) {
      setIsBootstrappingWhatsappLogin(false);
      setRestoredWhatsappLoginOnLoad(false);
      return;
    }

    let cancelled = false;

    const loadCurrentSession = async () => {
      setIsBootstrappingWhatsappLogin(true);
      setWhatsappLoginRequestError(null);

      try {
        const snapshot = await fetchCurrentWhatsAppLogin({ background: true });
        if (!cancelled) {
          setRestoredWhatsappLoginOnLoad(Boolean(snapshot));
        }
      } finally {
        if (!cancelled) {
          setIsBootstrappingWhatsappLogin(false);
        }
      }
    };

    void loadCurrentSession();

    return () => {
      cancelled = true;
    };
  }, [deploymentId, selectedChannel, status, t]);

  useEffect(() => {
    if (
      status !== "running" ||
      selectedChannel !== "whatsapp" ||
      !deploymentId
    ) {
      setDashboardSession(null);
      setIsBootstrappingDashboard(false);
      setRestoredDashboardOnLoad(false);
      setDashboardRequestError(null);
      setDashboardCopyState("idle");
      return;
    }

    let cancelled = false;

    const loadCurrentSession = async () => {
      setIsBootstrappingDashboard(true);
      setDashboardRequestError(null);

      try {
        const snapshot = await fetchCurrentDashboardSession({ background: true });
        if (!cancelled) {
          setRestoredDashboardOnLoad(Boolean(snapshot));
        }
      } finally {
        if (!cancelled) {
          setIsBootstrappingDashboard(false);
        }
      }
    };

    void loadCurrentSession();

    return () => {
      cancelled = true;
    };
  }, [deploymentId, selectedChannel, status, t]);

  const handleStartWhatsAppLogin = async () => {
    if (!deploymentId || isStartingWhatsappLogin) {
      return;
    }
    await runWhatsAppLoginAction("start");
  };

  const handleRestartWhatsAppLogin = async () => {
    if (!deploymentId || isStartingWhatsappLogin) {
      return;
    }

    await runWhatsAppLoginAction("restart");
  };

  const handleRefreshWhatsAppLogin = async () => {
    if (!deploymentId || isRefreshingWhatsappLogin) {
      return;
    }
    await fetchCurrentWhatsAppLogin();
  };

  const handleCancelWhatsAppLogin = async () => {
    if (!deploymentId || isCancellingWhatsappLogin) {
      return;
    }

    setIsCancellingWhatsappLogin(true);
    setWhatsappLoginRequestError(null);

    try {
      const response = await fetch(
        `/api/deploy/${deploymentId}/whatsapp-login/current/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 204) {
        setWhatsappLogin(null);
        setRestoredWhatsappLoginOnLoad(false);
        return;
      }

      const payload = await response.json().catch(() => ({}));
      const rawError =
        payload?.message ||
        payload?.error ||
        t("errors.failed_to_start_deployment");
      const errorCode =
        payload?.error_code ||
        payload?.errorCode ||
        payload?.data?.error_code ||
        payload?.data?.errorCode ||
        null;

      if (!response.ok || payload?.code === -1) {
        setWhatsappLoginRequestError(toUserFacingDeployError(rawError, errorCode));
        return;
      }

      const data = payload.data || payload;
      setWhatsappLogin(data as WhatsAppLoginSnapshot);
      setRestoredWhatsappLoginOnLoad(false);
    } catch (err) {
      setWhatsappLoginRequestError(
        toUserFacingDeployError(
          err instanceof Error ? err.message : null,
          NETWORK_UNSTABLE_ERROR_CODE
        )
      );
    } finally {
      setIsCancellingWhatsappLogin(false);
    }
  };

  const hasActiveWhatsappLoginSession =
    whatsappLogin !== null && whatsappLogin.isTerminal !== true;
  const hasTerminalWhatsappLoginSession =
    whatsappLogin !== null && whatsappLogin.isTerminal === true;
  const isWhatsappLoginBusy =
    isBootstrappingWhatsappLogin ||
    isStartingWhatsappLogin ||
    isRefreshingWhatsappLogin ||
    isCancellingWhatsappLogin;
  const isDashboardBusy =
    isBootstrappingDashboard || isStartingDashboard || isStoppingDashboard;
  const visibleWhatsappOutput =
    whatsappOutputMode === "raw"
      ? whatsappLogin?.rawOutput || ""
      : whatsappLogin?.plainOutput || "";

  return (
    <div className="relative">
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <section className="pt-20 text-center md:pt-28">
          <div className="mx-auto max-w-3xl space-y-4">
            <h1 className="text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              {t("hero.description")}
            </p>
          </div>
        </section>

        <section className="mt-14">
          <div className="rounded-3xl border border-border/70 bg-card/95 px-6 py-8 shadow-sm">
            <div className="space-y-10">
              <div>
                <h2 className="text-base font-semibold text-foreground/80">
                  {t("selectors.model_title")}
                </h2>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      disabled={!model.available}
                      onClick={() => model.available && setSelectedModel(model.id)}
                      className={cn(
                        "group relative flex flex-col items-start gap-4 rounded-2xl border border-border/70 bg-card/90 p-5 text-left shadow-sm transition",
                        model.available
                          ? "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                          : "cursor-not-allowed opacity-60",
                        selectedModel === model.id && model.available
                          ? "border-primary/60 bg-primary/5"
                          : ""
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10">
                          <img
                            src={model.icon}
                            alt={`${model.name} icon`}
                            className={cn(
                              "h-8 w-8 object-contain",
                              model.available ? "" : "opacity-70 grayscale"
                            )}
                            loading="lazy"
                          />
                        </div>
                        <div>
                          <p className="text-base font-semibold">{model.name}</p>
                          <span className="text-xs text-muted-foreground">
                            {t("availability.available")}
                          </span>
                        </div>
                      </div>
                      {selectedModel === model.id && model.available && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                          {t("selectors.selected")}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-base font-semibold text-foreground/80">
                  {t("selectors.channel_title")}
                </h2>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {CHANNELS.map((channel) => (
                    <button
                      key={channel.id}
                      type="button"
                      disabled={!channel.available}
                      onClick={() =>
                        channel.available && handleChannelSelect(channel.id)
                      }
                      className={cn(
                        "group relative flex flex-col items-start gap-4 rounded-2xl border border-border/70 bg-card/90 p-5 text-left shadow-sm transition",
                        channel.available
                          ? "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                          : "cursor-not-allowed opacity-60",
                        selectedChannel === channel.id && channel.available
                          ? "border-primary/60 bg-primary/5"
                          : ""
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10">
                          <img
                            src={channel.icon}
                            alt={`${channel.name} icon`}
                            className={cn(
                              "h-8 w-8 object-contain",
                              channel.available ? "" : "opacity-70 grayscale"
                            )}
                            loading="lazy"
                          />
                        </div>
                        <div>
                          <p className="text-base font-semibold">
                            {channel.name}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {t("availability.available")}
                          </span>
                        </div>
                      </div>
                      {selectedChannel === channel.id && channel.available && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                          {t("selectors.selected")}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border/60 pt-8">
                <div>
                  {/* Deploy Section */}
                  <div className="space-y-4">
                    {/* Deploy Button - Sign in to deploy or Deploy */}
                    <Button
                      onClick={isSignedIn ? handleDeploy : () => setShowSignModal(true)}
                      disabled={status === "checking"}
                      className={cn(
                        "w-full md:w-auto min-w-[200px] h-12 px-8 rounded-xl font-semibold text-sm transition-all duration-300",
                        "bg-gradient-to-r from-muted via-muted/90 to-muted hover:from-muted/80 hover:via-muted/70 hover:to-muted/80",
                        "border border-border/50 hover:border-border",
                        "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.2)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3)]",
                        "text-foreground hover:text-foreground/90",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:from-muted",
                        "flex items-center justify-center gap-2"
                      )}
                    >
                      {status === "checking" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{t("deploy.deploying")}</span>
                        </>
                      ) : isSignedIn ? (
                        <>
                          <Zap className="h-4 w-4 fill-current" />
                          <span>{t("deploy.deploy_button")}</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 fill-current" />
                          <span>{t("deploy.sign_in_button")}</span>
                        </>
                      )}
                    </Button>

                    {!isSignedIn && (
                      <p className="text-sm text-muted-foreground">
                        {t("deploy.sign_in_hint")}
                      </p>
                    )}

                    {/* Status Messages - Only show when signed in */}
                    {isSignedIn && (
                      <>
                        {status === "running" && (
                          <p className="text-sm text-green-500 font-medium">
                            ✓ {t("deploy.status_success")}
                          </p>
                        )}
                        {status === "checking" && error && (
                          <p className="text-sm text-yellow-500">
                            {error}
                          </p>
                        )}
                        {status === "failed" && error && (
                          <p className="text-sm text-red-500">
                            ✗ {error}
                          </p>
                        )}
                        {status === "idle" && error && (
                          <p className="text-sm text-red-500">
                            ✗ {error}
                          </p>
                        )}

                        {status === "running" && selectedChannel === "whatsapp" && (
                          <div
                            className="w-full max-w-4xl space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4"
                            data-testid="whatsapp-login-panel"
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">
                                {t.has("whatsapp.connect_title")
                                  ? t("whatsapp.connect_title")
                                  : "Connect WhatsApp"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t.has("whatsapp.connect_subtitle")
                                  ? t("whatsapp.connect_subtitle")
                                  : "Deploy first, then start WhatsApp login for this pod."}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <Button
                                type="button"
                                onClick={handleStartWhatsAppLogin}
                                disabled={
                                  isWhatsappLoginBusy ||
                                  hasActiveWhatsappLoginSession
                                }
                                className="h-9 rounded-md px-3 text-sm"
                                data-testid="whatsapp-start-button"
                              >
                                {isStartingWhatsappLogin ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>
                                      {t.has("whatsapp.starting_button")
                                        ? t("whatsapp.starting_button")
                                        : "Waiting for QR..."}
                                    </span>
                                  </>
                                ) : (
                                  <span>
                                    {t.has("whatsapp.start_button")
                                      ? t("whatsapp.start_button")
                                      : "Start QR login"}
                                  </span>
                                )}
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleRestartWhatsAppLogin}
                                disabled={
                                  isWhatsappLoginBusy ||
                                  !hasTerminalWhatsappLoginSession
                                }
                                className="h-9 rounded-md px-3 text-sm"
                                data-testid="whatsapp-retry-button"
                              >
                                {t.has("whatsapp.retry_button")
                                  ? t("whatsapp.retry_button")
                                  : "Retry"}
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleRefreshWhatsAppLogin}
                                disabled={isWhatsappLoginBusy}
                                className="h-9 rounded-md px-3 text-sm"
                                data-testid="whatsapp-refresh-button"
                              >
                                {isRefreshingWhatsappLogin ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>
                                      {t.has("whatsapp.refreshing_qr")
                                        ? t("whatsapp.refreshing_qr")
                                        : "Refreshing..."}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-4 w-4" />
                                    <span>
                                      {t.has("whatsapp.refresh_qr")
                                        ? t("whatsapp.refresh_qr")
                                        : "Refresh result"}
                                    </span>
                                  </>
                                )}
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancelWhatsAppLogin}
                                disabled={isWhatsappLoginBusy || !hasActiveWhatsappLoginSession}
                                className="h-9 rounded-md px-3 text-sm"
                                data-testid="whatsapp-cancel-button"
                              >
                                {isCancellingWhatsappLogin ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>
                                      {t.has("whatsapp.cancelling_button")
                                        ? t("whatsapp.cancelling_button")
                                        : "Cancelling..."}
                                    </span>
                                  </>
                                ) : (
                                  <span>
                                    {t.has("whatsapp.cancel_button")
                                      ? t("whatsapp.cancel_button")
                                      : "Cancel"}
                                  </span>
                                )}
                              </Button>
                            </div>

                            {restoredWhatsappLoginOnLoad && whatsappLogin && (
                              <div
                                className="rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm text-muted-foreground"
                                data-testid="whatsapp-restore-notice"
                              >
                                {t.has("whatsapp.restore_notice")
                                  ? t("whatsapp.restore_notice")
                                  : "Restored the current or most recent WhatsApp login session. This page does not auto-refresh."}
                              </div>
                            )}

                            {whatsappLoginRequestError && (
                              <div
                                className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500"
                                data-testid="whatsapp-request-error"
                              >
                                {whatsappLoginRequestError}
                              </div>
                            )}

                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                              <div className="space-y-3 rounded-md border border-border/60 bg-background/60 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                      Status
                                    </p>
                                    <p className="text-sm font-medium text-foreground">
                                      {toUserFacingWhatsAppLoginMessage(whatsappLogin) ||
                                        (t.has("whatsapp.status_idle")
                                          ? t("whatsapp.status_idle")
                                          : "No active WhatsApp login session.")}
                                    </p>
                                  </div>
                                  <span
                                    className="rounded-full border border-border/60 bg-card px-2 py-1 text-xs text-foreground"
                                    data-testid="whatsapp-status-badge"
                                  >
                                    {whatsappLogin?.status || "idle"}
                                  </span>
                                </div>

                                {whatsappLogin?.qrUpdatedAt && (
                                  <p className="text-xs text-muted-foreground">
                                    {t.has("whatsapp.qr_updated_prefix")
                                      ? t("whatsapp.qr_updated_prefix")
                                      : "QR updated"}{" "}
                                    {formatWhatsappTimestamp(whatsappLogin.qrUpdatedAt)}
                                  </p>
                                )}

                                {whatsappLogin?.qrSvgDataUrl ? (
                                  <img
                                    src={whatsappLogin.qrSvgDataUrl}
                                    alt={
                                      t.has("whatsapp.qr_alt")
                                        ? t("whatsapp.qr_alt")
                                        : "WhatsApp login QR code"
                                    }
                                    className="mx-auto w-full max-w-xs rounded-md bg-white p-3"
                                    data-testid="whatsapp-qr-image"
                                  />
                                ) : (
                                  <div
                                    className="flex min-h-64 items-center justify-center rounded-md border border-dashed border-border/60 bg-background px-4 py-8 text-sm text-muted-foreground"
                                    data-testid="whatsapp-qr-loading"
                                  >
                                    {isBootstrappingWhatsappLogin
                                      ? t.has("whatsapp.loading_current")
                                        ? t("whatsapp.loading_current")
                                        : "Loading current WhatsApp login session..."
                                      : toUserFacingWhatsAppLoginMessage(whatsappLogin) ||
                                        (t.has("whatsapp.status_idle")
                                          ? t("whatsapp.status_idle")
                                          : "Start WhatsApp login to fetch a QR code.")}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-3 rounded-md border border-border/60 bg-background/60 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                      Output
                                    </p>
                                    <p className="text-sm font-medium text-foreground">
                                      {t.has("whatsapp.inline_title")
                                        ? t("whatsapp.inline_title")
                                        : "WhatsApp login terminal"}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant={
                                        whatsappOutputMode === "plain"
                                          ? "default"
                                          : "outline"
                                      }
                                      onClick={() => setWhatsappOutputMode("plain")}
                                      className="h-8 rounded-md px-3 text-xs"
                                      data-testid="whatsapp-output-mode-plain"
                                    >
                                      plainOutput
                                    </Button>
                                    <Button
                                      type="button"
                                      variant={
                                        whatsappOutputMode === "raw"
                                          ? "default"
                                          : "outline"
                                      }
                                      onClick={() => setWhatsappOutputMode("raw")}
                                      className="h-8 rounded-md px-3 text-xs"
                                      data-testid="whatsapp-output-mode-raw"
                                    >
                                      rawOutput
                                    </Button>
                                  </div>
                                </div>

                                {visibleWhatsappOutput ? (
                                  <pre
                                    className="max-h-96 overflow-auto rounded-md bg-white p-4 font-mono text-[10px] leading-[10px] text-black sm:text-xs sm:leading-4"
                                    data-testid="whatsapp-output"
                                  >
                                    {visibleWhatsappOutput}
                                  </pre>
                                ) : (
                                  <div className="flex min-h-64 items-center justify-center rounded-md border border-dashed border-border/60 bg-background px-4 py-8 text-sm text-muted-foreground">
                                    {t.has("whatsapp.no_output")
                                      ? t("whatsapp.no_output")
                                      : "No terminal output yet."}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div
                              className="space-y-4 rounded-md border border-border/60 bg-background/60 p-4"
                              data-testid="whatsapp-dashboard-panel"
                            >
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">
                                  {t.has("whatsapp.dashboard_title")
                                    ? t("whatsapp.dashboard_title")
                                    : "Gateway Dashboard fallback"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {t.has("whatsapp.dashboard_subtitle")
                                    ? t("whatsapp.dashboard_subtitle")
                                    : "If the inline QR flow is not enough, open the official Gateway Dashboard through this fallback."}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-3">
                                <Button
                                  type="button"
                                  onClick={handleStartDashboard}
                                  disabled={
                                    isDashboardBusy ||
                                    dashboardSession?.status === "ready"
                                  }
                                  className="h-9 rounded-md px-3 text-sm"
                                  data-testid="whatsapp-dashboard-start-button"
                                >
                                  {isStartingDashboard ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span>
                                        {t.has("whatsapp.dashboard_starting_button")
                                          ? t("whatsapp.dashboard_starting_button")
                                          : "Starting fallback..."}
                                      </span>
                                    </>
                                  ) : (
                                    <span>
                                      {t.has("whatsapp.dashboard_start_button")
                                        ? t("whatsapp.dashboard_start_button")
                                        : "Start fallback"}
                                    </span>
                                  )}
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={handleOpenDashboard}
                                  disabled={isDashboardBusy || !dashboardSession?.dashboardUrl}
                                  className="h-9 rounded-md px-3 text-sm"
                                  data-testid="whatsapp-dashboard-open-button"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  <span>
                                    {t.has("whatsapp.dashboard_open_button")
                                      ? t("whatsapp.dashboard_open_button")
                                      : "Open dashboard"}
                                  </span>
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    void handleCopyDashboard();
                                  }}
                                  disabled={isDashboardBusy || !dashboardSession?.dashboardUrl}
                                  className="h-9 rounded-md px-3 text-sm"
                                  data-testid="whatsapp-dashboard-copy-button"
                                >
                                  <span>
                                    {t.has("whatsapp.dashboard_copy_button")
                                      ? t("whatsapp.dashboard_copy_button")
                                      : "Copy link"}
                                  </span>
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    void handleStopDashboard();
                                  }}
                                  disabled={isDashboardBusy || dashboardSession === null}
                                  className="h-9 rounded-md px-3 text-sm"
                                  data-testid="whatsapp-dashboard-stop-button"
                                >
                                  {isStoppingDashboard ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span>
                                        {t.has("whatsapp.dashboard_stopping_button")
                                          ? t("whatsapp.dashboard_stopping_button")
                                          : "Stopping fallback..."}
                                      </span>
                                    </>
                                  ) : (
                                    <span>
                                      {t.has("whatsapp.dashboard_stop_button")
                                        ? t("whatsapp.dashboard_stop_button")
                                        : "Stop fallback"}
                                    </span>
                                  )}
                                </Button>
                              </div>

                              {restoredDashboardOnLoad && dashboardSession && (
                                <div
                                  className="rounded-md border border-border/60 bg-card/80 px-3 py-2 text-sm text-muted-foreground"
                                  data-testid="whatsapp-dashboard-restore-notice"
                                >
                                  {t.has("whatsapp.dashboard_restore_notice")
                                    ? t("whatsapp.dashboard_restore_notice")
                                    : "Restored the current Gateway Dashboard session. This page does not auto-refresh."}
                                </div>
                              )}

                              {dashboardRequestError && (
                                <div
                                  className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500"
                                  data-testid="whatsapp-dashboard-request-error"
                                >
                                  {dashboardRequestError}
                                </div>
                              )}

                              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                                <div className="space-y-3 rounded-md border border-border/60 bg-card/80 p-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                        Dashboard
                                      </p>
                                      <p className="text-sm font-medium text-foreground">
                                        {toUserFacingDashboardMessage(dashboardSession) ||
                                          (t.has("whatsapp.dashboard_status_idle")
                                            ? t("whatsapp.dashboard_status_idle")
                                            : "Start the fallback to issue an official dashboard link.")}
                                      </p>
                                    </div>
                                    <span
                                      className="rounded-full border border-border/60 bg-card px-2 py-1 text-xs text-foreground"
                                      data-testid="whatsapp-dashboard-status-badge"
                                    >
                                      {dashboardSession?.status || "idle"}
                                    </span>
                                  </div>

                                  <dl className="space-y-2 text-xs text-muted-foreground">
                                    <div className="flex items-start justify-between gap-3">
                                      <dt className="font-medium text-foreground">pod</dt>
                                      <dd
                                        className="max-w-[70%] break-all text-right"
                                        data-testid="whatsapp-dashboard-resolved-pod"
                                      >
                                        {dashboardSession?.target.pod || "—"}
                                      </dd>
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                      <dt className="font-medium text-foreground">dashboard url</dt>
                                      <dd
                                        className="max-w-[70%] break-all text-right"
                                        data-testid="whatsapp-dashboard-masked-url"
                                      >
                                        {dashboardSession?.maskedDashboardUrl ||
                                          (t.has("whatsapp.dashboard_no_url")
                                            ? t("whatsapp.dashboard_no_url")
                                            : "No dashboard link issued yet.")}
                                      </dd>
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                      <dt className="font-medium text-foreground">last error</dt>
                                      <dd className="max-w-[70%] break-all text-right">
                                        {dashboardSession?.lastError || "—"}
                                      </dd>
                                    </div>
                                  </dl>

                                  {dashboardCopyState === "copied" && (
                                    <div
                                      className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-600"
                                      data-testid="whatsapp-dashboard-copy-state"
                                    >
                                      {t.has("whatsapp.dashboard_copy_success")
                                        ? t("whatsapp.dashboard_copy_success")
                                        : "Dashboard link copied."}
                                    </div>
                                  )}

                                  {dashboardCopyState === "failed" && (
                                    <div
                                      className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500"
                                      data-testid="whatsapp-dashboard-copy-state"
                                    >
                                      {t.has("whatsapp.dashboard_copy_failed")
                                        ? t("whatsapp.dashboard_copy_failed")
                                        : "Failed to copy dashboard link."}
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-3 rounded-md border border-border/60 bg-card/80 p-4">
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                      Logs
                                    </p>
                                    <p className="text-sm font-medium text-foreground">
                                      {t.has("whatsapp.dashboard_logs_title")
                                        ? t("whatsapp.dashboard_logs_title")
                                        : "Fallback diagnostics"}
                                    </p>
                                  </div>

                                  {dashboardSession?.logs.length ? (
                                    <ul
                                      className="space-y-2"
                                      data-testid="whatsapp-dashboard-logs"
                                    >
                                      {dashboardSession.logs.map((entry) => (
                                        <li
                                          key={entry.id}
                                          className="rounded-md border border-border/60 bg-background/70 px-3 py-2 text-xs text-muted-foreground"
                                        >
                                          <div className="flex items-center justify-between gap-3 text-[11px]">
                                            <span>{entry.level}</span>
                                            <span>{formatWhatsappTimestamp(entry.at)}</span>
                                          </div>
                                          <div className="mt-1 break-words text-foreground">
                                            {entry.message}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed border-border/60 bg-background px-4 py-8 text-sm text-muted-foreground">
                                      {isBootstrappingDashboard
                                        ? t.has("whatsapp.dashboard_loading_current")
                                          ? t("whatsapp.dashboard_loading_current")
                                          : "Loading current dashboard session..."
                                        : t.has("whatsapp.dashboard_no_logs")
                                          ? t("whatsapp.dashboard_no_logs")
                                          : "No fallback logs yet."}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Hint Text */}
                        <p className="text-sm text-muted-foreground">
                          <span className="text-foreground font-medium">
                            {selectedChannel === "whatsapp"
                              ? t.has("deploy.hint_prefix_whatsapp")
                                ? t("deploy.hint_prefix_whatsapp")
                                : "Deploy first, then connect WhatsApp."
                              : t(
                                  selectedChannel === "discord"
                                    ? "deploy.hint_prefix_discord"
                                    : "deploy.hint_prefix_telegram"
                                )}
                          </span>{" "}
                          {t("deploy.hint_suffix")}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Connect Channel Dialog */}
      <Dialog open={showChannelGuide} onOpenChange={setShowChannelGuide}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a]/95 border-border/70 rounded-3xl p-0">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left Column - Guide Content */}
            <div className="p-8 space-y-6">
              <DialogHeader className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent ring-1 ring-primary/20">
                    <img
                      src={
                        guideChannel === "discord"
                          ? "https://scbwi-storage-prod.s3.amazonaws.com/images/discord-mark-blue_rA6tXJo.png"
                          : "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/960px-Telegram_logo.svg.png"
                      }
                      alt={guideChannel === "discord" ? "Discord icon" : "Telegram icon"}
                      className="h-6 w-6 object-contain"
                    />
                  </div>
                  <DialogTitle className="text-xl font-semibold text-foreground">
                    {t(guideTitleKey)}
                  </DialogTitle>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {guideChannel === "discord" ? (
                  <>
                    <h3 className="text-base font-semibold text-foreground/90">
                      {t("discord.how_to_get_token")}
                    </h3>
                    <ol className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex gap-3">
                        <span className="text-primary font-semibold">1.</span>
                        <span>
                          {t("discord.step_1_prefix")}{" "}
                          <a
                            href="https://discord.com/developers/applications"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {t("discord.step_1_link_label")}
                            <ExternalLink className="h-3 w-3" />
                          </a>{" "}
                          {t("discord.step_1_suffix")}
                        </span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-primary font-semibold">2.</span>
                        <span>{t("discord.step_2_text")}</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-primary font-semibold">3.</span>
                        <span>{t("discord.step_3_text")}</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-primary font-semibold">4.</span>
                        <span>{t("discord.step_4_text")}</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-primary font-semibold">5.</span>
                        <span>{t("discord.step_5_text")}</span>
                      </li>
                    </ol>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-semibold text-foreground/90">
                      {t("telegram.how_to_get_token")}
                    </h3>
                    <ol className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex gap-3">
                        <span className="text-primary font-semibold">1.</span>
                        <span>
                          {t("telegram.step_1_prefix")}{" "}
                          <a
                            href="https://t.me/BotFather"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            @BotFather
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-primary font-semibold">2.</span>
                        <span>
                          {t("telegram.step_2_prefix")}{" "}
                          <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground/80">
                            /newbot
                          </code>
                        </span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-primary font-semibold">3.</span>
                        <span>{t("telegram.step_3_text")}</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-primary font-semibold">4.</span>
                        <span>{t("telegram.step_4_text")}</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-primary font-semibold">5.</span>
                        <span>{t("telegram.step_5_text")}</span>
                      </li>
                    </ol>
                  </>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-border/60">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t(guideTokenLabelKey)}
                </label>
                <input
                  value={guideToken}
                  onChange={(e) => setGuideToken(e.target.value)}
                  placeholder={t(guideTokenPlaceholderKey)}
                  className="w-full h-11 rounded-md border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/40 text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  onClick={handleSaveChannelToken}
                  disabled={!guideToken.trim()}
                  className="w-full h-11 rounded-md text-sm font-semibold transition shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                >
                  <span className="flex items-center justify-center gap-2">
                    {t(guideSaveLabelKey)}
                    <Check className="h-4 w-4" />
                  </span>
                </Button>
                {error && (
                  <p className="text-xs text-red-500">{error}</p>
                )}
              </div>
            </div>

            {/* Right Column - Phone Screenshot */}
            <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-primary/5 via-transparent to-transparent p-8">
              <div className="relative">
                {/* Phone Frame */}
                <div
                  className={cn(
                    "w-[280px] h-[560px] rounded-[40px] border-4 shadow-2xl overflow-hidden",
                    guideChannel === "discord"
                      ? "bg-[#10131a] border-[#23272f]"
                      : "bg-[#1a1a2e] border-[#2a2a3e]"
                  )}
                >
                  {/* Screen Content */}
                  <div className="h-full flex flex-col">
                    {/* Status Bar */}
                    <div
                      className={cn(
                        "h-8 flex items-center justify-between px-6 pt-2",
                        guideChannel === "discord" ? "bg-[#10131a]" : "bg-[#1a1a2e]"
                      )}
                    >
                      <span className="text-[10px] text-white/80">9:41</span>
                      <div className="flex gap-1">
                        <div className="w-4 h-2.5 bg-white/80 rounded-sm" />
                        <div className="w-3 h-2.5 bg-white/80 rounded-sm" />
                      </div>
                    </div>
                    
                    {/* Chat Header */}
                    <div
                      className={cn(
                        "px-4 py-3 flex items-center gap-3 border-b border-white/10",
                        guideChannel === "discord" ? "bg-[#10131a]" : "bg-[#1a1a2e]"
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
                          guideChannel === "discord"
                            ? "bg-gradient-to-br from-indigo-400 to-indigo-600"
                            : "bg-gradient-to-br from-blue-400 to-blue-600"
                        )}
                      >
                        {guideChannel === "discord" ? "D" : "B"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {guideChannel === "discord" ? "RekaClip Bot" : "BotFather"}
                        </p>
                        <p className="text-[10px] text-white/60">
                          {guideChannel === "discord" ? "Discord app" : "bot"}
                        </p>
                      </div>
                    </div>

                    {/* Chat Messages */}
                    <div
                      className={cn(
                        "flex-1 p-4 space-y-3 overflow-hidden",
                        guideChannel === "discord" ? "bg-[#151922]" : "bg-[#0d0d1a]"
                      )}
                    >
                      {guideChannel === "discord" ? (
                        <>
                          <div className="flex justify-start">
                            <div className="max-w-[85%] bg-[#23272f] rounded-2xl rounded-tl-sm px-4 py-2.5">
                              <p className="text-xs text-white/90">
                                {t("discord.preview_intro")}
                              </p>
                              <p className="text-[10px] text-white/50 mt-1.5">9:35 AM</p>
                            </div>
                          </div>
                          <div className="flex justify-start">
                            <div className="max-w-[90%] space-y-1">
                              <div className="bg-[#1c212b] rounded-lg px-3 py-2 border border-white/10">
                                <p className="text-xs text-indigo-300 font-medium">
                                  {t("discord.preview_step_1")}
                                </p>
                              </div>
                              <div className="bg-[#1c212b] rounded-lg px-3 py-2 border border-white/10">
                                <p className="text-xs text-indigo-300 font-medium">
                                  {t("discord.preview_step_2")}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <div className="max-w-[70%] bg-[#5865f2] rounded-2xl rounded-tr-sm px-4 py-2.5">
                              <p className="text-xs text-white">
                                {t("discord.preview_user_message")}
                              </p>
                              <p className="text-[10px] text-white/70 mt-1.5 text-right">9:36 AM</p>
                            </div>
                          </div>
                          <div className="flex justify-start">
                            <div className="max-w-[85%] bg-[#23272f] rounded-2xl rounded-tl-sm px-4 py-2.5">
                              <p className="text-xs text-white/90">
                                {t("discord.preview_ready")}
                              </p>
                              <p className="text-[10px] text-white/50 mt-1.5">9:36 AM</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-start">
                            <div className="max-w-[85%] bg-[#2a2a3e] rounded-2xl rounded-tl-sm px-4 py-2.5">
                              <p className="text-xs text-white/90">
                                {t("telegram.preview_intro")}
                              </p>
                              <p className="text-[10px] text-white/50 mt-1.5">9:35 AM</p>
                            </div>
                          </div>
                          <div className="flex justify-start">
                            <div className="max-w-[90%] space-y-1">
                              <div className="bg-[#1a1a2e] rounded-lg px-3 py-2 border border-white/10">
                                <p className="text-xs text-blue-400 font-medium">/newbot</p>
                                <p className="text-[10px] text-white/60">
                                  {t("telegram.preview_newbot")}
                                </p>
                              </div>
                              <div className="bg-[#1a1a2e] rounded-lg px-3 py-2 border border-white/10 opacity-60">
                                <p className="text-xs text-blue-400 font-medium">/mybots</p>
                                <p className="text-[10px] text-white/60">
                                  {t("telegram.preview_mybots")}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <div className="max-w-[70%] bg-[#3b82f6] rounded-2xl rounded-tr-sm px-4 py-2.5">
                              <p className="text-xs text-white">/newbot</p>
                              <p className="text-[10px] text-white/70 mt-1.5 text-right">9:36 AM</p>
                            </div>
                          </div>
                          <div className="flex justify-start">
                            <div className="max-w-[85%] bg-[#2a2a3e] rounded-2xl rounded-tl-sm px-4 py-2.5">
                              <p className="text-xs text-white/90">
                                {t("telegram.preview_name_prompt")}
                              </p>
                              <p className="text-[10px] text-white/50 mt-1.5">9:36 AM</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Input Area */}
                    <div
                      className={cn(
                        "px-4 py-3 border-t border-white/10",
                        guideChannel === "discord" ? "bg-[#10131a]" : "bg-[#1a1a2e]"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-2 rounded-full px-4 py-2",
                          guideChannel === "discord" ? "bg-[#151922]" : "bg-[#0d0d1a]"
                        )}
                      >
                        <div className="w-6 h-6 rounded-full bg-white/10" />
                        <span className="text-sm text-white/40 flex-1">
                          {guideChannel === "discord"
                            ? t("discord.preview_message_input")
                            : t("telegram.preview_message_input")}
                        </span>
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center",
                            guideChannel === "discord" ? "bg-[#5865f2]" : "bg-[#3b82f6]"
                          )}
                        >
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary/20 rounded-full blur-2xl" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Clipboard API is unavailable.");
  }
}
