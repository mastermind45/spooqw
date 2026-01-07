"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  ArrowRight 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Run, RunStatus } from "@/types";

interface RecentRunsProps {
  runs: Run[];
}

const statusConfig: Record<RunStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
  success: { icon: CheckCircle, color: "text-green-500", label: "Success" },
  failed: { icon: XCircle, color: "text-red-500", label: "Failed" },
  running: { icon: Loader2, color: "text-blue-500", label: "Running" },
  pending: { icon: Clock, color: "text-yellow-500", label: "Pending" },
  cancelled: { icon: XCircle, color: "text-gray-500", label: "Cancelled" },
};

export function RecentRuns({ runs }: RecentRunsProps) {
  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Runs</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/runs" className="flex items-center gap-1">
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {runs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No runs yet. Create and run a pipeline to get started.
            </div>
          ) : (
            runs.map((run) => {
              const status = statusConfig[run.status];
              const StatusIcon = status.icon;
              
              return (
                <Link
                  key={run.id}
                  href={`/runs/${run.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon 
                      className={`h-5 w-5 ${status.color} ${
                        run.status === 'running' ? 'animate-spin' : ''
                      }`} 
                    />
                    <div>
                      <div className="font-medium">{run.pipelineName}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={run.status === 'success' ? 'default' : 
                               run.status === 'failed' ? 'destructive' : 
                               'secondary'}
                    >
                      {status.label}
                    </Badge>
                    {run.duration && (
                      <span className="text-sm text-muted-foreground min-w-[60px] text-right">
                        {run.duration}s
                      </span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
