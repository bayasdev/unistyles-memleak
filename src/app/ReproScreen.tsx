"use client";

import "@/unistyles";

import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type ReproScreenProps = {
  requestedAt: string;
};

const METRICS = [
  { label: "Target load", value: "10k rps", tone: "hot" },
  { label: "Route mode", value: "dynamic SSR", tone: "cool" },
  { label: "Renderer", value: "RN Web", tone: "cool" },
] as const;

const REQUEST_ROWS = Array.from({ length: 96 }, (_, index) => ({
  id: index + 1,
  percent: 18 + ((index * 17) % 79),
  latency: 6 + ((index * 11) % 42),
  shard: `worker-${(index % 12) + 1}`,
}));

export function ReproScreen({ requestedAt }: ReproScreenProps) {
  return (
    <View style={styles.page}>
      <View style={styles.shell}>
        <View style={styles.hero}>
          <View style={styles.eyebrow}>
            <Text style={styles.eyebrowText}>Unistyles SSR memory repro</Text>
          </View>

          <Text style={styles.title}>
            React Native Web styles under sustained SSR traffic
          </Text>

          <Text style={styles.summary}>
            This route is forced to render at request time. Every request
            renders a dense set of Unistyles style bindings so the load script
            can show RSS growth before and after the server handles traffic.
          </Text>

          <View style={styles.metricGrid}>
            {METRICS.map((metric) => (
              <View key={metric.label} style={styles.metricCard(metric.tone)}>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text style={styles.metricValue}>{metric.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelTitle}>Synthetic request fanout</Text>
              <Text style={styles.panelSubtitle}>
                SSR render timestamp: {requestedAt}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {REQUEST_ROWS.length} bound rows
              </Text>
            </View>
          </View>

          <View style={styles.rows}>
            {REQUEST_ROWS.map((row) => (
              <View key={row.id} style={styles.requestRow(row.id)}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>
                    /{row.shard}/render/{row.id}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {row.latency} ms synthetic latency bucket
                  </Text>
                </View>

                <View style={styles.meterTrack}>
                  <View style={styles.meterFill(row.percent)} />
                </View>

                <Text style={styles.rowPercent}>{row.percent}%</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  page: {
    minHeight: rt.screen.height > 0 ? rt.screen.height : 900,
    backgroundColor: theme.colors.background,
    paddingHorizontal:
      rt.screen.width > 760 ? theme.spacing.xl : theme.spacing.md,
    paddingVertical: theme.spacing.xl,
  },
  shell: {
    width: "100%",
    maxWidth: 1180,
    marginHorizontal: "auto",
    gap: theme.spacing.lg,
  },
  hero: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.lg,
    padding: rt.screen.width > 900 ? theme.spacing.xl : theme.spacing.lg,
  },
  eyebrow: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  eyebrowText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    color: theme.colors.foreground,
    fontSize: rt.screen.width > 760 ? 56 : 36,
    fontWeight: "800",
    letterSpacing: -1.8,
    lineHeight: rt.screen.width > 760 ? 62 : 42,
    maxWidth: 900,
  },
  summary: {
    color: theme.colors.muted,
    fontSize: 18,
    lineHeight: 30,
    maxWidth: 760,
  },
  metricGrid: {
    flexDirection: rt.screen.width > 760 ? "row" : "column",
    gap: theme.spacing.md,
  },
  metricCard: (tone: "cool" | "hot") => ({
    backgroundColor:
      tone === "hot" ? theme.colors.warningSoft : theme.colors.surfaceAlt,
    borderColor: tone === "hot" ? theme.colors.warning : theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    padding: theme.spacing.md,
  }),
  metricLabel: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  metricValue: {
    color: theme.colors.foreground,
    fontSize: 28,
    fontWeight: "800",
    marginTop: theme.spacing.xs,
  },
  panel: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  panelHeader: {
    alignItems: rt.screen.width > 760 ? "center" : "flex-start",
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: rt.screen.width > 760 ? "row" : "column",
    gap: theme.spacing.md,
    justifyContent: "space-between",
    padding: theme.spacing.lg,
  },
  panelTitle: {
    color: theme.colors.foreground,
    fontSize: 24,
    fontWeight: "800",
  },
  panelSubtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: theme.spacing.xs,
  },
  badge: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  badgeText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: "800",
  },
  rows: {
    padding: theme.spacing.md,
  },
  requestRow: (index: number) => ({
    alignItems: "center",
    backgroundColor:
      index % 2 === 0 ? theme.colors.surface : theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: rt.screen.width > 760 ? "row" : "column",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
    transform: [{ translateX: rt.screen.width > 900 ? (index % 4) * 2 : 0 }],
  }),
  rowCopy: {
    flex: 1,
    gap: 3,
    width: rt.screen.width > 760 ? undefined : "100%",
  },
  rowTitle: {
    color: theme.colors.foreground,
    fontSize: 15,
    fontWeight: "800",
  },
  rowMeta: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  meterTrack: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    height: rt.screen.width > 760 ? 14 : 10,
    overflow: "hidden",
    width: rt.screen.width > 760 ? 260 : "100%",
  },
  meterFill: (percent: number) => ({
    backgroundColor: percent > 76 ? theme.colors.accent : theme.colors.warning,
    borderRadius: theme.radius.pill,
    height: "100%",
    width: `${percent}%`,
  }),
  rowPercent: {
    color: theme.colors.foreground,
    fontSize: 14,
    fontWeight: "800",
    minWidth: 48,
    textAlign: "right",
  },
}));
