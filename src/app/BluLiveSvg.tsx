export type BluExpression = "neutral" | "happy" | "surprised" | "resting";

/**
 * Avatar vectorial vivo: geometría editable animable por CSS (grupos body/arms/face).
 * Paleta medida desde originales holablu; brillo y glints para legibilidad en UI.
 */
export default function BluLiveSvg({ expression }: { expression: BluExpression }) {
  return (
    <svg
      aria-hidden="true"
      className="blu-live-svg"
      data-blu-expression={expression}
      data-testid="blu-illustration"
      viewBox="0 0 200 230"
    >
      <defs>
        <radialGradient id="bluLiveBody" cx="36%" cy="26%" r="74%">
          <stop offset="0%" stopColor="#A8D8F8" />
          <stop offset="42%" stopColor="#60B8F8" />
          <stop offset="100%" stopColor="#1878F8" />
        </radialGradient>
        <linearGradient id="bluLiveLeg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60B8F8" />
          <stop offset="100%" stopColor="#1070F8" />
        </linearGradient>
        <linearGradient id="bluLiveSheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g className="blu-live-body">
        <path
          d="M100 22 C128 22 152 46 160 84 C168 126 162 160 142 182 C128 194 114 200 100 200 C86 200 72 194 58 182 C38 160 32 126 40 84 C48 46 72 22 100 22Z"
          fill="url(#bluLiveBody)"
        />
        <path
          className="blu-live-sheen"
          d="M68 48 C86 28 112 26 128 42 C108 58 88 92 76 128 C70 108 66 72 68 48Z"
          fill="url(#bluLiveSheen)"
          opacity="0.45"
        />
        <ellipse cx="76" cy="208" rx="24" ry="13" fill="url(#bluLiveLeg)" />
        <ellipse cx="124" cy="208" rx="24" ry="13" fill="url(#bluLiveLeg)" />
      </g>

      <g className={`blu-live-arms blu-live-arms--${expression}`}>
        {expression === "happy" || expression === "neutral" ? (
          <>
            <path
              className="blu-live-arm-wave"
              d="M48 112 C28 98 22 70 38 56 C50 46 68 54 70 70 C72 86 64 102 54 112 Z"
              fill="#60B8F8"
            />
            <g className="blu-live-hand" transform="translate(30 46) rotate(-16)">
              <ellipse cx="10" cy="12" rx="12" ry="10" fill="#60B8F8" />
              <ellipse cx="1" cy="2" rx="3.4" ry="5" fill="#A8D8F8" />
              <ellipse cx="9" cy="-1" rx="3.4" ry="5.2" fill="#A8D8F8" />
              <ellipse cx="17" cy="2" rx="3.2" ry="4.6" fill="#A8D8F8" />
            </g>
            <path
              d="M154 118 C172 130 176 154 164 168 C152 180 134 172 130 158 C126 146 134 128 146 120 Z"
              fill="#60B8F8"
            />
          </>
        ) : null}
        {expression === "surprised" ? (
          <>
            <path
              d="M46 118 C30 128 26 150 36 164 C46 176 64 172 70 158 C74 148 68 130 56 122 Z"
              fill="#60B8F8"
            />
            <path
              d="M154 118 C170 128 174 150 164 164 C154 176 136 172 130 158 C126 148 132 130 144 122 Z"
              fill="#60B8F8"
            />
          </>
        ) : null}
        {expression === "resting" ? (
          <>
            <path
              d="M148 120 C166 132 170 156 158 168 C146 178 130 170 128 156 C126 142 136 126 146 120 Z"
              fill="#60B8F8"
            />
            <path
              d="M52 126 C40 118 48 96 66 92 C80 90 88 102 84 114 C80 126 66 130 56 128 Z"
              fill="#60B8F8"
            />
            <g transform="translate(78 108)">
              <ellipse cx="0" cy="8" rx="10" ry="8" fill="#60B8F8" />
              <path
                d="M-2 0 C-10 -6 -4 -14 0 -6 C4 -14 10 -6 2 0 C0 4 -1 4 -2 0Z"
                fill="#A8D8F8"
              />
            </g>
            <g className="blu-live-heart" transform="translate(72 78)">
              <path
                d="M0 6 C-6 -2 -12 2 -8 8 C-4 14 0 18 0 18 C0 18 4 14 8 8 C12 2 6 -2 0 6Z"
                fill="#4AA8FF"
              />
            </g>
          </>
        ) : null}
      </g>

      <g className={`blu-live-face blu-live-face--${expression}`}>
        {expression === "happy" || expression === "surprised" || expression === "neutral" ? (
          <>
            <ellipse
              className="blu-live-eye"
              cx="80"
              cy={expression === "surprised" ? 92 : 94}
              rx={expression === "surprised" ? 11.5 : 9.5}
              ry={expression === "surprised" ? 13.5 : 11.5}
              fill="#1A1A1B"
            />
            <ellipse
              className="blu-live-eye"
              cx="120"
              cy={expression === "surprised" ? 92 : 94}
              rx={expression === "surprised" ? 11.5 : 9.5}
              ry={expression === "surprised" ? 13.5 : 11.5}
              fill="#1A1A1B"
            />
            <circle className="blu-live-glint" cx="76" cy={expression === "surprised" ? 86 : 88} r="2.4" fill="#fff" />
            <circle className="blu-live-glint" cx="116" cy={expression === "surprised" ? 86 : 88} r="2.4" fill="#fff" />
          </>
        ) : (
          <>
            <path
              d="M70 96 Q80 88 90 96"
              fill="none"
              stroke="#1A1A1B"
              strokeLinecap="round"
              strokeWidth="3.6"
            />
            <path
              d="M110 96 Q120 88 130 96"
              fill="none"
              stroke="#1A1A1B"
              strokeLinecap="round"
              strokeWidth="3.6"
            />
          </>
        )}
        {expression === "happy" ? (
          <path className="blu-live-mouth" d="M86 118 C92 136 108 136 114 118 C106 128 94 128 86 118Z" fill="#0E5AD0" />
        ) : null}
        {expression === "neutral" ? (
          <path
            className="blu-live-mouth"
            d="M88 122 Q100 134 112 122"
            fill="none"
            stroke="#1A1A1B"
            strokeLinecap="round"
            strokeWidth="3.4"
          />
        ) : null}
        {expression === "surprised" ? (
          <ellipse className="blu-live-mouth" cx="100" cy="126" rx="9" ry="11" fill="#0E5AD0" />
        ) : null}
        {expression === "resting" ? (
          <path
            className="blu-live-mouth"
            d="M90 124 Q100 132 110 124"
            fill="none"
            stroke="#1A1A1B"
            strokeLinecap="round"
            strokeWidth="3.2"
          />
        ) : null}
      </g>

      <g className="blu-live-dots" opacity="0">
        <circle cx="148" cy="72" r="3.2" />
        <circle cx="160" cy="72" r="3.2" />
        <circle cx="172" cy="72" r="3.2" />
      </g>
    </svg>
  );
}
