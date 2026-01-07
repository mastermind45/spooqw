"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { 
  GitBranch, 
  Play, 
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Pipeline } from "@/types";

interface PipelinesOverviewProps {
  pipelines: Pipeline[];
  onRun?: (id: string) => void;
}

export function PipelinesOverview({ pipelines, onRun }: PipelinesOverviewProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pipelines</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href="/pipelines">Manage</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pipelines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pipelines yet</p>
              <Button className="mt-4" asChild>
                <Link href="/pipelines/new">Create Pipeline</Link>
              </Button>
            </div>
          ) : (
            pipelines.slice(0, 5).map((pipeline) => (
              <div
                key={pipeline.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
                    <GitBranch className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <Link 
                      href={`/pipelines/${pipeline.id}`}
                      className="font-medium hover:underline"
                    >
                      {pipeline.name}
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{pipeline.steps.length} steps</span>
                      {pipeline.lastRunAt && (
                        <>
                          <span>•</span>
                          <span>
                            Last run {formatDistanceToNow(new Date(pipeline.lastRunAt), { addSuffix: true })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pipeline.lastRunStatus && (
                    <Badge 
                      variant={
                        pipeline.lastRunStatus === 'success' ? 'default' : 
                        pipeline.lastRunStatus === 'failed' ? 'destructive' : 
                        'secondary'
                      }
                      className="gap-1"
                    >
                      {pipeline.lastRunStatus === 'success' && <CheckCircle className="h-3 w-3" />}
                      {pipeline.lastRunStatus === 'failed' && <XCircle className="h-3 w-3" />}
                      {pipeline.lastRunStatus === 'running' && <Clock className="h-3 w-3" />}
                      {pipeline.lastRunStatus}
                    </Badge>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => onRun?.(pipeline.id)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/pipelines/${pipeline.id}`}>View Details</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/pipelines/${pipeline.id}/edit`}>Edit</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
