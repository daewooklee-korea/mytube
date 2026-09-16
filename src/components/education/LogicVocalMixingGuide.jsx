import { useState } from 'react'
import { educationCourses } from './educationCourses'
import './LogicVocalMixingGuide.css'

const steps = [
  ['녹음', '이펙터보다 좋은 원본이 먼저입니다. 조용한 환경에서 클리핑 없이 녹음하세요.'],
  ['좋은 테이크 선택', '여러 테이크에서 발음과 감정이 자연스러운 구간을 선택하고 연결 부분을 정리합니다.'],
  ['Pitch Correction', '곡의 키와 스케일을 확인하고 음정을 보정합니다. 자연스러움이 목표라면 보정 속도를 너무 빠르게 하지 마세요.'],
  ['EQ', '불필요한 저역과 답답한 공진을 줄입니다. 보컬의 몸통까지 사라지지 않도록 곡 안에서 비교하세요.'],
  ['Compressor', '큰 소리와 작은 소리의 차이를 다듬어 보컬이 안정적으로 들리게 합니다.'],
  ['DeEsser', '“ㅅ”, “ㅆ” 같은 날카로운 치찰음을 필요한 만큼만 줄입니다.'],
  ['Reverb / Delay', '보컬을 공간에 배치합니다. Send로 잔향을 별도 Bus에 보내면 원본의 선명함을 유지하기 쉽습니다.'],
]
const bands = [
  { range: '20–120Hz', name: 'Sub / Low', width: '거의 Mono', reverb: '최소', detail: '저역은 중앙에 단단하게 둡니다. 보컬에서는 불필요한 저역을 정리하는 경우가 많습니다.', tip: '하이패스를 올리면서 들어보고, 목소리의 두께가 줄어들기 전으로 되돌리세요.', size: 12 },
  { range: '120–500Hz', name: 'Low Mid', width: '좁게', reverb: '짧은 공간감', detail: '보컬의 몸통과 따뜻함이 있는 영역입니다. 잔향이 쌓이면 답답하게 들릴 수 있습니다.', tip: '이 영역을 무조건 깎지 말고 반주와 겹치는 부분만 조금씩 정리하세요.', size: 30 },
  { range: '500Hz–2kHz', name: 'Mid', width: '중앙 중심', reverb: '적당하게', detail: '가사 전달과 보컬의 중심을 담당합니다. 원본은 중앙에서 또렷하게 유지합니다.', tip: '솔로보다 전체 반주 안에서 가사가 잘 들리는지 확인하세요.', size: 45 },
  { range: '2–6kHz', name: 'High Mid', width: '조금 더 넓게', reverb: 'Delay / 짧은 Reverb', detail: '선명도와 존재감을 만드는 영역입니다. 공간계 신호를 좌우에 배치해 여유를 만듭니다.', tip: '소리가 따갑다면 넓히기 전에 EQ와 DeEsser로 거친 부분을 확인하세요.', size: 68 },
  { range: '6–16kHz', name: 'Air', width: '가장 넓게 사용 가능', reverb: 'Reverb / Stereo Delay', detail: '공기감과 반짝임을 더하는 영역입니다. 잔향과 딜레이를 넓게 펼쳐보세요.', tip: '고역도 과하면 피곤해집니다. Mono로 합쳤을 때 소리가 약해지는지도 확인하세요.', size: 92 },
]
const lessons = ['보컬 믹싱 전체 흐름', 'Side Chain', '주파수별 공간감']
const sampleTracks = [
  {
    title: '01 · 원본 녹음',
    file: '/audio/logic-vocal-mixing/logic-vocal-dry.wav',
    description: '이펙터를 걸기 전 목소리입니다. 이후 샘플과 톤, 공간감, 음량 변화를 비교해보세요.',
  },
  {
    title: '02 · Channel EQ',
    file: '/audio/logic-vocal-mixing/02-logic-channel-eq.wav',
    description: 'Logic Pro Channel EQ의 Clear Vocals 프리셋으로 저역을 정리하고 선명도를 살린 예시입니다.',
  },
  {
    title: '03 · Compressor',
    file: '/audio/logic-vocal-mixing/03-logic-compressor.wav',
    description: 'Logic Pro Compressor의 Natural Vocal 프리셋으로 큰 소리와 작은 소리의 차이를 다듬은 예시입니다.',
  },
  {
    title: '04 · ChromaVerb',
    file: '/audio/logic-vocal-mixing/04-logic-chromaverb.wav',
    description: 'Logic Pro ChromaVerb Room 타입으로 보컬 뒤에 짧은 공간감을 더한 예시입니다.',
  },
  {
    title: '05 · Stereo Delay',
    file: '/audio/logic-vocal-mixing/05-logic-stereo-delay.wav',
    description: 'Logic Pro Stereo Delay 기본 설정으로 좌우 반복감을 만든 예시입니다.',
  },
]

const proTechniqueDemos = [
  {
    title: '01 · 보컬 Volume Automation',
    focus: '작은 단어는 올리고, 튀는 단어는 내려서 문장 전체가 고르게 들리게 만드는 기법입니다.',
    script: '“처음엔 작게 말하고, 여기서는 크게 말하고, 마지막은 다시 자연스럽게 말합니다.”',
    before: {
      label: 'Before · 볼륨 차이가 큰 원본',
      file: '/audio/logic-vocal-mixing/13-volume-automation-before.wav',
      note: '볼륨 오토메이션 실습을 위해 새로 녹음한 원본입니다. 작고 큰 구간의 레벨 차이를 먼저 들어보세요.',
    },
    after: {
      label: 'After · Volume Automation 적용',
      file: '',
      note: 'Logic에서 작은 구간은 올리고 큰 구간은 살짝 내려 바운스한 파일을 여기에 연결합니다.',
    },
    steps: ['Automation 보기 켜기', '트랙 파라미터를 Volume으로 선택', '작은 단어는 +2~4dB', '튀는 단어는 -2~4dB', '전체 문장이 같은 앞뒤 거리로 들리는지 확인'],
    tip: '컴프레서가 모든 것을 해결하게 두지 말고, 먼저 손으로 큰 흐름을 정리하면 더 자연스럽습니다.',
  },
  {
    title: '02 · Reverb / Delay를 Bus로 보내기',
    focus: '원본 보컬은 중앙에 선명하게 두고, 잔향과 딜레이만 Aux Bus에서 따로 넓히는 방식입니다.',
    script: '“보컬의 몸통은 가운데, 공기감과 잔향은 좌우로 보냅니다.”',
    before: {
      label: 'Before · Insert 공간계',
      file: '',
      note: '보컬 트랙에 Reverb나 Delay를 직접 걸어 원본까지 흐려지는 예시를 넣을 자리입니다.',
    },
    after: {
      label: 'After · Bus Reverb / Delay',
      file: '',
      note: 'Send로 Bus에 보내고 Aux에서 Wet 100% 공간계를 만든 예시를 넣을 자리입니다.',
    },
    steps: ['Vocal 트랙 Send에서 Bus 1 선택', 'Aux 1에 ChromaVerb 삽입', 'Aux 1은 Wet 100%', 'Bus 2에는 Stereo Delay 삽입', 'Send 양으로 공간감을 조절'],
    tip: 'Bus 방식은 공간감을 따로 조절할 수 있어 보컬의 선명함을 유지하기 쉽습니다.',
  },
  {
    title: '03 · Delay / Reverb를 보컬 Side Chain으로 누르기',
    focus: '보컬이 말할 때는 잔향을 살짝 줄이고, 문장 끝에서는 잔향이 다시 올라오게 만드는 프로들이 자주 쓰는 정리 방식입니다.',
    script: '“문장 중에는 잔향이 물러나고, 말이 끝나면 공간이 뒤에서 살아납니다.”',
    before: {
      label: 'Before · 공간계가 계속 큰 상태',
      file: '',
      note: '보컬이 말하는 동안에도 Reverb / Delay가 계속 커서 가사가 흐려지는 예시를 넣을 자리입니다.',
    },
    after: {
      label: 'After · Side Chain Ducking 적용',
      file: '',
      note: 'Reverb / Delay Aux에 Compressor를 넣고 Side Chain을 보컬로 받아 1~3dB만 눌러준 예시를 넣을 자리입니다.',
    },
    steps: ['Reverb / Delay Aux 뒤에 Compressor 삽입', 'Compressor Side Chain 입력을 Vocal로 선택', 'Ratio 2:1 정도로 시작', 'Gain Reduction이 1~3dB만 움직이게 Threshold 조절', '문장 끝 잔향이 자연스럽게 올라오는지 확인'],
    tip: 'Side Chain Ducking은 티 나게 누르는 효과보다, 보컬이 말할 때 가사를 깨끗하게 비워주는 용도로 시작하세요.',
  },
]

const newRecordingTracks = [
  {
    title: '01 · 새 녹음 원본',
    file: '/audio/logic-vocal-mixing/09-new-recording-dry.wav',
    description: '방금 Logic Pro에서 다시 녹음한 원본입니다. 아래 샘플은 이 녹음 리전에 Logic 기본 이펙터를 직접 켜서 바운스했습니다.',
  },
  {
    title: '02 · EQ + Compressor',
    file: '/audio/logic-vocal-mixing/10-new-recording-eq-compressor.wav',
    description: 'Channel EQ와 Compressor를 켜서 저역을 정리하고 목소리의 앞뒤 움직임을 안정시킨 샘플입니다.',
  },
  {
    title: '03 · EQ + Compressor + ChromaVerb',
    file: '/audio/logic-vocal-mixing/11-new-recording-eq-compressor-chromaverb.wav',
    description: '정리된 보컬에 ChromaVerb를 더해 뒤쪽 공간감을 만든 샘플입니다. 문장 뒤 잔향을 들어보세요.',
  },
  {
    title: '04 · EQ + Compressor + Stereo Delay',
    file: '/audio/logic-vocal-mixing/12-new-recording-eq-compressor-stereo-delay.wav',
    description: '정리된 보컬에 Stereo Delay를 더해 좌우 반복감을 만든 샘플입니다. 원본 중앙과 딜레이의 폭을 비교해보세요.',
  },
]

function SignalChain({ items }) {
  return <ol className="edu-chain">{items.map((item, index) => <li key={item}><span>{item}</span>{index < items.length - 1 && <b aria-hidden="true">→</b>}</li>)}</ol>
}

export default function LogicVocalMixingGuide() {
  const [lesson, setLesson] = useState(0)
  const [step, setStep] = useState(0)
  const [bandIndex, setBandIndex] = useState(0)
  const band = bands[bandIndex]
  const course = educationCourses.find((item) => item.route === '/study/logic-vocal-mixing')

  const handleSamplePlay = (event) => {
    document.querySelectorAll('.edu-sample audio').forEach((audio) => {
      if (audio !== event.currentTarget) audio.pause()
    })
  }

  const handleLessonKey = (event) => {
    let next
    if (event.key === 'ArrowRight') next = (lesson + 1) % lessons.length
    else if (event.key === 'ArrowLeft') next = (lesson + lessons.length - 1) % lessons.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = lessons.length - 1
    else return
    event.preventDefault()
    setLesson(next)
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus()
  }

  return (
    <article className="education edu-guide">
      <header className="edu-hero">
        <span className="edu-eyebrow">🎙️ LOGIC PRO · BEGINNER GUIDE</span>
        <h1>{course.title}</h1>
        <p>{course.description}</p>
        <span className="edu-tag">3 LESSONS</span><span className="edu-tag">기본 이펙터로 시작하기</span>
      </header>
      <section className="edu-section edu-samples" aria-labelledby="edu-samples">
        <span className="edu-eyebrow">LISTEN FIRST</span>
        <h2 id="edu-samples">직접 녹음한 보컬 샘플</h2>
        <p>같은 녹음에 Logic Pro 기본 이펙터를 하나씩 적용한 비교 샘플입니다. 작은 볼륨에서 시작해 차이를 들어보세요.</p>
        <div className="edu-sample-list">
          {sampleTracks.map((sample) => (
            <div className="edu-detail edu-sample" key={sample.file}>
              <h3>{sample.title}</h3>
              <p>{sample.description}</p>
              <audio controls preload="metadata" src={sample.file} onPlay={handleSamplePlay}>
                오디오를 재생할 수 없는 브라우저입니다.
              </audio>
            </div>
          ))}
        </div>
        <aside className="edu-tip"><strong>비교 방법</strong> 원본을 먼저 듣고, 같은 문장이 이펙터마다 어떻게 바뀌는지 들어보세요. EQ는 정리감, Compressor는 안정감, Reverb와 Delay는 공간감에 집중하면 좋습니다.</aside>
      </section>
      <section className="edu-section edu-samples" aria-labelledby="edu-new-recording-samples">
        <span className="edu-eyebrow">NEW RECORDING</span>
        <h2 id="edu-new-recording-samples">새 녹음으로 다시 만든 Logic 샘플</h2>
        <p>방금 Logic Pro에서 녹음한 목소리로 만든 비교 샘플입니다. 모두 같은 리전을 Logic 기본 이펙터로 직접 처리해 바운스했습니다.</p>
        <div className="edu-sample-list">
          {newRecordingTracks.map((sample) => (
            <div className="edu-detail edu-sample" key={sample.file}>
              <h3>{sample.title}</h3>
              <p>{sample.description}</p>
              <audio controls preload="metadata" src={sample.file} onPlay={handleSamplePlay}>
                오디오를 재생할 수 없는 브라우저입니다.
              </audio>
            </div>
          ))}
        </div>
        <aside className="edu-tip"><strong>듣는 포인트</strong> 먼저 원본과 EQ + Compressor를 비교하고, 그 다음 ChromaVerb와 Stereo Delay가 보컬 주변의 공간을 어떻게 다르게 만드는지 들어보세요.</aside>
      </section>
      <section className="edu-section edu-samples edu-pro-demos" aria-labelledby="edu-pro-technique-samples">
        <span className="edu-eyebrow">PRO TECHNIQUE LAB</span>
        <h2 id="edu-pro-technique-samples">프로들이 자주 쓰는 3가지 믹싱 기법</h2>
        <p>각 기법이 잘 들리도록 따로 녹음해서 전/후를 비교하는 실습 섹션입니다. Logic에서 만든 WAV를 넣으면 해당 카드에서 바로 재생됩니다.</p>
        <div className="edu-pro-list">
          {proTechniqueDemos.map((demo) => (
            <div className="edu-detail edu-pro-card" key={demo.title}>
              <span className="edu-eyebrow">BEFORE / AFTER</span>
              <h3>{demo.title}</h3>
              <p>{demo.focus}</p>
              <div className="edu-recording-script">
                <strong>녹음 대본</strong>
                <span>{demo.script}</span>
              </div>
              <div className="edu-compare-grid">
                {[demo.before, demo.after].map((track) => (
                  <div className="edu-compare-card" key={track.label}>
                    <strong>{track.label}</strong>
                    <p>{track.note}</p>
                    {track.file ? (
                      <audio controls preload="metadata" src={track.file} onPlay={handleSamplePlay}>
                        오디오를 재생할 수 없는 브라우저입니다.
                      </audio>
                    ) : (
                      <span className="edu-pending-audio">Logic 바운스 파일 대기 중</span>
                    )}
                  </div>
                ))}
              </div>
              <ol className="edu-practice-steps">
                {demo.steps.map((item) => <li key={item}>{item}</li>)}
              </ol>
              <aside className="edu-tip"><strong>실습 포인트</strong>{demo.tip}</aside>
            </div>
          ))}
        </div>
      </section>
      <div className="edu-tabs" role="tablist" aria-label="보컬 믹싱 레슨">
        {lessons.map((title, index) => (
          <button key={title} type="button" role="tab" id={`edu-tab-${index}`} aria-controls={`edu-panel-${index}`} aria-selected={lesson === index} tabIndex={lesson === index ? 0 : -1} onClick={() => setLesson(index)} onKeyDown={handleLessonKey}>
            <span>LESSON 0{index + 1}</span><strong>{title}</strong>
          </button>
        ))}
      </div>
      {lessons.map((title, index) => (
        <section key={title} id={`edu-panel-${index}`} role="tabpanel" aria-labelledby={`edu-tab-${index}`} hidden={lesson !== index} tabIndex={0} className="edu-panel">
          <span className="edu-eyebrow">LESSON 0{index + 1}</span>
          <h2>{title}</h2>
          {index === 0 && <>
            <p>먼저 원본을 정리하고, 다이내믹을 다듬은 뒤 공간감을 더합니다. 각 단계를 눌러보세요.</p>
            <ol className="edu-chain edu-click-chain">{steps.map(([label], i) => <li key={label}><button type="button" aria-pressed={step === i} onClick={() => setStep(i)}>{label}</button>{i < steps.length - 1 && <b aria-hidden="true">→</b>}</li>)}</ol>
            <div className="edu-detail" aria-live="polite"><h3>{steps[step][0]}</h3><p>{steps[step][1]}</p></div>
            <aside className="edu-tip"><strong>TIP</strong> 이 순서는 출발점입니다. 녹음 상태에 따라 EQ나 DeEsser의 위치를 바꿔도 됩니다.</aside>
          </>}
          {index === 1 && <>
            <div className="edu-grid">
              <div className="edu-detail"><span className="edu-eyebrow">일반 COMPRESSOR</span><h3>“내 소리가 커지면<br />내가 줄어든다.”</h3><p>자기 입력 신호를 감지해 압축량을 결정합니다.</p></div>
              <div className="edu-detail"><span className="edu-eyebrow">SIDE CHAIN COMPRESSOR</span><h3>“다른 소리가 커지면<br />내가 줄어든다.”</h3><p>외부 신호를 감지해 압축량을 결정합니다.</p></div>
            </div>
            <h3>01 · Kick이 나올 자리를 만들기</h3>
            <SignalChain items={['Kick', 'Side Chain 감지', 'Bass Compressor', 'Kick이 칠 때 Bass 볼륨 감소']} />
            <h3>02 · 보컬이 반주 위로 들리게 하기</h3>
            <SignalChain items={['Vocal', 'Side Chain 감지', 'Music Bus Compressor', '보컬이 나올 때 반주 약 1–3dB 감소']} />
            <p>줄어들 대상 트랙에 Compressor를 넣고, 플러그인의 Side Chain 입력에서 Kick 또는 Vocal을 선택합니다. Threshold와 Ratio를 조절하며 Gain Reduction을 확인하세요. 반주용 Music Bus에는 보컬을 제외합니다.</p>
            <aside className="edu-tip"><strong>핵심 개념</strong> Side Chain은 볼륨 감소 효과 자체가 아니라 <b>다른 신호를 이펙터의 감지 신호로 사용하는 방식</b>입니다. 위 예시는 그 신호로 압축을 제어하는 덕킹입니다. 1–3dB는 시작 예시이며 곡에 맞춰 조절합니다.</aside>
          </>}
          {index === 2 && <>
            <p>저역은 중앙에 단단하게 두고, 고역으로 갈수록 스테레오 공간을 넓혀보세요.</p>
            <div className="edu-frequency" role="group" aria-label="주파수 영역 선택">{bands.map((item, i) => <button type="button" key={item.name} aria-pressed={bandIndex === i} onClick={() => setBandIndex(i)}><strong>{item.range}</strong><span>{item.name}</span></button>)}</div>
            <div className="edu-detail" aria-live="polite">
              <span className="edu-eyebrow">{band.range}</span><h3>{band.name}</h3><p>{band.detail}</p>
              <dl className="edu-settings"><div><dt>Stereo Width</dt><dd>{band.width}</dd></div><div><dt>Reverb 성향</dt><dd>{band.reverb}</dd></div></dl>
              <div className="edu-width" aria-hidden="true"><span>L</span><div><i style={{ width: `${band.size}%` }} /></div><span>R</span></div>
              <small>폭의 개념을 보여주는 그림이며 플러그인 수치가 아닙니다.</small>
              <aside className="edu-tip"><strong>TIP</strong>{band.tip}</aside>
            </div>
            <p className="edu-note">모든 소스에 적용되는 규칙은 아닙니다. 리드 보컬 원본은 중앙에 두고 잔향과 더블링의 폭을 조절하는 출발점으로 사용하세요.</p>
          </>}
        </section>
      ))}
      <section className="edu-section" aria-labelledby="edu-effects">
        <span className="edu-eyebrow">YOUR TOOLKIT</span><h2 id="edu-effects">Logic Pro 기본 이펙터</h2>
        <div className="edu-grid edu-effects">
          <div className="edu-detail"><span className="edu-tool-number">01 / WIDTH</span><h3>Stereo Spread</h3><p>여러 주파수 영역을 좌우로 분산시켜 스테레오 폭을 만듭니다. 특히 중고역 공간감을 만들 때 활용합니다.</p><aside className="edu-tip">저역까지 과하게 넓히지 말고, Mono에서도 비교하세요.</aside></div>
          <div className="edu-detail"><span className="edu-tool-number">02 / CONTROL</span><h3>Direction Mixer</h3><p>Split을 켜고 Crossover를 정하면 저역과 고역의 폭을 따로 관리할 수 있습니다. Spread Low는 좁게, Spread High는 넓게 조절해보세요.</p><aside className="edu-tip">저역은 중앙, 고역은 넓게. 원래 Mono인 신호를 이것만으로 넓히지는 못합니다.</aside></div>
          <div className="edu-detail"><span className="edu-tool-number">03 / SPACE</span><h3>ChromaVerb</h3><p>보컬의 공간감을 만드는 Reverb입니다. 리버브의 저역을 줄이면 믹스가 뿌옇게 되는 것을 막고 중고역 중심의 잔향을 만들 수 있습니다.</p><aside className="edu-tip">별도 Bus에서 사용하고 Send 양으로 공간감을 조절하세요.</aside></div>
        </div>
        <p className="edu-note">이펙터 참고: <a href="https://support.apple.com/guide/logicpro/direction-mixer-overview-lgcef240d9d7/mac">Apple Direction Mixer</a> · <a href="https://help.apple.com/pdf/logicpromac-effects/en_US/logic-pro-mac-effects-user-guide.pdf">Logic Pro Effects 가이드</a></p>
      </section>
      <section className="edu-section" aria-labelledby="edu-first-setup">
        <span className="edu-eyebrow">TRY IT YOURSELF</span><h2 id="edu-first-setup">처음 해볼 보컬 세팅</h2>
        <div className="edu-detail edu-bus"><h3>보컬 원본 · 중앙</h3><SignalChain items={['Pitch', 'EQ', 'Compressor', 'DeEsser']} /><p>원본은 Stereo Out으로 보내고, Send로 Bus 1과 Bus 2에 각각 나눠 보냅니다.</p></div>
        <div className="edu-grid">
          <div className="edu-detail"><h3>Bus 1 · Reverb</h3><SignalChain items={['High Pass 200–300Hz', 'ChromaVerb', 'Stereo']} /><p>리버브로 들어갈 저역을 줄이고, 스테레오 Aux에서 잔향을 만듭니다.</p></div>
          <div className="edu-detail"><h3>Bus 2 · Delay</h3><SignalChain items={['Low Cut', 'Stereo Delay', 'Wide']} /><p>좌우 딜레이 시간 차이로 폭을 만들고 Feedback을 낮게 시작합니다.</p></div>
        </div>
        <aside className="edu-tip"><strong>실습 TIP</strong> Aux의 Reverb / Delay는 Wet 100%로 두고 Send를 조금씩 올려보세요. Stereo와 Wide는 출력·공간감 방향을 뜻하며 별도 플러그인 이름이 아닙니다. High Pass 200–300Hz는 잔향 Bus의 시작 예시입니다.</aside>
        <blockquote>보컬의 몸통은 가운데,<br /><em>공기감과 잔향은 좌우로.</em></blockquote>
      </section>
    </article>
  )
}
