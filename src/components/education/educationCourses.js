// Add course metadata here and its component in EducationPage.jsx.
// Navigation and visibility remain controlled by the existing DB menus.
export const educationCourses = [
  {
    route: '/study/logic-vocal-mixing',
    title: 'Logic Pro 보컬 믹싱 기초',
    description: '녹음한 보컬을 어떻게 정리하고 공간감을 만드는지 배우는 입문 과정',
    icon: '🎙️',
    category: 'LOGIC PRO · 입문',
    lessonCount: 3,
  },
]

export const isStudyMenu = (menu) => menu?.level === 1 &&
  (menu.route === '/study' || menu.name?.toLowerCase() === 'study')

export function getEducationCourse(route) {
  return educationCourses.find((course) => course.route === route)
}
