const hand = "M -35 345 L -35 210 C 44 203 88 167 132 146 C 165 131 190 108 226 103 C 254 95 277 91 303 76 C 319 66 335 66 352 72 L 404 91 C 428 96 454 101 470 115 C 478 124 468 136 455 137 C 435 136 407 128 386 127 L 339 126 C 327 125 317 132 314 144 C 339 146 362 157 384 170 L 431 198 C 443 207 443 219 433 224 C 424 228 412 223 401 217 L 361 199 L 324 190 C 337 205 350 222 356 238 C 361 251 353 262 342 259 C 331 256 321 238 310 231 L 280 214 C 288 233 286 250 277 258 C 269 265 258 258 254 249 L 236 217 C 223 222 210 228 198 235 C 177 249 161 251 138 257 C 81 272 42 310 -35 345 Z";

function asciiRow(row: number) {
  return Array.from({ length: 82 }, (_, col) => {
    const wave = Math.sin(col * 0.23 + row * 0.3) + Math.cos(col * 0.13 - row * 0.22);
    const grain = ((col * 17 + row * 31) % 13) / 13;
    if (wave < -0.8) return grain > 0.6 ? ":" : ".";
    if (wave < 0.5) return grain > 0.4 ? "+" : ":";
    return grain > 0.7 ? "#" : "x";
  }).join("");
}

export function EscrowArt() {
  return <div className="escrow-art">
    <svg viewBox="0 0 1440 450" role="img" aria-labelledby="escrow-title escrow-description">
      <title id="escrow-title">Two sides. One agreement.</title>
      <desc id="escrow-description">Two hands made of ASCII characters reach toward a Middleman escrow vault. A whitelist holder and a USDC funder agree on terms through the contract. This is a conceptual illustration, not live transaction activity.</desc>
      <defs><clipPath id="hand-shape"><path d={hand} /></clipPath></defs>
      <g className="ascii-hand" transform="translate(0 40) rotate(-5 240 190)">
        <g clipPath="url(#hand-shape)">{Array.from({ length: 47 }, (_, row) => <text key={row} x="-40" y={row * 8} fontSize="8" letterSpacing="1.6">{asciiRow(row)}</text>)}</g>
      </g>
      <g className="ascii-hand" transform="translate(1440 420) scale(-1 -1) rotate(-5 240 190)">
        <g clipPath="url(#hand-shape)">{Array.from({ length: 47 }, (_, row) => <text key={row} x="-40" y={row * 8} fontSize="8" letterSpacing="1.6">{asciiRow(row + 8)}</text>)}</g>
      </g>
      <g className="diagram-lines" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M 379 95 L 510 95 L 510 220 L 594 220" strokeDasharray="2 5" />
        <path d="M 1060 360 L 932 360 L 932 220 L 846 220" strokeDasharray="2 5" />
        <path d="M 620 145 L 664 117 L 826 117 L 826 280 L 783 309 L 620 309 Z M 620 145 L 783 145 L 826 117 M 783 145 L 783 309" />
        <path d="M 642 175 L 761 175 L 761 277 L 642 277 Z" strokeDasharray="1 4" />
        <path d="M 672 158 L 735 158 M 795 164 L 814 152 M 795 172 L 814 160 M 795 180 L 814 168" />
        <path d="M 680 231 L 724 231 M 702 209 L 702 253" />
        <circle cx="702" cy="231" r="12" />
      </g>
      <g className="vault-type" fill="currentColor" textAnchor="middle">
        <text x="704" y="194" fontSize="11" letterSpacing="1">[ MIDDLEMAN ]</text>
        <text x="704" y="268" fontSize="8" letterSpacing="2">USDC ESCROW</text>
        <text x="720" y="355" fontSize="10" letterSpacing="2">THE CONTRACT IN BETWEEN</text>
      </g>
      <g className="wallet-label" fill="currentColor">
        <text x="275" y="53" fontSize="10" letterSpacing="2">01 / THE SPOT</text>
        <text x="275" y="75" fontSize="12">[ ▤ WHITELIST ]</text>
        <text x="1028" y="390" fontSize="10" letterSpacing="2">02 / THE CAPITAL</text>
        <text x="1028" y="412" fontSize="12">[ $ USDC ]</text>
      </g>
      <text className="value-flow flow-one" x="548" y="224" fontSize="13" fill="currentColor">+</text>
      <text className="value-flow flow-two" x="882" y="224" fontSize="13" fill="currentColor">$</text>
    </svg>
    <span className="art-note mono">CONCEPT DIAGRAM / NOT LIVE ACTIVITY</span>
  </div>;
}
