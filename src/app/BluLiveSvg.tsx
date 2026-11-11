"use client";

import { useId } from "react";

export type BluExpression = "neutral" | "happy" | "surprised" | "resting";

/**
 * Avatar vectorial vivo alineado a la gota oficial de Blu (holablu / blu-avatar):
 * silueta orgánica, ojos suaves y animación CSS por grupos.
 */
export default function BluLiveSvg({ expression }: { expression: BluExpression }) {
  const uid = useId().replace(/:/g, "");
  const bodyGrad = `bluBody-${uid}`;
  const sheenGrad = `bluSheen-${uid}`;
  const footGrad = `bluFoot-${uid}`;

  return (
    <svg
      aria-hidden="true"
      className="blu-live-svg"
      data-blu-expression={expression}
      data-testid="blu-illustration"
      viewBox="0 0 512 512"
    >
      <defs>
        <radialGradient id={bodyGrad} cx="38%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#B8E4FF" />
          <stop offset="38%" stopColor="#6EC8F0" />
          <stop offset="78%" stopColor="#2F8FBF" />
          <stop offset="100%" stopColor="#1878F8" />
        </radialGradient>
        <linearGradient id={sheenGrad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={footGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60B8F8" />
          <stop offset="100%" stopColor="#1070F8" />
        </linearGradient>
      </defs>

      <g className="blu-live-root">
        <g className="blu-live-body">
          {/* Silueta oficial de gota (blu-avatar.svg), no óvalo geométrico. */}
          <path
            d="M256 48
              C210 52 168 118 138 188
              C102 278 96 348 112 402
              C122 438 150 468 176 488
              C196 504 220 500 236 478
              C246 464 246 436 256 430
              C268 422 274 438 278 462
              C284 498 304 508 332 496
              C356 486 360 456 372 424
              C396 366 430 330 440 268
              C458 168 420 88 346 56
              C316 42 284 46 256 48Z"
            fill={`url(#${bodyGrad})`}
          />
          <path
            className="blu-live-sheen"
            d="M168 120 C210 70 268 66 310 96 C270 140 230 210 198 280 C186 230 176 160 168 120Z"
            fill={`url(#${sheenGrad})`}
            opacity="0.42"
          />
          <ellipse cx="208" cy="492" rx="46" ry="18" fill={`url(#${footGrad})`} opacity="0.92" />
          <ellipse cx="304" cy="492" rx="46" ry="18" fill={`url(#${footGrad})`} opacity="0.92" />
        </g>

        <g className={`blu-live-arms blu-live-arms--${expression}`}>
          {(expression === "happy" || expression === "neutral") && (
            <>
              <g className="blu-live-arm-wave" transform="translate(96 210)">
                <path
                  d="M0 36 C-28 18 -42 -8 -18 -28 C2 -42 28 -20 24 8 C22 24 12 34 0 36Z"
                  fill="#60B8F8"
                />
                <g transform="translate(-34 -36) rotate(-18)">
                  <ellipse cx="12" cy="14" rx="14" ry="11" fill="#6EC8F0" />
                  <ellipse cx="2" cy="2" rx="4" ry="6" fill="#A8D8F8" />
                  <ellipse cx="12" cy="-1" rx="4" ry="6.2" fill="#A8D8F8" />
                  <ellipse cx="22" cy="2" rx="3.8" ry="5.4" fill="#A8D8F8" />
                </g>
              </g>
              <path
                d="M392 268 C422 286 430 328 408 352 C388 372 356 360 350 334 C346 314 364 282 384 270Z"
                fill="#60B8F8"
              />
            </>
          )}
          {expression === "surprised" && (
            <>
              <path
                d="M120 270 C88 292 78 330 102 352 C122 370 154 360 160 334 C164 316 146 286 128 274Z"
                fill="#60B8F8"
              />
              <path
                d="M392 270 C424 292 434 330 410 352 C390 370 358 360 352 334 C348 316 366 286 384 274Z"
                fill="#60B8F8"
              />
            </>
          )}
          {expression === "resting" && (
            <>
              <path
                d="M384 278 C418 298 426 338 402 358 C382 374 352 362 348 338 C346 318 362 290 378 280Z"
                fill="#60B8F8"
              />
              <g className="blu-live-heart" transform="translate(188 168)">
                <path
                  d="M24 18 C12 2 0 10 8 22 C14 30 24 38 24 38 C24 38 34 30 40 22 C48 10 36 2 24 18Z"
                  fill="#4AA8FF"
                />
              </g>
            </>
          )}
        </g>

        <g className={`blu-live-face blu-live-face--${expression}`}>
          {expression === "resting" ? (
            <>
              <path
                d="M182 218 Q210 198 238 218"
                fill="none"
                stroke="#1A1A1B"
                strokeLinecap="round"
                strokeWidth="10"
              />
              <path
                d="M274 218 Q302 198 330 218"
                fill="none"
                stroke="#1A1A1B"
                strokeLinecap="round"
                strokeWidth="10"
              />
            </>
          ) : (
            <>
              <ellipse
                className="blu-live-eye"
                cx="210"
                cy={expression === "surprised" ? 214 : 220}
                rx={expression === "surprised" ? 30 : 26}
                ry={expression === "surprised" ? 36 : 32}
                fill="#1A1A1B"
              />
              <ellipse
                className="blu-live-eye"
                cx="310"
                cy={expression === "surprised" ? 214 : 220}
                rx={expression === "surprised" ? 30 : 26}
                ry={expression === "surprised" ? 36 : 32}
                fill="#1A1A1B"
              />
              <circle className="blu-live-glint" cx="198" cy={expression === "surprised" ? 200 : 206} r="7" fill="#fff" />
              <circle className="blu-live-glint" cx="298" cy={expression === "surprised" ? 200 : 206} r="7" fill="#fff" />
            </>
          )}

          {expression === "happy" ? (
            <path className="blu-live-mouth" d="M228 268 C240 300 280 300 292 268 C276 288 244 288 228 268Z" fill="#0E5AD0" />
          ) : null}
          {expression === "neutral" ? (
            <path
              className="blu-live-mouth"
              d="M232 278 Q256 302 280 278"
              fill="none"
              stroke="#1A1A1B"
              strokeLinecap="round"
              strokeWidth="9"
            />
          ) : null}
          {expression === "surprised" ? (
            <ellipse className="blu-live-mouth" cx="256" cy="292" rx="22" ry="28" fill="#0E5AD0" />
          ) : null}
          {expression === "resting" ? (
            <path
              className="blu-live-mouth"
              d="M236 286 Q256 304 276 286"
              fill="none"
              stroke="#1A1A1B"
              strokeLinecap="round"
              strokeWidth="8"
            />
          ) : null}
        </g>

        <g className="blu-live-dots" opacity="0">
          <circle cx="390" cy="150" r="8" />
          <circle cx="416" cy="150" r="8" />
          <circle cx="442" cy="150" r="8" />
        </g>
      </g>
    </svg>
  );
}
