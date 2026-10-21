/* FreedomTalk landing illustrations.
   Flat vector in the pinned Discord world: rounded blobs, charcoal-dot
   faces, flat shade shapes, sticker palette (#fee75c / #eb459e / #57f287)
   reserved for artwork. No gradients, no strokes on bodies. */

const CHARCOAL = '#23272a';
const INK_SHADE = 'rgba(0,0,0,0.10)';
const CREAM = '#f2f3f5';
const YELLOW = '#fee75c';
const YELLOW_DEEP = '#e3c93f';
const FUCHSIA = '#eb459e';
const FUCHSIA_DEEP = '#c22e7e';
const GREEN = '#57f287';
const GREEN_DEEP = '#2fbf68';
const BLURPLE = '#5865f2';
const BLURPLE_DEEP = '#4550c4';

/* ---------------------------------------------------------------- */
/* Small face helper — keeps every character on-model               */
/* ---------------------------------------------------------------- */

/** App-style logo tile: blurple rounded square, tiny white bird. */
export function LogoMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="0" y="0" width="64" height="64" rx="16" fill={BLURPLE} />
      {/* bird body */}
      <path
        d="M32,12 C44,12 51,22 51,36 C51,49 43,55 32,55 C21,55 13,49 13,36 C13,22 20,12 32,12 Z"
        fill="#ffffff"
      />
      {/* tuft */}
      <rect x="26" y="6" width="5" height="10" rx="2.5" fill="#ffffff" transform="rotate(-12 28.5 11)" />
      <rect x="33" y="5" width="5" height="10" rx="2.5" fill="#ffffff" transform="rotate(10 35.5 10)" />
      {/* eye */}
      <circle cx="26" cy="30" r="3.4" fill={CHARCOAL} />
      <circle cx="25" cy="29" r="1.1" fill="#ffffff" />
      {/* beak */}
      <path d="M40,30 L50,34 L40,40 Z" fill={YELLOW} />
      {/* wing */}
      <rect x="16" y="36" width="14" height="9" rx="4.5" fill="#dfe3ff" transform="rotate(14 23 40)" />
    </svg>
  );
}

function Face({
  x = 110,
  y = 108,
  closed = false,
}: {
  x?: number;
  y?: number;
  closed?: boolean;
}) {
  return (
    <g>
      {closed ? (
        <>
          <path
            d={`M${x - 24},${y} q8,9 16,0`}
            fill="none"
            stroke={CHARCOAL}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d={`M${x + 8},${y} q8,9 16,0`}
            fill="none"
            stroke={CHARCOAL}
            strokeWidth="5"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx={x - 21} cy={y} r="8.5" fill={CHARCOAL} />
          <circle cx={x + 21} cy={y} r="8.5" fill={CHARCOAL} />
          <circle cx={x - 24} cy={y - 3} r="2.8" fill={CREAM} />
          <circle cx={x + 18} cy={y - 3} r="2.8" fill={CREAM} />
        </>
      )}
      {/* beak */}
      <path
        d={`M${x}, ${y + 10} L${x + 15}, ${y + 19} Q${x}, ${y + 31} ${x - 15}, ${y + 19} Z`}
        fill={YELLOW}
      />
      <path
        d={`M${x - 15}, ${y + 19} Q${x}, ${y + 31} ${x + 15}, ${y + 19} L${x + 8}, ${y + 26} Q${x}, ${y + 31} ${x - 8}, ${y + 26} Z`}
        fill={YELLOW_DEEP}
      />
      {/* blush */}
      <ellipse cx={x - 38} cy={y + 18} rx="10" ry="6" fill={FUCHSIA} opacity="0.4" />
      <ellipse cx={x + 38} cy={y + 18} rx="10" ry="6" fill={FUCHSIA} opacity="0.4" />
    </g>
  );
}

function Headphones({ width = 12 }: { width?: number }) {
  return (
    <g>
      <path
        d="M56,96 C56,42 164,42 164,96"
        fill="none"
        stroke={CHARCOAL}
        strokeWidth={width}
        strokeLinecap="round"
      />
      <rect x="38" y="86" width="27" height="42" rx="13" fill={CHARCOAL} />
      <rect x="155" y="86" width="27" height="42" rx="13" fill={CHARCOAL} />
      <circle cx="168.5" cy="128" r="4.5" fill={GREEN} />
    </g>
  );
}

/* ---------------------------------------------------------------- */
/* The cast                                                          */
/* ---------------------------------------------------------------- */

/** Blurple bird, waving. Own coordinate space: 220 × 240. */
export function BirdWave() {
  return (
    <g>
      {/* tuft */}
      <rect x="92" y="20" width="12" height="30" rx="6" fill={BLURPLE_DEEP} transform="rotate(-14 98 35)" />
      <rect x="112" y="16" width="12" height="32" rx="6" fill={BLURPLE_DEEP} transform="rotate(10 118 32)" />
      {/* waving wing (left, raised) */}
      <g className="ftl-wave-wing">
        <rect x="8" y="52" width="38" height="64" rx="19" fill={BLURPLE_DEEP} transform="rotate(-34 27 84)" />
      </g>
      {/* body */}
      <path
        d="M110,32 C156,32 184,72 184,130 C184,188 154,216 110,216 C66,216 36,188 36,130 C36,72 64,32 110,32 Z"
        fill={BLURPLE}
      />
      <path
        d="M110,32 C156,32 184,72 184,130 C184,166 174,194 152,208 C168,178 170,120 152,84 C142,60 126,40 110,32 Z"
        fill={INK_SHADE}
      />
      {/* belly */}
      <ellipse cx="108" cy="164" rx="50" ry="46" fill={CREAM} />
      <Face x={110} y={104} />
      {/* resting wing */}
      <rect x="156" y="150" width="34" height="58" rx="17" fill={BLURPLE_DEEP} transform="rotate(10 173 179)" />
      <Headphones />
      {/* feet */}
      <rect x="86" y="210" width="22" height="11" rx="5.5" fill={YELLOW_DEEP} />
      <rect x="112" y="210" width="22" height="11" rx="5.5" fill={YELLOW_DEEP} />
    </g>
  );
}

/** Green bird leaning in with a game controller. 220 × 240. */
export function BirdGame() {
  return (
    <g transform="rotate(-4 110 120)">
      <rect x="94" y="18" width="12" height="30" rx="6" fill={GREEN_DEEP} transform="rotate(-16 100 33)" />
      {/* body */}
      <path
        d="M110,32 C156,32 184,72 184,130 C184,188 154,216 110,216 C66,216 36,188 36,130 C36,72 64,32 110,32 Z"
        fill={GREEN}
      />
      <path
        d="M110,32 C156,32 184,72 184,130 C184,166 174,194 152,208 C168,178 170,120 152,84 C142,60 126,40 110,32 Z"
        fill={INK_SHADE}
      />
      <ellipse cx="108" cy="164" rx="50" ry="46" fill={CREAM} />
      <Face x={110} y={102} />
      {/* arms wrapping the controller */}
      <rect x="34" y="152" width="36" height="56" rx="18" fill={GREEN_DEEP} transform="rotate(24 52 180)" />
      <rect x="150" y="152" width="36" height="56" rx="18" fill={GREEN_DEEP} transform="rotate(-24 168 180)" />
      {/* controller */}
      <g>
        <circle cx="72" cy="196" r="20" fill={CHARCOAL} />
        <circle cx="148" cy="196" r="20" fill={CHARCOAL} />
        <rect x="70" y="178" width="80" height="36" rx="18" fill={CHARCOAL} />
        <path
          d="M92,190 h8 v-6 h10 v6 h8 v10 h-8 v6 h-10 v-6 h-8 Z"
          fill={CREAM}
          transform="translate(-4 -2)"
        />
        <circle cx="130" cy="188" r="4.5" fill={YELLOW} />
        <circle cx="141" cy="197" r="4.5" fill={FUCHSIA} />
        <circle cx="119" cy="197" r="4.5" fill={BLURPLE} />
        <circle cx="130" cy="206" r="4.5" fill={GREEN} />
      </g>
      {/* feet */}
      <rect x="86" y="210" width="22" height="11" rx="5.5" fill={YELLOW_DEEP} />
      <rect x="112" y="210" width="22" height="11" rx="5.5" fill={YELLOW_DEEP} />
    </g>
  );
}

/** Fuchsia bird, eyes closed, headphones on — pure chill. 220 × 240. */
export function BirdChill() {
  return (
    <g transform="rotate(6 110 120)">
      <rect x="90" y="18" width="12" height="30" rx="6" fill={FUCHSIA_DEEP} transform="rotate(14 96 33)" />
      {/* body */}
      <path
        d="M110,32 C156,32 184,72 184,130 C184,188 154,216 110,216 C66,216 36,188 36,130 C36,72 64,32 110,32 Z"
        fill={FUCHSIA}
      />
      <path
        d="M110,32 C156,32 184,72 184,130 C184,166 174,194 152,208 C168,178 170,120 152,84 C142,60 126,40 110,32 Z"
        fill={INK_SHADE}
      />
      <ellipse cx="108" cy="164" rx="50" ry="46" fill={CREAM} />
      <Face x={110} y={104} closed />
      {/* wings relaxed */}
      <rect x="30" y="140" width="36" height="58" rx="18" fill={FUCHSIA_DEEP} transform="rotate(18 48 169)" />
      <rect x="154" y="140" width="36" height="58" rx="18" fill={FUCHSIA_DEEP} transform="rotate(-18 172 169)" />
      <Headphones />
      {/* feet */}
      <rect x="86" y="210" width="22" height="11" rx="5.5" fill={YELLOW_DEEP} />
      <rect x="112" y="210" width="22" height="11" rx="5.5" fill={YELLOW_DEEP} />
    </g>
  );
}

/** Painter bird (green, holds a brush) for the customization panel. */
export function BirdPainter() {
  return (
    <g transform="rotate(3 110 120)">
      <rect x="94" y="18" width="12" height="30" rx="6" fill={GREEN_DEEP} transform="rotate(-16 100 33)" />
      <path
        d="M110,32 C156,32 184,72 184,130 C184,188 154,216 110,216 C66,216 36,188 36,130 C36,72 64,32 110,32 Z"
        fill={GREEN}
      />
      <path
        d="M110,32 C156,32 184,72 184,130 C184,166 174,194 152,208 C168,178 170,120 152,84 C142,60 126,40 110,32 Z"
        fill={INK_SHADE}
      />
      <ellipse cx="108" cy="164" rx="50" ry="46" fill={CREAM} />
      <Face x={110} y={102} />
      {/* brush arm reaching up-left, bristles at the working end */}
      <rect x="30" y="120" width="36" height="56" rx="18" fill={GREEN_DEEP} transform="rotate(48 48 148)" />
      <g transform="rotate(-42 70 96)">
        <path d="M62,4 c-4,12 -4,22 0,30 h16 c4,-8 4,-18 0,-30 c-2,-6 -14,-6 -16,0 Z" fill={FUCHSIA} />
        <rect x="59" y="32" width="19" height="14" rx="4" fill="#b5bac1" />
        <rect x="62" y="44" width="13" height="66" rx="6.5" fill={YELLOW} />
      </g>
      {/* resting wing */}
      <rect x="156" y="150" width="34" height="56" rx="17" fill={GREEN_DEEP} transform="rotate(12 173 178)" />
      {/* feet */}
      <rect x="86" y="210" width="22" height="11" rx="5.5" fill={YELLOW_DEEP} />
      <rect x="112" y="210" width="22" height="11" rx="5.5" fill={YELLOW_DEEP} />
    </g>
  );
}

/* ---------------------------------------------------------------- */
/* Stickers — die-cut white border, playful rotations               */
/* ---------------------------------------------------------------- */


/** Four-point sparkle, 44 × 44 box. */
export function Spark({ x, y, size = 44, color = YELLOW, className }: { x: number; y: number; size?: number; color?: string; className?: string }) {
  return (
    <g className={className}>
      <g transform={`translate(${x} ${y}) scale(${size / 44})`}>
        <path
          d="M22,2 C24,14 30,20 42,22 C30,24 24,30 22,42 C20,30 14,24 2,22 C14,20 20,14 22,2 Z"
          fill={color}
        />
      </g>
    </g>
  );
}

/** Five-point star, ~48 box. */
export function Star5({ x, y, size = 48, color = FUCHSIA, className }: { x: number; y: number; size?: number; color?: string; className?: string }) {
  return (
    <g className={className}>
      <g transform={`translate(${x} ${y}) scale(${size / 48})`}>
        <path
          d="M24,3 L30.2,16.4 L45,18.1 L34,28 L37,42.5 L24,35 L11,42.5 L14,28 L3,18.1 L17.8,16.4 Z"
          fill={color}
        />
      </g>
    </g>
  );
}

/** Wavy squiggle stroke. */
export function Squiggle({ x, y, w = 72, color = GREEN, className }: { x: number; y: number; w?: number; color?: string; className?: string }) {
  return (
    <g className={className}>
      <g transform={`translate(${x} ${y})`}>
        <path
          d={`M4,16 Q${w * 0.18},-6 ${w * 0.36},16 T${w * 0.68},16 T${w},16`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

/** Rounded plus. */
export function PlusFloat({ x, y, size = 34, color = '#ffffff', className }: { x: number; y: number; size?: number; color?: string; className?: string }) {
  const b = size / 9;
  return (
    <g className={className}>
      <g transform={`translate(${x} ${y})`}>
        <path
          d={`M${size / 2 - b},0 h${2 * b} v${size / 2 - b} h${size / 2 - b} v${2 * b} h-${size / 2 - b} v${size / 2 - b} h-${2 * b} v-${size / 2 - b} h-${size / 2 - b} v-${2 * b} h${size / 2 - b} Z`}
          fill={color}
          opacity="0.9"
        />
      </g>
    </g>
  );
}

/** "gg" speech-bubble sticker. ~96 × 84. */
export function StickerGG({ x, y, rotate = 0, className }: { x: number; y: number; rotate?: number; className?: string }) {
  return (
    <g className={className}>
      <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
        <rect x="0" y="0" width="88" height="58" rx="18" fill={YELLOW} />
        <path d="M22,54 L34,80 L44,54 Z" fill={YELLOW} />
        <text
          x="44"
          y="41"
          textAnchor="middle"
          fontSize="30"
          fontWeight="800"
          fill={CHARCOAL}
          style={{ fontFamily: 'var(--ftl-display)' }}
        >
          gg
        </text>
      </g>
    </g>
  );
}

/** Music note. */
export function StickerNote({ x, y, size = 40, color = BLURPLE, className }: { x: number; y: number; size?: number; color?: string; className?: string }) {
  return (
    <g className={className}>
      <g transform={`translate(${x} ${y}) scale(${size / 40})`}>
        <path d="M15,34 v-22 l18,-6 v22" fill="none" stroke={color} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx="10.5" cy="34" rx="7.5" ry="6" fill={color} />
        <ellipse cx="28.5" cy="28" rx="7.5" ry="6" fill={color} />
      </g>
    </g>
  );
}

/** Heart sticker. */
export function StickerHeart({ x, y, size = 40, color = FUCHSIA, className }: { x: number; y: number; size?: number; color?: string; className?: string }) {
  return (
    <g className={className}>
      <g transform={`translate(${x} ${y}) scale(${size / 40})`}>
        <path
          d="M20,36 C8,27 2,20 2,12.5 C2,6.5 7,2 13,2 C16,2 18.6,3.4 20,5.6 C21.4,3.4 24,2 27,2 C33,2 38,6.5 38,12.5 C38,20 32,27 20,36 Z"
          fill={color}
        />
      </g>
    </g>
  );
}

/** Bolt sticker. */
export function StickerBolt({ x, y, size = 40, color = YELLOW, className }: { x: number; y: number; size?: number; color?: string; className?: string }) {
  return (
    <g className={className}>
      <g transform={`translate(${x} ${y}) scale(${size / 40})`}>
        <path
          d="M23,2 L8,23 h9 L15,38 L32,16 h-9.5 Z"
          fill={color}
        />
      </g>
    </g>
  );
}

/* ---------------------------------------------------------------- */
/* Hero scene — the group chat, grown to page scale                 */
/* ---------------------------------------------------------------- */

function ChatMessage({
  x,
  y,
  color,
  initial,
  name,
  text,
  ink = '#f2f3f5',
}: {
  x: number;
  y: number;
  color: string;
  initial: string;
  name: string;
  text: string;
  ink?: string;
}) {
  return (
    <g>
      <circle cx={x + 18} cy={y + 21} r="18" fill={color} />
      <text x={x + 18} y={y + 27} textAnchor="middle" fontSize="17" fontWeight="800" fill={ink} style={{ fontFamily: 'var(--ftl-display)' }}>
        {initial}
      </text>
      <text x={x + 48} y={y + 14} fontSize="15.5" fontWeight="800" fill={color} style={{ fontFamily: 'var(--ftl-body)' }}>
        {name}
      </text>
      <text x={x + 48} y={y + 36} fontSize="16.5" fontWeight="600" fill="#dbdee1" style={{ fontFamily: 'var(--ftl-body)' }}>
        {text}
      </text>
    </g>
  );
}

export function HeroScene() {
  return (
    <svg viewBox="0 0 1160 660" role="img" aria-label="Illustration of a FreedomTalk chat window with friends hanging out around it">
      {/* faint background sprinkles */}
      <circle cx="86" cy="330" r="26" fill="none" stroke="#3d4046" strokeWidth="3" />
      <circle cx="1088" cy="420" r="18" fill="none" stroke="#3d4046" strokeWidth="3" />
      <circle cx="580" cy="636" r="10" fill="none" stroke="#3d4046" strokeWidth="3" />
      <Spark x={560} y={34} size={30} color="#3d4046" className="ftl-float-slow ftl-float-d2" />

      {/* ---------------- the app window ---------------- */}
      <g transform="translate(150 118)">
        {/* window */}
        <rect x="0" y="0" width="780" height="440" rx="26" fill="#36393f" />
        {/* header */}
        <path d="M0,26 a26,26 0 0 1 26,-26 h728 a26,26 0 0 1 26,26 v30 h-780 Z" fill="#2c2f33" />
        <circle cx="34" cy="28" r="7" fill="#ed4245" />
        <circle cx="58" cy="28" r="7" fill="#fee75c" />
        <circle cx="82" cy="28" r="7" fill="#57f287" />
        <rect x="290" y="14" width="200" height="28" rx="14" fill="#23272a" />
        <text x="390" y="32" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#b5bac1" style={{ fontFamily: 'var(--ftl-body)' }}>
          # game-night
        </text>

        {/* server rail */}
        <rect x="0" y="56" width="68" height="384" rx="0" fill="#1e1f22" />
        <path d="M0,56 h68 v384 h-42 a26,26 0 0 1 -26,-26 Z" fill="#1e1f22" />
        {/* active indicator */}
        <rect x="0" y="96" width="6" height="44" rx="3" fill="#ffffff" />
        <circle cx="37" cy="118" r="17" fill="#5865f2" />
        <text x="37" y="123" textAnchor="middle" fontSize="15" fontWeight="800" fill="#ffffff" style={{ fontFamily: 'var(--ftl-display)' }}>
          FT
        </text>
        <circle cx="37" cy="166" r="17" fill="#57f287" />
        <circle cx="37" cy="214" r="17" fill="#fee75c" />
        <circle cx="37" cy="262" r="17" fill="#eb459e" />
        <circle cx="37" cy="310" r="17" fill="#2c2f33" stroke="#4a4d55" strokeWidth="2.5" />
        <path d="M37,302 v16 M29,310 h16" stroke="#b5bac1" strokeWidth="3" strokeLinecap="round" />

        {/* channel list */}
        <path d="M68,56 h116 v384 h-90 a26,26 0 0 1 -26,-26 Z" fill="#2b2d31" />
        <text x="86" y="86" fontSize="12.5" fontWeight="800" fill="#8e9297" style={{ fontFamily: 'var(--ftl-body)', letterSpacing: '0.06em' }}>
          THE CREW
        </text>
        <g>
          <rect x="78" y="102" width="96" height="32" rx="10" fill="#393c41" />
          <text x="90" y="122" fontSize="13.5" fontWeight="700" fill="#f2f3f5" style={{ fontFamily: 'var(--ftl-body)' }}>
            # game-night
          </text>
          <text x="90" y="161" fontSize="13.5" fontWeight="700" fill="#8e9297" style={{ fontFamily: 'var(--ftl-body)' }}>
            # memes
          </text>
          <text x="90" y="193" fontSize="13.5" fontWeight="700" fill="#8e9297" style={{ fontFamily: 'var(--ftl-body)' }}>
            # loot-drops
          </text>
          <text x="90" y="225" fontSize="13.5" fontWeight="700" fill="#8e9297" style={{ fontFamily: 'var(--ftl-body)' }}>
            # raid-plans
          </text>
        </g>

        {/* chat */}
        <g>
          <ChatMessage x={196} y={88} color="#eb459e" initial="M" name="mia" text="match in 10 — hop in voice 🎮" />
          <ChatMessage x={196} y={158} color="#57f287" initial="S" name="sam" text="GG!! last round was pure chaos 😂" />
          {/* reactions */}
          <g transform="translate(244 200)">
            <rect x="0" y="0" width="62" height="28" rx="12" fill="#393c41" stroke="#5865f2" strokeWidth="2" />
            <text x="16" y="21" fontSize="14">🎉</text>
            <text x="36" y="19" fontSize="13.5" fontWeight="800" fill="#dbdee1" style={{ fontFamily: 'var(--ftl-body)' }}>3</text>
            <rect x="72" y="0" width="62" height="28" rx="12" fill="#393c41" />
            <text x="88" y="21" fontSize="14">🔥</text>
            <text x="108" y="19" fontSize="13.5" fontWeight="800" fill="#dbdee1" style={{ fontFamily: 'var(--ftl-body)' }}>5</text>
          </g>
          {/* typing */}
          <g transform="translate(196 268)">
            <circle cx="18" cy="14" r="16" fill="#fee75c" />
            <text x="18" y="19" textAnchor="middle" fontSize="15" fontWeight="800" fill={CHARCOAL} style={{ fontFamily: 'var(--ftl-display)' }}>
              L
            </text>
            <text x="44" y="18" fontSize="13.5" fontWeight="600" fill="#8e9297" style={{ fontFamily: 'var(--ftl-body)' }}>
              lena is typing
            </text>
            <g fill="#8e9297">
              <circle className="ftl-typing-dot" cx="140" cy="14" r="4" />
              <circle className="ftl-typing-dot" cx="154" cy="14" r="4" />
              <circle className="ftl-typing-dot" cx="168" cy="14" r="4" />
            </g>
          </g>
          {/* input bar */}
          <rect x="196" y="330" width="548" height="52" rx="16" fill="#2b2d31" />
          <circle cx="226" cy="356" r="14" fill="#393c41" />
          <path d="M226,349 v14 M219,356 h14" stroke="#b5bac1" strokeWidth="3" strokeLinecap="round" />
          <rect x="252" y="348" width="300" height="16" rx="8" fill="#393c41" opacity="0.7" />
          <g transform="translate(676 344)">
            <rect x="0" y="0" width="56" height="24" rx="12" fill="#5865f2" />
            <path d="M14,12 h22 M28,5 l8,7 -8,7" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      </g>

      {/* ---------------- voice card overlapping the window ---------------- */}
      <g className="ftl-float ftl-float-d1">
        <g transform="translate(206 470)">
          <rect x="0" y="0" width="252" height="128" rx="20" fill="#5865f2" />
          <circle cx="34" cy="34" r="12" fill="none" stroke="#ffffff" strokeWidth="3.5" />
          <path d="M29,35 a5,5 0 0 1 10,0 v3 a5,5 0 0 1 -10,0 Z" fill="#ffffff" stroke="none" />
          <path d="M26,33 a8,8 0 0 1 16,0" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <text x="56" y="39" fontSize="14" fontWeight="800" fill="#ffffff" style={{ fontFamily: 'var(--ftl-body)', letterSpacing: '0.08em' }}>
            GAME NIGHT
          </text>
          <g transform="translate(196 18)" fill="#ffffff">
            <rect className="ftl-voice-bar" x="0" y="10" width="5" height="14" rx="2.5" />
            <rect className="ftl-voice-bar" x="8" y="6" width="5" height="18" rx="2.5" />
            <rect className="ftl-voice-bar" x="16" y="12" width="5" height="12" rx="2.5" />
            <rect className="ftl-voice-bar" x="24" y="8" width="5" height="16" rx="2.5" />
          </g>
          {/* avatars */}
          <circle cx="46" cy="86" r="21" fill="#fee75c" stroke="#57f287" strokeWidth="4" />
          <text x="46" y="92" textAnchor="middle" fontSize="17" fontWeight="800" fill={CHARCOAL} style={{ fontFamily: 'var(--ftl-display)' }}>M</text>
          <circle cx="98" cy="86" r="21" fill="#ffffff" />
          <text x="98" y="92" textAnchor="middle" fontSize="17" fontWeight="800" fill={BLURPLE} style={{ fontFamily: 'var(--ftl-display)' }}>S</text>
          <circle cx="150" cy="86" r="21" fill="#eb459e" />
          <text x="150" y="92" textAnchor="middle" fontSize="17" fontWeight="800" fill="#ffffff" style={{ fontFamily: 'var(--ftl-display)' }}>L</text>
          <circle cx="202" cy="86" r="21" fill="#57f287" />
          <text x="202" y="92" textAnchor="middle" fontSize="17" fontWeight="800" fill={CHARCOAL} style={{ fontFamily: 'var(--ftl-display)' }}>J</text>
        </g>
      </g>

      {/* ---------------- the friends ---------------- */}
      <g className="ftl-float-slow">
        <g transform="translate(18 288) scale(0.78)">
          <BirdWave />
        </g>
      </g>
      <g className="ftl-float ftl-float-d2">
        <g transform="translate(948 148) scale(0.7) rotate(6)">
          <BirdChill />
        </g>
      </g>
      <g className="ftl-float-slow ftl-float-d3">
        <g transform="translate(920 388) scale(0.72)">
          <BirdGame />
        </g>
      </g>

      {/* gg bubble from the waving bird */}
      <g className="ftl-float ftl-float-d3">
        <StickerGG x={6} y={172} rotate={-8} />
      </g>

      {/* scattered stickers */}
      <Spark x={128} y={128} size={46} color={YELLOW} className="ftl-float ftl-float-d1" />
      <Star5 x={1046} y={86} size={50} color={FUCHSIA} className="ftl-float-slow ftl-float-d2" />
      <Squiggle x={568} y={66} color={GREEN} className="ftl-float ftl-float-d2" />
      <PlusFloat x={986} y={332} size={30} color="#ffffff" className="ftl-float-slow" />
      <Spark x={448} y={596} size={38} color={FUCHSIA} className="ftl-float ftl-float-d3" />
      <StickerNote x={596} y={588} className="ftl-float-slow ftl-float-d1" />
      <Star5 x={736} y={608} size={42} color={YELLOW} className="ftl-float ftl-float-d2" />
    </svg>
  );
}

/* ---------------------------------------------------------------- */
/* Feature art panels                                               */
/* ---------------------------------------------------------------- */

/** Make-it-yours: server tiles, role chips, theme card, painter bird. */
export function CustomizeArt() {
  return (
    <svg viewBox="0 0 640 480" aria-hidden="true">
      <rect x="0" y="0" width="640" height="480" rx="28" fill="#2c2f33" />

      {/* theme card */}
      <g transform="translate(56 56)">
        <rect x="0" y="0" width="216" height="140" rx="18" fill="#36393f" />
        <text x="20" y="34" fontSize="13" fontWeight="800" fill="#8e9297" style={{ fontFamily: 'var(--ftl-body)', letterSpacing: '0.07em' }}>
          SERVER STYLE
        </text>
        <circle cx="34" cy="66" r="14" fill="#5865f2" />
        <circle cx="72" cy="66" r="14" fill="#eb459e" />
        <circle cx="110" cy="66" r="14" fill="#fee75c" />
        <circle cx="148" cy="66" r="14" fill="#57f287" />
        <circle cx="34" cy="66" r="18" fill="none" stroke="#ffffff" strokeWidth="3" />
        <rect x="20" y="98" width="176" height="12" rx="6" fill="#2b2d31" />
        <rect x="20" y="98" width="104" height="12" rx="6" fill="#5865f2" />
        <circle cx="124" cy="104" r="10" fill="#ffffff" />
      </g>

      {/* role chips */}
      <g style={{ fontFamily: 'var(--ftl-display)' }} fontWeight="700" fontSize="15">
        <g className="ftl-float ftl-float-d1">
          <rect x="316" y="52" width="118" height="38" rx="19" fill="#eb459e" />
          <text x="375" y="76" textAnchor="middle" fill="#ffffff">raid lead</text>
        </g>
        <g className="ftl-float-slow ftl-float-d2">
          <rect x="366" y="104" width="130" height="38" rx="19" fill="#fee75c" />
          <text x="431" y="128" textAnchor="middle" fill={CHARCOAL}>meme lord</text>
        </g>
        <g className="ftl-float ftl-float-d3">
          <rect x="342" y="156" width="134" height="38" rx="19" fill="#5865f2" />
          <text x="409" y="180" textAnchor="middle" fill="#ffffff">vc gremlin</text>
        </g>
      </g>

      {/* server tiles */}
      <g transform="translate(56 268)">
        <rect x="0" y="0" width="96" height="96" rx="26" fill="#fee75c" />
        <Star5x
          cx={48}
          cy={50}
          color={CHARCOAL}
        />
        <rect x="116" y="0" width="96" height="96" rx="26" fill="#eb459e" />
        <g transform="translate(140 25) scale(1.15)">
          <path d="M23,2 L8,23 h9 L15,38 L32,16 h-9.5 Z" fill="#ffffff" />
        </g>
        <rect x="232" y="0" width="96" height="96" rx="26" fill="#57f287" />
        <g transform="translate(255 26) scale(0.9)">
          <rect x="0" y="10" width="56" height="28" rx="14" fill={CHARCOAL} />
          <circle cx="10" cy="24" r="12" fill={CHARCOAL} />
          <circle cx="46" cy="24" r="12" fill={CHARCOAL} />
          <circle cx="36" cy="20" r="3.5" fill="#fee75c" />
          <circle cx="43" cy="26" r="3.5" fill="#eb459e" />
          <circle cx="29" cy="26" r="3.5" fill="#5865f2" />
          <circle cx="36" cy="32" r="3.5" fill="#ffffff" />
        </g>
        {/* active pill */}
        <rect x="-14" y="20" width="8" height="56" rx="4" fill="#ffffff" />
      </g>

      {/* painter bird */}
      <g transform="translate(379 268) scale(0.82)">
        <BirdPainter />
      </g>

      {/* sprinkles */}
      <Spark x={288} y={210} size={34} color={YELLOW} className="ftl-float ftl-float-d2" />
      <PlusFloat x={584} y={72} size={26} color="#ffffff" className="ftl-float-slow" />
      <Squiggle x={110} y={430} w={64} color={BLURPLE} className="ftl-float ftl-float-d1" />
      <Star5 x={560} y={420} size={38} color={YELLOW} className="ftl-float-slow ftl-float-d3" />
    </svg>
  );
}

function Star5x({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <g transform={`translate(${cx - 24} ${cy - 24}) scale(1)`}>
      <path
        d="M24,3 L30.2,16.4 L45,18.1 L34,28 L37,42.5 L24,35 L11,42.5 L14,28 L3,18.1 L17.8,16.4 Z"
        fill={color}
      />
    </g>
  );
}

/** Find-your-people: friends list + invite pill + waving bird. */
export function FriendsArt() {
  return (
    <svg viewBox="0 0 640 480" aria-hidden="true">
      <rect x="0" y="0" width="640" height="480" rx="28" fill="#2c2f33" />

      {/* friends card */}
      <g transform="translate(64 56)">
        <rect x="0" y="0" width="316" height="300" rx="20" fill="#36393f" />
        <path d="M0,20 a20,20 0 0 1 20,-20 h276 a20,20 0 0 1 20,20 v36 h-316 Z" fill="#2b2d31" />
        <text x="22" y="33" fontSize="15" fontWeight="800" fill="#f2f3f5" style={{ fontFamily: 'var(--ftl-display)' }}>
          Friends
        </text>
        <circle cx="278" cy="28" r="6" fill="#57f287" />
        <text x="292" y="33" fontSize="13" fontWeight="800" fill="#57f287" style={{ fontFamily: 'var(--ftl-body)' }}>
          3
        </text>
        {/* rows */}
        <g style={{ fontFamily: 'var(--ftl-body)' }}>
          <g transform="translate(22 74)">
            <circle cx="20" cy="20" r="20" fill="#eb459e" />
            <text x="20" y="26" textAnchor="middle" fontSize="16" fontWeight="800" fill="#ffffff" style={{ fontFamily: 'var(--ftl-display)' }}>M</text>
            <circle cx="34" cy="34" r="6.5" fill="#57f287" stroke="#36393f" strokeWidth="3" />
            <text x="54" y="14" fontSize="15" fontWeight="800" fill="#f2f3f5">mia</text>
            <text x="54" y="33" fontSize="12.5" fontWeight="600" fill="#8e9297">online — queueing valo</text>
          </g>
          <g transform="translate(22 138)">
            <circle cx="20" cy="20" r="20" fill="#57f287" />
            <text x="20" y="26" textAnchor="middle" fontSize="16" fontWeight="800" fill={CHARCOAL} style={{ fontFamily: 'var(--ftl-display)' }}>S</text>
            <circle cx="34" cy="34" r="6.5" fill="#57f287" stroke="#36393f" strokeWidth="3" />
            <text x="54" y="14" fontSize="15" fontWeight="800" fill="#f2f3f5">sam</text>
            <text x="54" y="33" fontSize="12.5" fontWeight="600" fill="#8e9297">in Game Night</text>
          </g>
          <g transform="translate(22 202)">
            <circle cx="20" cy="20" r="20" fill="#fee75c" />
            <text x="20" y="26" textAnchor="middle" fontSize="16" fontWeight="800" fill={CHARCOAL} style={{ fontFamily: 'var(--ftl-display)' }}>L</text>
            <circle cx="34" cy="34" r="6.5" fill="#f0b232" stroke="#36393f" strokeWidth="3" />
            <text x="54" y="14" fontSize="15" fontWeight="800" fill="#f2f3f5">lena</text>
            <text x="54" y="33" fontSize="12.5" fontWeight="600" fill="#8e9297">idle — snacking</text>
          </g>
        </g>
      </g>

      {/* invite pill overlapping the panel bottom */}
      <g className="ftl-float ftl-float-d1">
        <g transform="translate(96 366)">
          <rect x="0" y="0" width="356" height="64" rx="32" fill="#5865f2" />
          <g transform="translate(27 27)">
            <circle cx="9" cy="12" r="8" fill="none" stroke="#ffffff" strokeWidth="3.5" />
            <circle cx="21" cy="0" r="8" fill="none" stroke="#ffffff" strokeWidth="3.5" />
            <path d="M9,8 L21,4" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          </g>
          <text x="62" y="38" fontSize="17" fontWeight="800" fill="#ffffff" style={{ fontFamily: 'var(--ftl-display)' }}>
            ft.gg/letsplay
          </text>
          <rect x="266" y="14" width="76" height="36" rx="18" fill="#ffffff" />
          <text x="304" y="37" textAnchor="middle" fontSize="14.5" fontWeight="800" fill={BLURPLE} style={{ fontFamily: 'var(--ftl-display)' }}>
            Copy
          </text>
        </g>
      </g>

      {/* waving bird at the right */}
      <g transform="translate(432 210) scale(0.72)">
        <BirdWave />
      </g>

      {/* sprinkles */}
      <Spark x={470} y={70} size={36} color={GREEN} className="ftl-float ftl-float-d2" />
      <StickerHeart x={566} y={128} className="ftl-float ftl-float-d3" />
      <PlusFloat x={580} y={340} size={28} color="#ffffff" className="ftl-float-slow" />
      <Star5 x={64} y={408} size={36} color={FUCHSIA} className="ftl-float-slow ftl-float-d1" />
    </svg>
  );
}

/** Hang-out-together: voice room grid + chill bird. */
export function HangoutArt() {
  return (
    <svg viewBox="0 0 640 480" aria-hidden="true">
      <rect x="0" y="0" width="640" height="480" rx="28" fill="#2c2f33" />

      {/* channel header */}
      <g transform="translate(64 52)">
        <circle cx="14" cy="12" r="11" fill="none" stroke="#57f287" strokeWidth="3.5" />
        <path d="M9,13 a5,5 0 0 1 10,0 v3 a5,5 0 0 1 -10,0 Z" fill="#57f287" />
        <path d="M5.5,11 a8.5,8.5 0 0 1 17,0" fill="none" stroke="#57f287" strokeWidth="3" strokeLinecap="round" />
        <text x="36" y="18" fontSize="17" fontWeight="800" fill="#f2f3f5" style={{ fontFamily: 'var(--ftl-display)' }}>
          Game Night
        </text>
        <circle cx="196" cy="10" r="6" fill="#57f287" />
        <text x="210" y="14.5" fontSize="12.5" fontWeight="800" fill="#57f287" style={{ fontFamily: 'var(--ftl-body)', letterSpacing: '0.08em' }}>
          LIVE
        </text>
      </g>

      {/* voice tiles 2×2 */}
      <g transform="translate(64 100)">
        {/* tile 1 — speaking */}
        <g>
          <rect x="0" y="0" width="200" height="140" rx="18" fill="#36393f" />
          <circle cx="100" cy="57" r="34" fill="#fee75c" stroke="#57f287" strokeWidth="5" />
          <text x="100" y="65" textAnchor="middle" fontSize="24" fontWeight="800" fill={CHARCOAL} style={{ fontFamily: 'var(--ftl-display)' }}>M</text>
          <text x="100" y="117" textAnchor="middle" fontSize="14" fontWeight="800" fill="#b5bac1" style={{ fontFamily: 'var(--ftl-body)' }}>mia</text>
          <g transform="translate(152 100)" fill="#57f287">
            <rect className="ftl-voice-bar" x="0" y="6" width="4" height="12" rx="2" />
            <rect className="ftl-voice-bar" x="6" y="2" width="4" height="16" rx="2" />
            <rect className="ftl-voice-bar" x="12" y="8" width="4" height="10" rx="2" />
          </g>
        </g>
        {/* tile 2 */}
        <g transform="translate(224 0)">
          <rect x="0" y="0" width="200" height="140" rx="18" fill="#36393f" />
          <circle cx="100" cy="57" r="34" fill="#ffffff" />
          <text x="100" y="65" textAnchor="middle" fontSize="24" fontWeight="800" fill={BLURPLE} style={{ fontFamily: 'var(--ftl-display)' }}>S</text>
          <text x="100" y="117" textAnchor="middle" fontSize="14" fontWeight="800" fill="#b5bac1" style={{ fontFamily: 'var(--ftl-body)' }}>sam</text>
        </g>
        {/* tile 3 */}
        <g transform="translate(0 164)">
          <rect x="0" y="0" width="200" height="140" rx="18" fill="#36393f" />
          <circle cx="100" cy="57" r="34" fill="#eb459e" />
          <text x="100" y="65" textAnchor="middle" fontSize="24" fontWeight="800" fill="#ffffff" style={{ fontFamily: 'var(--ftl-display)' }}>L</text>
          <text x="100" y="117" textAnchor="middle" fontSize="14" fontWeight="800" fill="#b5bac1" style={{ fontFamily: 'var(--ftl-body)' }}>lena</text>
        </g>
        {/* tile 4 — open seat */}
        <g transform="translate(224 164)">
          <rect x="0" y="0" width="200" height="140" rx="18" fill="#313338" />
          <circle cx="100" cy="52" r="24" fill="none" stroke="#4a4d55" strokeWidth="4" />
          <path d="M100,40 v24 M88,52 h24" stroke="#8e9297" strokeWidth="4" strokeLinecap="round" />
          <text x="100" y="112" textAnchor="middle" fontSize="14" fontWeight="800" fill="#8e9297" style={{ fontFamily: 'var(--ftl-body)' }}>
            open seat
          </text>
        </g>
      </g>

      {/* chill bird + notes */}
      <g transform="translate(452 260) scale(0.62)">
        <BirdChill />
      </g>
      <StickerNote x={540} y={216} color={YELLOW} className="ftl-float ftl-float-d1" />
      <StickerNote x={588} y={252} size={30} color={GREEN} className="ftl-float-slow ftl-float-d3" />

      {/* sprinkles */}
      <Star5 x={470} y={80} size={40} color={YELLOW} className="ftl-float ftl-float-d2" />
      <Squiggle x={64} y={442} w={70} color={FUCHSIA} className="ftl-float ftl-float-d1" />
      <Spark x={60} y={30} size={30} color={BLURPLE} className="ftl-float-slow" />
    </svg>
  );
}
