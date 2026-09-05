function PlayMeBrand() {
  return (
    <>
      <img
        className="playme-brand-icon"
        src="/playme-logo.svg"
        alt=""
        aria-hidden="true"
      />
      <span className="playme-wordmark" aria-label="PlayMe">
        <span className="playme-wordmark-play">Play</span>
        <span className="playme-wordmark-me">Me</span>
      </span>
    </>
  )
}

export default PlayMeBrand
