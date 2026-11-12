import { type ReactNode } from "react";
import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, space } from "../theme";

export function ScreenShell({
  children,
  testID,
  contentStyle,
  scroll = true,
}: {
  children: ReactNode;
  testID?: string;
  contentStyle?: ViewStyle;
  scroll?: boolean;
}) {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      testID={testID}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, contentStyle]} testID={testID}>
      {children}
    </View>
  );

  return (
    <LinearGradient
      colors={[colors.bgTop, colors.bgMid, colors.bgBottom]}
      locations={[0, 0.45, 1]}
      style={styles.root}
    >
      {body}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space.screen,
    paddingTop: 12,
    paddingBottom: 56,
    gap: space.gap,
  },
  fill: {
    flex: 1,
  },
});
