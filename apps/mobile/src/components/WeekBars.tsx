import { StyleSheet, Text, View } from "react-native";
import type { DayCount } from "blu-core/history";
import { colors, type as typeScale } from "../theme";

/**
 * Barras de los últimos 7 días: lectura visual amable, sin rachas ni juicio.
 */
export function WeekBars({ days }: { days: DayCount[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel="Acciones registradas por día, últimos 7 días"
      style={styles.row}
      testID="week-bars"
    >
      {days.map((day) => {
        const heightPx = Math.max(8, Math.round((day.count / max) * 64));
        const [, , date] = day.date.split("-");
        const unit = day.count === 1 ? "paso" : "pasos";
        return (
          <View
            key={day.date}
            accessibilityLabel={`${date}: ${day.count} ${unit}`}
            style={styles.item}
          >
            <View style={styles.track}>
              <View
                style={[
                  styles.bar,
                  {
                    height: heightPx,
                    backgroundColor: day.count > 0 ? colors.warm : "#C9D7E2",
                  },
                ]}
              />
            </View>
            <Text style={styles.label}>{date}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 6,
    minHeight: 88,
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  track: {
    width: "100%",
    height: 64,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  bar: {
    width: "70%",
    maxWidth: 28,
    minHeight: 8,
    borderRadius: 8,
  },
  label: {
    fontSize: typeScale.tiny,
    color: colors.muted,
  },
});
