"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface UnbindButtonProps {
  accountId: string;
  accountName: string;
  boundUserId?: string;
  onSuccess?: () => void;
}

export function UnbindButton({
  accountId,
  accountName,
  boundUserId,
  onSuccess,
}: UnbindButtonProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    stoppedDeployments: number;
    accountStatus: string;
  } | null>(null);

  const handleUnbind = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/unbind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stopDeployment: true,
          reason: "Admin unbind",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unbind failed");
      }

      setResult(data.data);
      onSuccess?.();
    } catch (error: any) {
      alert(error.message || "Unbind failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Show success result
  if (result) {
    return (
      <Dialog open={true} onOpenChange={() => setResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2">
              Unbind Successful
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <p>
              Account <strong>{accountName}</strong> has been unbound
            </p>
            <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
              <p>• Stopped deployments: {result.stoppedDeployments}</p>
              <p>• Released accounts: 1</p>
              <p>
                • Account status: <span className="text-green-600">Available</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setResult(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Unbind
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
            Confirm Unbind
          </DialogTitle>
          <DialogDescription>
            This will unbind the account from the user
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Account:</span> {accountName}
            </p>
            {boundUserId && (
              <p>
                <span className="text-muted-foreground">Bound user:</span>{" "}
                {boundUserId.slice(0, 8)}...
              </p>
            )}
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>After unbinding:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>All user deployments will be stopped</li>
              <li>Account will become available for other users</li>
              <li>History will be kept for audit</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleUnbind} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Unbinding...
              </>
            ) : (
              "Confirm Unbind"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
