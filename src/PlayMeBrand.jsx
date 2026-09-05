function PlayMeBrand() {
  return (
    <span className="playme-brand" aria-label="PlayMe">
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
