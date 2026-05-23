"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface ManualPaymentRequest {
  order_no: string;
  user_uuid: string;
  user_email: string;
  amount: number;
  amount_yuan: number;
  product_name: string;
  product_id: string;
  status: "pending" | "approved" | "rejected";
  payment_method: "alipay" | "wechat" | null;
  transaction_id: string | null;
  credits: number;
  interval: string;
  created_at: string;
  paid_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
}

export default function ManualPaymentsPage() {
  const [requests, setRequests] = useState<ManualPaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ManualPaymentRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/manual-pay");
      const data = await response.json();
      if (data.code === 0) {
        setRequests(data.data.requests);
      } else {
        toast.error(data.message || "获取支付请求失败");
      }
    } catch (e) {
      toast.error("网络错误");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/manual-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_no: selectedRequest.order_no,
          action: actionType,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();
      if (data.code === 0) {
        toast.success(actionType === "approve" ? "已批准并发放积分" : "已拒绝");
        setSelectedRequest(null);
        setActionType(null);
        setNotes("");
        fetchRequests();
      } else {
        toast.error(data.message || "操作失败");
      }
    } catch (e) {
      toast.error("网络错误");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { label: "待审核", variant: "secondary" as const, className: "bg-yellow-100 text-yellow-800" },
      approved: { label: "已批准", variant: "default" as const, className: "bg-green-100 text-green-800" },
      rejected: { label: "已拒绝", variant: "destructive" as const, className: "bg-red-100 text-red-800" },
    };
    const config = configs[status as keyof typeof configs] || configs.pending;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("zh-CN");
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">手动支付审核</h1>
        <Button variant="outline" onClick={fetchRequests} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          暂无支付请求
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>订单号</TableHead>
                <TableHead>用户邮箱</TableHead>
                <TableHead>商品</TableHead>
                <TableHead>金额</TableHead>
                <TableHead>支付方式</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.order_no}>
                  <TableCell className="font-mono text-xs">{req.order_no}</TableCell>
                  <TableCell>{req.user_email}</TableCell>
                  <TableCell>{req.product_name}</TableCell>
                  <TableCell>¥{req.amount_yuan}</TableCell>
                  <TableCell>
                    {req.payment_method === "alipay" && "支付宝"}
                    {req.payment_method === "wechat" && "微信支付"}
                    {!req.payment_method && "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(req.status)}</TableCell>
                  <TableCell>{formatDate(req.created_at)}</TableCell>
                  <TableCell>
                    {req.status === "pending" && req.transaction_id ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => {
                            setSelectedRequest(req);
                            setActionType("approve");
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          批准
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => {
                            setSelectedRequest(req);
                            setActionType("reject");
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          拒绝
                        </Button>
                      </div>
                    ) : req.status === "pending" && !req.transaction_id ? (
                      <span className="text-sm text-muted-foreground">等待用户确认</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "批准支付" : "拒绝支付"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  订单号: {selectedRequest.order_no}
                  <br />
                  金额: ¥{selectedRequest?.amount_yuan}
                  <br />
                  用户: {selectedRequest?.user_email}
                  <br />
                  交易号: {selectedRequest?.transaction_id || "-"}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">备注（可选）</label>
              <Textarea
                placeholder="输入备注信息..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {actionType === "approve" && (
              <div className="bg-muted p-3 rounded text-sm">
                <p className="font-medium">确认后将执行以下操作：</p>
                <ul className="list-disc list-inside mt-1 text-muted-foreground">
                  <li>创建订单记录</li>
                  <li>发放 {selectedRequest?.credits} 积分</li>
                  <li>更新用户积分余额</li>
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setNotes("");
              }}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              onClick={handleAction}
              disabled={isSubmitting}
              variant={actionType === "approve" ? "default" : "destructive"}
            >
              {isSubmitting && <Loader className="w-4 h-4 mr-2 animate-spin" />}
              {actionType === "approve" ? "确认批准" : "确认拒绝"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
