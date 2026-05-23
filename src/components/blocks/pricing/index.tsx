"use client";

import Image from "next/image";
import { Check, Loader, X, Copy, CheckCircle2 } from "lucide-react";
import { PricingItem, Pricing as PricingType } from "@/types/blocks/pricing";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Icon from "@/components/icon";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAppContext } from "@/contexts/app";
import { useLocale } from "next-intl";
import { trackEvent } from "@/lib/analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

const minorToMajorCurrencyUnits = (amountMinor: number, currency: string) => {
  const normalizedCurrency = (currency || "").toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency)) {
    return Math.round(amountMinor);
  }

  return Math.round(amountMinor) / 100;
};

// Manual Payment Modal Component
function ManualPaymentModal({
  isOpen,
  onClose,
  item,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: PricingItem | null;
}) {
  const [step, setStep] = useState<"qr" | "confirm" | "success">("qr");
  const [orderNo, setOrderNo] = useState("");
  const [amountYuan, setAmountYuan] = useState(0);
  const [transactionId, setTransactionId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"alipay" | "wechat">("alipay");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const locale = useLocale();

  // Get QR code URLs from environment
  const alipayQrUrl = process.env.NEXT_PUBLIC_ALIPAY_QR_URL || "";
  const wechatQrUrl = process.env.NEXT_PUBLIC_WECHAT_QR_URL || "";

  useEffect(() => {
    if (isOpen && item) {
      setStep("qr");
      setTransactionId("");
      setPaymentMethod("alipay");
      setCopied(false);
      createManualPaymentRequest();
    }
  }, [isOpen, item]);

  const createManualPaymentRequest = async () => {
    if (!item) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/manual-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: item.product_id,
          locale: locale || "zh-cn",
        }),
      });

      const payload = await response.json();
      if (payload.code === 0 && payload.data) {
        setOrderNo(payload.data.order_no);
        setAmountYuan(payload.data.amount_yuan);
      } else {
        toast.error(payload.message || "创建支付请求失败");
        onClose();
      }
    } catch (e) {
      toast.error("网络错误，请重试");
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const copyOrderNo = () => {
    navigator.clipboard.writeText(orderNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("订单号已复制");
  };

  const submitConfirmation = async () => {
    if (!transactionId.trim()) {
      toast.error("请输入交易号");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/manual-pay/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_no: orderNo,
          transaction_id: transactionId.trim(),
          payment_method: paymentMethod,
        }),
      });

      const payload = await response.json();
      if (payload.code === 0) {
        setStep("success");
        toast.success("支付信息已提交，请等待审核");
      } else {
        toast.error(payload.message || "提交失败");
      }
    } catch (e) {
      toast.error("网络错误，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentQrUrl = () => {
    return paymentMethod === "alipay" ? alipayQrUrl : wechatQrUrl;
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "qr" && "扫码支付"}
            {step === "confirm" && "确认支付"}
            {step === "success" && "提交成功"}
          </DialogTitle>
          <DialogDescription>
            {step === "qr" && (
              <>
                {item.product_name || item.title} - ¥{amountYuan || item.cn_amount! / 100}
              </>
            )}
            {step === "confirm" && "请输入您的支付交易号以确认付款"}
            {step === "success" && "您的支付信息已提交，审核通过后将自动到账"}
          </DialogDescription>
        </DialogHeader>

        {step === "qr" && (
          <div className="space-y-4">
            {/* Order Info */}
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">订单号</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono">{orderNo || "加载中..."}</code>
                  {orderNo && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyOrderNo}>
                      {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                请备注此订单号在转账说明中
              </p>
            </div>

            {/* Payment Method Tabs */}
            <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "alipay" | "wechat")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="alipay">支付宝</TabsTrigger>
                <TabsTrigger value="wechat">微信支付</TabsTrigger>
              </TabsList>
              
              <TabsContent value="alipay" className="mt-4">
                <div className="flex flex-col items-center space-y-3">
                  {alipayQrUrl ? (
                    <div className="relative w-48 h-48 bg-white rounded-lg overflow-hidden">
                      <Image
                        src={alipayQrUrl}
                        alt="支付宝收款码"
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                      未配置收款码
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground text-center">
                    请使用支付宝扫码支付 ¥{amountYuan || item.cn_amount! / 100}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="wechat" className="mt-4">
                <div className="flex flex-col items-center space-y-3">
                  {wechatQrUrl ? (
                    <div className="relative w-48 h-48 bg-white rounded-lg overflow-hidden">
                      <Image
                        src={wechatQrUrl}
                        alt="微信收款码"
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                      未配置收款码
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground text-center">
                    请使用微信扫码支付 ¥{amountYuan || item.cn_amount! / 100}
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>1. 请扫码支付对应金额</p>
              <p>2. 务必备注订单号：{orderNo || "..."}</p>
              <p>3. 支付完成后点击"我已支付"</p>
            </div>

            <Button 
              className="w-full" 
              onClick={() => setStep("confirm")}
              disabled={isLoading || !orderNo}
            >
              我已支付
            </Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment-method">支付方式</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={paymentMethod === "alipay" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("alipay")}
                  className="flex-1"
                >
                  支付宝
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === "wechat" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("wechat")}
                  className="flex-1"
                >
                  微信支付
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-id">
                交易号 / 订单号
                <span className="text-xs text-muted-foreground ml-1">
                  (可在账单详情中查看)
                </span>
              </Label>
              <Input
                id="transaction-id"
                placeholder="请输入交易号..."
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
            </div>

            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium">支付金额：¥{amountYuan}</p>
              <p className="text-muted-foreground">商品：{item.product_name || item.title}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("qr")} className="flex-1">
                返回
              </Button>
              <Button 
                onClick={submitConfirmation} 
                disabled={isLoading || !transactionId.trim()}
                className="flex-1"
              >
                {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                提交确认
              </Button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <div>
              <p className="font-medium">支付信息已提交</p>
              <p className="text-sm text-muted-foreground mt-1">
                订单号：{orderNo}
              </p>
              <p className="text-sm text-muted-foreground">
                审核通过后积分将自动到账
              </p>
            </div>
            <Button onClick={onClose} className="w-full">
              完成
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Pricing({
  pricing,
  isStandalone = false,
}: {
  pricing: PricingType;
  isStandalone?: boolean;
}) {
  if (pricing.disabled) {
    return null;
  }

  const description = pricing.description
    ?.replace(/\s*Support:\s*support@easyclaw\.pro\.?/i, "")
    .trim();

  const checkoutPaused =
    process.env.NEXT_PUBLIC_PAUSE_CHECKOUT === "true";

  const locale = useLocale();
  const { setShowSignModal } = useAppContext();
  const uiSource = isStandalone ? "pricing_page" : "pricing_section";

  const [group, setGroup] = useState(() => {
    const featuredGroup = pricing.groups?.find((g) => g.is_featured);
    return featuredGroup?.name || pricing.groups?.[0]?.name;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [manualPayItem, setManualPayItem] = useState<PricingItem | null>(null);
  const [isManualPayModalOpen, setIsManualPayModalOpen] = useState(false);
  
  const visibleItems =
    pricing.items?.filter((item) => !item.group || item.group === group) ?? [];
  const visibleCount = visibleItems.length;
  const gridColsClass =
    visibleCount === 1
      ? "grid-cols-1 max-w-xl mx-auto"
      : visibleCount === 2
      ? "md:grid-cols-2"
      : "md:grid-cols-3";

  const isChineseLocale = locale?.startsWith("zh") || false;

  const isAuthError = (message?: string | null) => {
    if (!message) return false;
    const normalized = message.toLowerCase();
    return (
      normalized.includes("no auth") ||
      normalized.includes("unauth") ||
      normalized.includes("sign-in") ||
      normalized.includes("sign in")
    );
  };

  const handleCheckout = async (item: PricingItem, cn_pay: boolean = false) => {
    try {
      const eventCurrency = (cn_pay ? "cny" : item.currency) || "usd";
      const gaCurrency = eventCurrency.toUpperCase();
      const amountMinor =
        cn_pay && typeof item.cn_amount === "number" ? item.cn_amount : item.amount;
      const value = minorToMajorCurrencyUnits(amountMinor, eventCurrency);

      const gaItem = {
        item_id: item.product_id,
        item_name: item.product_name || item.title || item.product_id,
        price: value,
        currency: gaCurrency,
        quantity: 1,
      };

      const emitCheckoutError = ({
        httpStatus,
        errorCode,
        provider,
      }: {
        httpStatus?: number;
        errorCode?: string | null;
        provider?: string | null;
      }) => {
        trackEvent("checkout_error", {
          plan_id: item.product_id,
          http_status: typeof httpStatus === "number" ? httpStatus : undefined,
          error_code: errorCode || "unknown",
          provider: provider || "unknown",
          ui_source: uiSource,
        });
      };

      trackEvent("select_item", {
        item_list_id: "pricing",
        item_list_name: group || "",
        items: [gaItem],
      });

      trackEvent("view_item", {
        currency: gaCurrency,
        value,
        items: [gaItem],
      });

      trackEvent("begin_checkout", {
        plan_id: item.product_id,
        interval: item.interval,
        currency: gaCurrency,
        value,
        items: [gaItem],
        ui_source: uiSource,
      });

      const params = {
        product_id: item.product_id,
        currency: eventCurrency,
        locale: locale || "en",
      };

      setIsLoading(true);
      setProductId(item.product_id);

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const payload = await response.json().catch(() => null);

      if (response.status === 401) {
        emitCheckoutError({ httpStatus: response.status, errorCode: "http_401" });
        setShowSignModal(true);
        return;
      }

      if (!payload) {
        emitCheckoutError({ httpStatus: response.status, errorCode: "invalid_json" });
        toast.error("checkout failed");
        return;
      }

      const { code, message, data } = payload;
      if (code !== 0) {
        emitCheckoutError({
          httpStatus: response.status,
          errorCode: typeof code === "number" ? String(code) : "unknown",
          provider: data?.provider,
        });
        if (isAuthError(message)) {
          setShowSignModal(true);
          return;
        }
        toast.error(message || "checkout failed");
        return;
      }

      const { checkout_url } = data;
      if (!checkout_url) {
        emitCheckoutError({
          httpStatus: response.status,
          errorCode: "missing_checkout_url",
          provider: data?.provider,
        });
        toast.error("checkout failed");
        return;
      }

      window.location.href = checkout_url;
    } catch (e) {
      console.log("checkout failed: ", e);
      trackEvent("checkout_error", {
        plan_id: item.product_id,
        error_code: "exception",
        ui_source: uiSource,
      });
      toast.error("checkout failed");
    } finally {
      setIsLoading(false);
      setProductId(null);
    }
  };

  // Handle manual payment for Chinese users
  const handleManualPay = async (item: PricingItem) => {
    trackEvent("begin_checkout", {
      plan_id: item.product_id,
      interval: item.interval,
      currency: "CNY",
      value: (item.cn_amount || 0) / 100,
      ui_source: uiSource,
      payment_method: "manual_qr",
    });

    setManualPayItem(item);
    setIsManualPayModalOpen(true);
  };

  const viewItemListKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!visibleItems.length) return;

    const key = `${group || ""}:${visibleItems.map((item) => item.product_id).join(",")}`;
    if (viewItemListKeyRef.current === key) return;

    viewItemListKeyRef.current = key;

    trackEvent("view_item_list", {
      item_list_id: "pricing",
      item_list_name: group || "",
      items: visibleItems.map((item) => ({
        item_id: item.product_id,
        item_name: item.product_name || item.title || item.product_id,
        price: minorToMajorCurrencyUnits(item.amount, item.currency || "usd"),
        currency: (item.currency || "usd").toUpperCase(),
        quantity: 1,
      })),
    });
  }, [group, visibleItems]);

  useEffect(() => {
    if (pricing.items) {
      const featuredItem = pricing.items.find((i) => i.is_featured);
      setProductId(featuredItem?.product_id || pricing.items[0]?.product_id);
      setIsLoading(false);
    }
  }, [pricing.items]);

  const TitleTag = isStandalone ? "h1" : "h2";

  return (
    <>
      <section id={pricing.name} className="landing-section py-16">
        <div className="container">
          <div className="mx-auto mb-12 text-center">
            <TitleTag className="mb-4 text-4xl font-semibold lg:text-5xl">
              {pricing.title}
            </TitleTag>
            <p className="text-muted-foreground lg:text-lg">{description}</p>
          </div>
          <div className="w-full flex flex-col items-center gap-1">
            {pricing.groups && pricing.groups.length > 0 && (
              <div className="flex h-12 mb-12 items-center rounded-md bg-muted p-1 text-lg">
                <RadioGroup
                  value={group}
                  className="h-full grid"
                  style={{ gridTemplateColumns: `repeat(${pricing.groups.length}, minmax(0, 1fr))` }}
                  onValueChange={(value) => setGroup(value)}
                >
                  {pricing.groups.map((item, i) => (
                    <div
                      key={i}
                      className='h-full rounded-md transition-all has-[button[data-state="checked"]]:bg-card'
                    >
                      <RadioGroupItem
                        value={item.name || ""}
                        id={item.name}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={item.name}
                        className="flex h-full cursor-pointer items-center justify-center px-4 font-semibold text-muted-foreground peer-data-[state=checked]:text-primary"
                      >
                        {item.title}
                        {item.label && (
                          <Badge
                            variant="outline"
                            className="border-primary bg-primary px-1.5 ml-1 text-primary-foreground"
                          >
                            {item.label}
                          </Badge>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
            <div className={`w-full mt-0 grid gap-6 ${gridColsClass}`}>
              {pricing.items?.map((item, index) => {
                if (item.group && item.group !== group) return null;

                const isItemLoading = isLoading && productId === item.product_id;
                const showManualPay = isChineseLocale && item.cn_amount && item.cn_amount > 0;

                return (
                  <div
                    key={index}
                    className={`rounded-lg p-6 ${
                      item.is_featured
                        ? "border-primary border-2 bg-card text-card-foreground"
                        : "border-muted border"
                    }`}
                  >
                    <div className="flex h-full flex-col justify-between gap-5">
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          {item.title && (
                            <h3 className="text-xl font-semibold">{item.title}</h3>
                          )}
                          <div className="flex-1"></div>
                          {item.label && (
                            <Badge
                              variant="outline"
                              className="border-primary bg-primary px-1.5 text-primary-foreground"
                            >
                              {item.label}
                            </Badge>
                          )}
                        </div>
                        <div className="mb-4">
                          <div className="flex items-end gap-2">
                            {item.price && (
                              <span className="text-5xl font-semibold">{item.price}</span>
                            )}
                            {item.unit && (
                              <span className="block font-semibold">{item.unit}</span>
                            )}
                          </div>
                          {item.original_price && (
                            <div className="mt-2 text-xl text-muted-foreground font-semibold line-through">
                              {item.original_price}
                            </div>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-muted-foreground">{item.description}</p>
                        )}
                        {item.features_title && (
                          <p className="mb-3 mt-6 font-semibold">{item.features_title}</p>
                        )}
                        {item.features && (
                          <ul className="flex flex-col gap-3">
                            {item.features.map((feature, fi) => (
                              <li className="flex gap-2" key={`feature-${fi}`}>
                                <Check className="mt-1 size-4 shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {/* Manual Payment Option for Chinese Users */}
                        {showManualPay && !checkoutPaused && (
                          <Button
                            variant="outline"
                            className="w-full flex items-center justify-center gap-2 font-semibold border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700"
                            disabled={isItemLoading}
                            onClick={() => {
                              if (isLoading) return;
                              handleManualPay(item);
                            }}
                          >
                            {isItemLoading ? (
                              <>
                                <Loader className="mr-2 h-4 w-4 animate-spin" />
                                处理中...
                              </>
                            ) : (
                              <>
                                <Image
                                  src="https://pub-e1eb76428e24457ebfc067c635cb4fc4.r2.dev/imgs/cnpay.png"
                                  alt="CNY"
                                  width={20}
                                  height={20}
                                  className="w-5 h-5"
                                />
                                支付宝/微信 ¥{(item.cn_amount || 0) / 100}
                              </>
                            )}
                          </Button>
                        )}
                        
                        {checkoutPaused ? (
                          <p className="text-sm text-muted-foreground text-center">
                            New orders are not being accepted at this time.
                          </p>
                        ) : item.button ? (
                          <Button
                            className="w-full flex items-center justify-center gap-2 font-semibold"
                            disabled={isItemLoading}
                            onClick={() => {
                              if (isLoading) return;
                              handleCheckout(item);
                            }}
                          >
                            {(!isLoading || !isItemLoading) && <p>{item.button.title}</p>}
                            {isItemLoading && <p>{item.button.title}</p>}
                            {isItemLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            {item.button.icon && <Icon name={item.button.icon} className="size-4" />}
                          </Button>
                        ) : null}
                        {item.tip && (
                          <p className="text-muted-foreground text-sm mt-2">{item.tip}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Manual Payment Modal */}
      <ManualPaymentModal
        isOpen={isManualPayModalOpen}
        onClose={() => setIsManualPayModalOpen(false)}
        item={manualPayItem}
      />
    </>
  );
}
