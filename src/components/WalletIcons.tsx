// Wallet brand icons as SVG components

export function TonConnectIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 56 56" fill="none">
      <rect width="56" height="56" rx="12" fill="#0098EA"/>
      <path d="M28 44.4706L14.1176 28L28 11.5294L41.8824 28L28 44.4706Z" fill="white"/>
      <path d="M28 28L14.1176 28L28 11.5294L28 28Z" fill="#D4E5F7"/>
      <path d="M28 28L28 44.4706L14.1176 28L28 28Z" fill="#9CC4E3"/>
      <path d="M28 11.5294L41.8824 28L28 28V11.5294Z" fill="white"/>
      <path d="M28 28V44.4706L41.8824 28L28 28Z" fill="#D4E5F7"/>
    </svg>
  )
}

export function PhantomIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 128 128" fill="none">
      <circle cx="64" cy="64" r="64" fill="url(#phantom-grad)" />
      <path d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.7724 23C33.6612 23 14.8716 41.3057 14.4118 64.0916C13.9361 87.6085 33.047 107.053 56.7724 107.053H60.6628C81.8579 107.053 110.584 85.4085 110.584 64.9142Z" fill="url(#phantom-inner)"/>
      <circle cx="77.5" cy="58.5" r="8.5" fill="white" />
      <circle cx="44.5" cy="58.5" r="8.5" fill="white" />
      <defs>
        <linearGradient id="phantom-grad" x1="0" y1="0" x2="128" y2="128"><stop stopColor="#534BB1" /><stop offset="1" stopColor="#551BF9" /></linearGradient>
        <linearGradient id="phantom-inner" x1="14" y1="23" x2="110" y2="107"><stop stopColor="#534BB1" /><stop offset="1" stopColor="#551BF9" /></linearGradient>
      </defs>
    </svg>
  )
}

export function WalletConnectIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 300" fill="none">
      <circle cx="150" cy="150" r="150" fill="#3B99FC" />
      <path d="M102.7 126.8C128.9 101 171.1 101 197.3 126.8L200.5 130C201.8 131.3 201.8 133.4 200.5 134.7L189.2 145.8C188.5 146.5 187.4 146.5 186.8 145.8L182.4 141.4C164.6 123.8 135.4 123.8 117.6 141.4L112.8 146.2C112.2 146.8 111.1 146.8 110.4 146.2L99.1 135C97.8 133.7 97.8 131.6 99.1 130.3L102.7 126.8ZM219.8 148.9L229.8 158.8C231.1 160.1 231.1 162.2 229.8 163.5L181.3 211.3C180 212.6 177.8 212.6 176.5 211.3L142.5 177.7C142.2 177.4 141.6 177.4 141.3 177.7L107.3 211.3C106 212.6 103.8 212.6 102.5 211.3L53.9 163.5C52.6 162.2 52.6 160.1 53.9 158.8L63.9 148.9C65.2 147.6 67.4 147.6 68.7 148.9L102.7 182.5C103 182.8 103.6 182.8 103.9 182.5L137.9 148.9C139.2 147.6 141.4 147.6 142.7 148.9L176.7 182.5C177 182.8 177.6 182.8 177.9 182.5L211.9 148.9C213.4 147.6 215.5 147.6 216.8 148.9H219.8Z" fill="white"/>
    </svg>
  )
}

export function CoinbaseIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1024 1024" fill="none">
      <rect width="1024" height="1024" rx="512" fill="#0052FF" />
      <path fillRule="evenodd" clipRule="evenodd" d="M512 784C662.1 784 784 662.1 784 512C784 361.9 662.1 240 512 240C361.9 240 240 361.9 240 512C240 662.1 361.9 784 512 784ZM420 460C408.95 460 400 468.95 400 480V544C400 555.05 408.95 564 420 564H604C615.05 564 624 555.05 624 544V480C624 468.95 615.05 460 604 460H420Z" fill="white"/>
    </svg>
  )
}

export function MetaMaskIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 318 318" fill="none">
      <path d="M274.1 35.5L174.6 109.4L193 65.8L274.1 35.5Z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M44.4 35.5L143.1 110.1L125.6 65.8L44.4 35.5Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M238.3 206.8L211.8 247.4L268.5 263L284.8 207.7L238.3 206.8Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M33.9 207.7L50.1 263L106.8 247.4L80.3 206.8L33.9 207.7Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M103.6 138.2L87.8 162.1L143.8 164.6L141.7 104.1L103.6 138.2Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M214.9 138.2L176.1 103.4L174.6 164.6L230.5 162.1L214.9 138.2Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M106.8 247.4L140.6 230.9L111.4 208.1L106.8 247.4Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M177.9 230.9L211.8 247.4L207.1 208.1L177.9 230.9Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M211.8 247.4L177.9 230.9L180.6 253L180.3 262.3L211.8 247.4Z" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M106.8 247.4L138.3 262.3L138.1 253L140.6 230.9L106.8 247.4Z" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M138.8 193.5L110.6 185.2L130.5 176.1L138.8 193.5Z" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M179.7 193.5L188 176.1L208 185.2L179.7 193.5Z" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M106.8 247.4L111.6 206.8L80.3 207.7L106.8 247.4Z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M207 206.8L211.8 247.4L238.3 207.7L207 206.8Z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M230.5 162.1L174.6 164.6L179.8 193.5L188.1 176.1L208.1 185.2L230.5 162.1Z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M110.6 185.2L130.6 176.1L138.8 193.5L144 164.6L87.8 162.1L110.6 185.2Z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M87.8 162.1L111.4 208.1L110.6 185.2L87.8 162.1Z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M208.1 185.2L207.1 208.1L230.5 162.1L208.1 185.2Z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M144 164.6L138.8 193.5L145.4 227.6L146.9 182.7L144 164.6Z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M174.6 164.6L171.9 182.6L173.1 227.6L179.8 193.5L174.6 164.6Z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M179.8 193.5L173.1 227.6L177.9 230.9L207.1 208.1L208.1 185.2L179.8 193.5Z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M110.6 185.2L111.4 208.1L140.6 230.9L145.4 227.6L138.8 193.5L110.6 185.2Z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M180.3 262.3L180.6 253L178.1 250.8H140.4L138.1 253L138.3 262.3L106.8 247.4L117.8 256.4L140.1 271.9H178.4L200.8 256.4L211.8 247.4L180.3 262.3Z" fill="#C0AD9E" stroke="#C0AD9E" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M177.9 230.9L173.1 227.6H145.4L140.6 230.9L138.1 253L140.4 250.8H178.1L180.6 253L177.9 230.9Z" fill="#161616" stroke="#161616" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M278.3 114.2L286.8 73.4L274.1 35.5L177.9 106.9L214.9 138.2L267.2 153.5L278.8 140L273.8 136.4L281.8 129.1L275.6 124.3L283.6 118.2L278.3 114.2Z" fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M31.8 73.4L40.3 114.2L34.9 118.2L42.9 124.3L36.8 129.1L44.8 136.4L39.8 140L51.3 153.5L103.6 138.2L140.6 106.9L44.4 35.5L31.8 73.4Z" fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M267.2 153.5L214.9 138.2L230.5 162.1L207.1 208.1L238.3 207.7H284.8L267.2 153.5Z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M103.6 138.2L51.3 153.5L33.9 207.7H80.3L111.4 208.1L87.8 162.1L103.6 138.2Z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M174.6 164.6L177.9 106.9L193.1 65.8H125.6L140.6 106.9L144 164.6L145.3 182.8L145.4 227.6H173.1L173.3 182.8L174.6 164.6Z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// Map wallet IDs to their icon components
export const WalletIconMap: Record<string, React.FC<{ className?: string }>> = {
  tonconnect: TonConnectIcon,
  phantom: PhantomIcon,
  metamask: MetaMaskIcon,
  walletconnect: WalletConnectIcon,
  coinbase: CoinbaseIcon,
}

export function WalletIcon({ walletId, className = "w-6 h-6" }: { walletId: string; className?: string }) {
  const IconComponent = WalletIconMap[walletId]
  if (IconComponent) {
    return <IconComponent className={className} />
  }
  return (
    <div className={`${className} rounded-lg bg-bg-tertiary flex items-center justify-center`}>
      <span className="text-text-muted text-xs">?</span>
    </div>
  )
}
