"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Edit,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Schedule } from "@/types";
import { formatDistanceToNow, format } from "date-fns";

interface ScheduleManagerProps {
  pipelineId: string;
  pipelineName: string;
}

// Common cron presets
const cronPresets = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Every 30 minutes", value: "*/30 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Daily at 6am", value: "0 6 * * *" },
  { label: "Daily at noon", value: "0 12 * * *" },
  { label: "Weekly on Monday", value: "0 0 * * 1" },
  { label: "Monthly on 1st", value: "0 0 1 * *" },
];

const timezones = [
  "UTC",
  "Europe/Rome",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

// Parse cron expression to human-readable format
function describeCron(cron: string): string {
  const preset = cronPresets.find(p => p.value === cron);
  if (preset) return preset.label;
  
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  // Simple descriptions
  if (minute === '*' && hour === '*') return 'Every minute';
  if (minute.startsWith('*/')) return `Every ${minute.slice(2)} minutes`;
  if (hour === '*') return `At minute ${minute} of every hour`;
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }
  
  return cron;
}

export function ScheduleManager({ pipelineId, pipelineName }: ScheduleManagerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [cronExpression, setCronExpression] = useState("0 0 * * *");
  const [timezone, setTimezone] = useState("UTC");
  const [enabled, setEnabled] = useState(true);
  
  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, [pipelineId]);

  async function fetchSchedules() {
    try {
      setLoading(true);
      setError(null);
      const allSchedules = await api.getSchedules();
      // Filter schedules for this pipeline
      const pipelineSchedules = allSchedules.filter(s => s.pipelineId === pipelineId);
      setSchedules(pipelineSchedules);
    } catch (err) {
      console.error("Failed to fetch schedules:", err);
      setError(err instanceof Error ? err.message : "Failed to load schedules");
    } finally {
      setLoading(false);
    }
  }

  const openCreateDialog = () => {
    setEditingSchedule(null);
    setCronExpression("0 0 * * *");
    setTimezone("UTC");
    setEnabled(true);
    setDialogOpen(true);
  };

  const openEditDialog = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setCronExpression(schedule.cronExpression);
    setTimezone(schedule.timezone);
    setEnabled(schedule.enabled);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!cronExpression.trim()) {
      toast.error("Cron expression is required");
      return;
    }

    // Basic cron validation
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 5) {
      toast.error("Invalid cron expression. Must have 5 parts: minute hour day month weekday");
      return;
    }

    setSaving(true);
    
    try {
      if (editingSchedule) {
        // Update existing schedule
        const updated = await api.updateSchedule(editingSchedule.id, {
          cronExpression,
          timezone,
          enabled,
        });
        setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));
        toast.success("Schedule updated");
      } else {
        // Create new schedule
        const created = await api.createSchedule({
          pipelineId,
          cronExpression,
          timezone,
          enabled,
        });
        setSchedules(prev => [...prev, created]);
        toast.success("Schedule created");
      }
      setDialogOpen(false);
    } catch (err) {
      console.error("Failed to save schedule:", err);
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (schedule: Schedule) => {
    try {
      const updated = await api.updateSchedule(schedule.id, {
        enabled: !schedule.enabled,
      });
      setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));
      toast.success(updated.enabled ? "Schedule enabled" : "Schedule disabled");
    } catch (err) {
      console.error("Failed to toggle schedule:", err);
      toast.error("Failed to update schedule");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    
    setDeleting(true);
    try {
      await api.deleteSchedule(deleteDialog.id);
      setSchedules(prev => prev.filter(s => s.id !== deleteDialog.id));
      setDeleteDialog(null);
      toast.success("Schedule deleted");
    } catch (err) {
      console.error("Failed to delete schedule:", err);
      toast.error("Failed to delete schedule");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchSchedules} className="ml-auto">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedules
              </CardTitle>
              <CardDescription>
                Automated execution schedules for this pipeline
              </CardDescription>
            </div>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No schedules configured</p>
              <p className="text-sm mt-1">Add a schedule to run this pipeline automatically</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`p-2 rounded-full ${schedule.enabled ? 'bg-green-500/10' : 'bg-gray-500/10'}`}>
                            {schedule.enabled ? (
                              <Power className="h-4 w-4 text-green-500" />
                            ) : (
                              <PowerOff className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {schedule.enabled ? 'Schedule is active' : 'Schedule is disabled'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div>
                      <div className="font-medium">{describeCron(schedule.cronExpression)}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <code className="bg-muted px-1 rounded text-xs">{schedule.cronExpression}</code>
                        <span>({schedule.timezone})</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      {schedule.nextRunAt && (
                        <div>
                          Next: <span className="text-muted-foreground">
                            {formatDistanceToNow(new Date(schedule.nextRunAt), { addSuffix: true })}
                          </span>
                        </div>
                      )}
                      {schedule.lastRunAt && (
                        <div className="text-muted-foreground text-xs">
                          Last: {format(new Date(schedule.lastRunAt), 'MMM d, HH:mm')}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={schedule.enabled}
                        onCheckedChange={() => handleToggle(schedule)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(schedule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteDialog(schedule)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
            </DialogTitle>
            <DialogDescription>
              Configure when this pipeline should run automatically
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quick Presets</Label>
              <div className="flex flex-wrap gap-2">
                {cronPresets.slice(0, 6).map((preset) => (
                  <Badge
                    key={preset.value}
                    variant={cronExpression === preset.value ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setCronExpression(preset.value)}
                  >
                    {preset.label}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cron">Cron Expression</Label>
              <Input
                id="cron"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="* * * * *"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Format: minute hour day month weekday (e.g., &quot;0 9 * * 1-5&quot; for 9am on weekdays)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">Enable Schedule</Label>
              <Switch
                id="enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>
            
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">Schedule Preview</div>
              <div className="text-sm text-muted-foreground mt-1">
                {describeCron(cronExpression)} ({timezone})
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSchedule ? 'Update' : 'Create'} Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this schedule? The pipeline will no longer run automatically on this schedule.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
