"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Settings,
  Server,
  Bell,
  Palette,
  Code,
  Save,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const { theme, setTheme } = useTheme();

  // General settings
  const [apiUrl, setApiUrl] = useState("http://localhost:4242");
  const [sparkMaster, setSparkMaster] = useState("local[*]");
  
  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackNotifications, setSlackNotifications] = useState(false);
  const [slackWebhook, setSlackWebhook] = useState("");
  
  // Appearance
  const [compactMode, setCompactMode] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    toast.success("Settings saved successfully!");
  };

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your SpooqW configuration and preferences.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-[600px]">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="spark" className="gap-2">
            <Server className="h-4 w-4" />
            Spark
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure basic SpooqW settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="api-url">API URL</Label>
                  <Input
                    id="api-url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="http://localhost:4242"
                  />
                  <p className="text-sm text-muted-foreground">
                    The URL of the SpooqW Core API server.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="log-level">Log Level</Label>
                  <select
                    id="log-level"
                    className="w-full h-10 rounded-md border border-input bg-background px-3"
                    defaultValue="INFO"
                  >
                    <option value="DEBUG">DEBUG</option>
                    <option value="INFO">INFO</option>
                    <option value="WARN">WARN</option>
                    <option value="ERROR">ERROR</option>
                  </select>
                  <p className="text-sm text-muted-foreground">
                    Minimum log level for the application.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Metrics</Label>
                  <p className="text-sm text-muted-foreground">
                    Expose Prometheus metrics endpoint.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable CORS</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow cross-origin requests to the API.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spark">
          <Card>
            <CardHeader>
              <CardTitle>Spark Configuration</CardTitle>
              <CardDescription>
                Configure Apache Spark settings for pipeline execution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="spark-master">Spark Master</Label>
                  <Input
                    id="spark-master"
                    value={sparkMaster}
                    onChange={(e) => setSparkMaster(e.target.value)}
                    placeholder="local[*]"
                  />
                  <p className="text-sm text-muted-foreground">
                    Spark master URL (local[*], spark://host:7077, k8s://...).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="executor-memory">Executor Memory</Label>
                  <Input
                    id="executor-memory"
                    defaultValue="2g"
                    placeholder="2g"
                  />
                  <p className="text-sm text-muted-foreground">
                    Memory per Spark executor.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver-memory">Driver Memory</Label>
                  <Input
                    id="driver-memory"
                    defaultValue="1g"
                    placeholder="1g"
                  />
                  <p className="text-sm text-muted-foreground">
                    Memory for Spark driver.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="executor-cores">Executor Cores</Label>
                  <Input
                    id="executor-cores"
                    defaultValue="2"
                    type="number"
                  />
                  <p className="text-sm text-muted-foreground">
                    CPU cores per executor.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Additional Spark Properties</h4>
                <div className="rounded-md border p-4 bg-muted/50">
                  <pre className="text-sm font-mono">
{`spark.sql.shuffle.partitions=200
spark.serializer=org.apache.spark.serializer.KryoSerializer
spark.sql.adaptive.enabled=true`}
                  </pre>
                </div>
                <Button variant="outline" size="sm">
                  <Code className="mr-2 h-4 w-4" />
                  Edit Properties
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how you receive alerts about pipeline status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email alerts for pipeline failures.
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Slack Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send alerts to a Slack channel.
                    </p>
                  </div>
                  <Switch
                    checked={slackNotifications}
                    onCheckedChange={setSlackNotifications}
                  />
                </div>

                {slackNotifications && (
                  <div className="space-y-2 pl-4 border-l-2">
                    <Label htmlFor="slack-webhook">Slack Webhook URL</Label>
                    <Input
                      id="slack-webhook"
                      value={slackWebhook}
                      onChange={(e) => setSlackWebhook(e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                      type="url"
                    />
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Notify me when:</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-normal">Pipeline fails</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="font-normal">Pipeline succeeds</Label>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="font-normal">Pipeline takes longer than expected</Label>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of SpooqW.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Theme</Label>
                <div className="grid grid-cols-3 gap-4">
                  {themeOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Button
                        key={option.value}
                        variant={theme === option.value ? "default" : "outline"}
                        className="justify-center gap-2"
                        onClick={() => setTheme(option.value)}
                      >
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-sm text-muted-foreground">
                  Select your preferred color theme.
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use smaller spacing for denser information display.
                  </p>
                </div>
                <Switch
                  checked={compactMode}
                  onCheckedChange={setCompactMode}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Line Numbers</Label>
                  <p className="text-sm text-muted-foreground">
                    Display line numbers in the config editor.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Animations</Label>
                  <p className="text-sm text-muted-foreground">
                    Show smooth transitions and animations.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4">
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
