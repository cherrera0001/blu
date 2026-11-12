import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
} from "react-native";
import type { CompanionView } from "blu-core/companion";
import { HOP_MS, reactionFor } from "../content/companion-motion";
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
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "lg" ? 260 : size === "md" ? 170 : 120;
  const [breathe] = useState(() => new Animated.Value(0));
  const [hop] = useState(() => new Animated.Value(0));
  const [lineOpacity] = useState(() => new Animated.Value(1));
  const [reduceMotion, setReduceMotion] = useState(false);
  const prevMood = useRef<CompanionView["mood"] | null>(null);

  // «Reducir movimiento» del sistema: sin respiración ni saltos.
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => alive && setReduceMotion(on))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  // Reacción al cambiar de ánimo (H7): gesto breve al dar un paso; fundido de la frase.
  useEffect(() => {
    const reaction = reactionFor(prevMood.current, view.mood);
    prevMood.current = view.mood;
    if (!reaction || reduceMotion) return;
    lineOpacity.setValue(0.25);
    const fade = Animated.timing(lineOpacity, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    if (reaction === "hop") {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(hop, {
            toValue: 1,
            duration: HOP_MS * 0.4,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(hop, {
            toValue: 0,
            duration: HOP_MS * 0.6,
            easing: Easing.out(Easing.back(1.6)),
            useNativeDriver: true,
          }),
        ]),
        fade,
      ]).start();
    } else {
      fade.start();
    }
  }, [view.mood, reduceMotion, hop, lineOpacity]);

  useEffect(() => {
    if (reduceMotion) {
      breathe.setValue(0);
      return;
    }
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
  }, [breathe, reduceMotion]);

  const scale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035],
  });
  const lift = Animated.add(
    breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }),
    hop.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }),
  );

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`Blu. ${view.line}`}
      style={[styles.wrap, size === "lg" && styles.wrapHero]}
      testID="blu-companion"
    >
      <View
        style={[styles.stage, size === "lg" && styles.stageHero, size === "md" && styles.stageMid]}
        accessibilityElementsHidden
      >
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
      <Animated.Text
        accessibilityLiveRegion="polite"
        style={[styles.line, size !== "sm" && styles.lineHero, { opacity: lineOpacity }]}
        testID="companion-line"
      >
        {view.line}
      </Animated.Text>
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
  stageMid: {
    minHeight: 185,
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
