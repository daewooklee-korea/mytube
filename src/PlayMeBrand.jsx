function PlayMeBrand({ variant = 'full', className = '' }) {
  const symbolClassName = [
    'playme-brand-icon',
    variant === 'symbol' ? 'playme-brand-symbol' : '',
    className,
  ].filter(Boolean).join(' ')

  if (variant === 'symbol') {
    return (
      <img
        className={symbolClassName}
        src="/playme-logo.svg"
        alt="PlayMe"
      />
    )
  }

  return (
    <span
      className={['playme-brand', className].filter(Boolean).join(' ')}
      aria-label="PlayMe"
    >
      <img
        className="playme-brand-icon"
        src="/playme-logo.svg"
        alt=""
        aria-hidden="true"
      />
      <span className="playme-wordmark">
        <span className="playme-wordmark-play">Play</span>
        <span className="playme-wordmark-me">Me</span>
      </span>
    </span>
  )
}

export default PlayMeBrand
