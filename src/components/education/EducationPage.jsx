import LogicVocalMixingGuide from './LogicVocalMixingGuide'

const coursePages = {
  '/study/logic-vocal-mixing': LogicVocalMixingGuide,
}

export default function EducationPage({ route }) {
  const Course = coursePages[route]
  return Course ? <Course /> : null
}
