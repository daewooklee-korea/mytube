import { useState } from 'react'
import { supabase } from './supabase'

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      alert('이메일과 비밀번호를 입력해주세요.')
      return
    }

    setLoading(true)

    if (isSignup) {
      const { data, error } =
        await supabase.auth.signUp({
          email,
          password,
        })

    console.log('회원가입 결과:', data)
console.log('회원가입 오류:', error)

      if (error) {
        alert(`회원가입 실패: ${error.message}`)
        setLoading(false)
        return
      }

      if (data.user) {
        alert('회원가입이 완료되었습니다.')
      }

    } else {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        })

      if (error) {
        alert(`로그인 실패: ${error.message}`)
        setLoading(false)
        return
      }

      onLogin(data.user)
    }

    setLoading(false)
  }

  return (
    <div className="login-page">

      <div className="login-box">

        <h1>
          ▶ MyTube
        </h1>

        <h2>
          {isSignup ? '회원가입' : '로그인'}
        </h2>

        <form onSubmit={handleSubmit}>

          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? '처리 중...'
              : isSignup
                ? '회원가입'
                : '로그인'}
          </button>

        </form>

        <button
          className="switch-button"
          onClick={() =>
            setIsSignup(!isSignup)
          }
        >
          {isSignup
            ? '로그인으로 돌아가기'
            : '회원가입하기'}
        </button>

      </div>

    </div>
  )
}

export default Login