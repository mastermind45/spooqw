"use client";

import { 
  GitBranch, 
  Play, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardsProps {
  stats: {
    totalPipelines: number;
    totalRuns: number;
    runsToday: number;
    successRate: number;
    activeRuns: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Pipelines",
      value: stats.totalPipelines,
      icon: GitBranch,
      description: "Active pipelines",
      trend: "+2 this week",
      trendUp: true,
    },
    {
      title: "Runs Today",
      value: stats.runsToday,
      icon: Play,
      description: "Pipeline executions",
      trend: `${stats.totalRuns} total`,
      trendUp: true,
    },
    {
      title: "Success Rate",
      value: `${stats.successRate.toFixed(1)}%`,
      icon: CheckCircle,
      description: "Last 7 days",
      trend: "+2.1% from last week",
      trendUp: true,
    },
    {
      title: "Active Runs",
      value: stats.activeRuns,
      icon: Activity,
      description: "Currently running",
      trend: stats.activeRuns > 0 ? "In progress" : "All idle",
      trendUp: stats.activeRuns === 0,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {card.trendUp ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-yellow-500" />
              )}
              <span>{card.trend}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
