// Platform release registry.
//
// Every workspace records the release it is running in `Organization.appVersion`.
// When a new release ships in this file, workspaces on an older version are shown
// an "update available" prompt and can upgrade in one click. Each release also
// pins the chat widget engine version it ships with, so upgrading the workspace
// brings the widget up to date at the same time.

export type Release = {
  version: number;
  title: string;
  date: string; // ISO date (YYYY-MM-DD)
  widgetVersion: number;
  highlights: string[];
};

// Newest first. Keep versions contiguous and append new releases on top.
export const RELEASES: Release[] = [
  {
    version: 3,
    title: "Support at scale",
    date: "2026-10-18",
    widgetVersion: 2,
    highlights: [
      "Workspace update center — see what's new and upgrade in one click.",
      "Docs-grounded AI assistant with a live, editable website chat widget.",
      "Chat-to-ticket handoff so website conversations flow into your SLA pipeline.",
      "Teams, canned responses, SLA policies and outbound webhooks.",
      "Two-factor authentication and one-click GDPR data export.",
    ],
  },
  {
    version: 2,
    title: "Automation & channels",
    date: "2026-08-12",
    widgetVersion: 1,
    highlights: [
      "Live chat widget with a floating launcher on any website.",
      "Automation engine with test mode, run history and loop prevention.",
      "Customer portal, CSAT surveys and transactional email.",
      "Self-serve billing and online payments.",
    ],
  },
  {
    version: 1,
    title: "The core workspace",
    date: "2026-06-01",
    widgetVersion: 1,
    highlights: [
      "Ticketing with shared queues, priorities, tags and assignment.",
      "Knowledge base with a draft / published workflow.",
      "Reporting across volume, backlog, response and CSAT.",
      "Strict server-side tenant isolation on every request.",
    ],
  },
];

export const LATEST_VERSION = RELEASES[0]?.version ?? 1;
export const LATEST_WIDGET_VERSION = RELEASES[0]?.widgetVersion ?? 1;

export function getRelease(version: number): Release | undefined {
  return RELEASES.find((r) => r.version === version);
}

export function isBehind(appVersion: number): boolean {
  return appVersion < LATEST_VERSION;
}

// Releases the workspace has not adopted yet, newest first.
export function pendingReleases(appVersion: number): Release[] {
  return RELEASES.filter((r) => r.version > appVersion);
}

export function currentRelease(appVersion: number): Release | undefined {
  return getRelease(appVersion);
}
