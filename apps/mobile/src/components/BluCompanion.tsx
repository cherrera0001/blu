import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { CompanionView } from "blu-core/companion";
import { colors, fonts, type as typeScale } from "../theme";
import NEWSPAPER from "../../assets/blu-newspaper.png";
import BUILDER from "../../assets/blu-builder.png";

// Raster 3D oficial holablu (design/blu-source): newspaper/builder HQ (~1200px).

function assetFor(view: CompanionView) {
  if (view.pose === "builder" || view.mood === "celebrate" || view.mood === "thriving") {
    return BUILDER;
  }
  if (view.mood === "encouraging") {
    return BUILDER;
  }
  // waiting / resting — presencia calmada con periódico
  return NEWSPAPER;
}

/**
 * Presencia Blu: hero de marca con PNG 3D de alta resolución + escenario suave.
 */
export function BluCompanion({
  view,
  size = "lg",
}: {
  view: CompanionView;
  size?: "sm" | "lg";
}) {
  const dim = size === "lg" ? 260 : 120;
  const [breathe] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  const scale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035],
  });
  const lift = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`Blu. ${view.line}`}
      style={[styles.wrap, size === "lg" && styles.wrapHero]}
      testID="blu-companion"
    >
      <View style={[styles.stage, size === "lg" && styles.stageHero]} accessibilityElementsHidden>
        <View style={[styles.glow, { width: dim * 0.92, height: dim * 0.28 }]} />
        <Animated.View
          style={{ transform: [{ translateY: lift }, { scale }] }}
          testID="blu-illustration"
        >
          <Image
            source={assetFor(view)}
            style={{ width: dim, height: dim }}
            resizeMode="contain"
            alt=""
          />
        </Animated.View>
      </View>
      <Text style={[styles.line, size === "lg" && styles.lineHero]} testID="companion-line">
        {view.line}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  wrapHero: {
    marginTop: 4,
    marginBottom: 4,
  },
  stage: {
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: 130,
  },
  stageHero: {
    minHeight: 280,
  },
  glow: {
    position: "absolute",
    bottom: 10,
    borderRadius: 999,
    backgroundColor: "rgba(24, 120, 248, 0.18)",
  },
  line: {
    fontFamily: fonts.bodySemi,
    fontSize: typeScale.meta,
    color: colors.inkSoft,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 320,
    paddingHorizontal: 8,
  },
  lineHero: {
    fontFamily: fonts.displaySoft,
    fontSize: typeScale.lead,
    color: colors.ink,
    lineHeight: 28,
    maxWidth: 340,
  },
});
