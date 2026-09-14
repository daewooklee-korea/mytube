import { getEducationCourse } from './educationCourses'
import './LogicVocalMixingGuide.css'

export default function StudyHub({ menus, onOpen }) {
  const courses = menus.filter((menu) => getEducationCourse(menu.route))
  return (
    <section className="education education-hub" aria-labelledby="study-hub-title">
      <span className="edu-eyebrow">PLAYME · STUDY</span>
      <h1 id="study-hub-title">배우고, 직접 만들어보세요.</h1>
      <p>작은 실습부터 시작하는 PlayMe 교육 허브</p>
      <div className="edu-grid">
        {courses.map((menu) => {
          const course = getEducationCourse(menu.route)
          return (
            <button type="button" className="edu-course-card" key={menu.id} onClick={() => onOpen(menu)}>
              <span className="edu-eyebrow">{course.icon} {course.category}</span>
              <h2>{course.title}</h2>
              <p>{course.description}</p>
              <strong>{course.lessonCount}개 레슨 · 학습 시작 →</strong>
            </button>
          )
        })}
      </div>
      {!courses.length && <p>새로운 교육 콘텐츠를 준비하고 있습니다.</p>}
    </section>
  )
}
