import { useState } from 'react'
import { supabase } from './supabase'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    const id = username.trim()

  if (
  !id ||
  !password ||
  (isSignup && !nickname.trim())
) {
  alert(
    isSignup
      ? 'ID, 닉네임, 비밀번호를 입력해주세요.'
      : 'ID와 비밀번호를 입력해주세요.'
  )
  return
}

    setLoading(true)

    try {
      if (isSignup) {
        // ID / 닉네임 중복 확인
const {
  data: checkData,
  error: checkError,
} = await supabase.functions.invoke(
  'check-signup',
  {
    body: {
      username: id,
      nickname: nickname.trim(),
    },
  }
)

if (checkError) {
  console.error(
    '회원가입 중복 확인 오류:',
    checkError
  )

  alert(
    '회원가입 정보를 확인하는 중 오류가 발생했습니다.'
  )

  return
}

if (!checkData?.success) {
  alert(
    checkData?.error ||
      '사용할 수 없는 ID 또는 닉네임입니다.'
  )

  return
}

// 중복 확인 통과 → Supabase Auth 회원가입
const internalEmail =
  `${id}@playme.invalid`

const {
  data,
  error,
} = await supabase.auth.signUp({
  email: internalEmail,
  password,
  options: {
    data: {
      username: id,
      nickname: nickname.trim(),
    },
  },
})

console.log(
  '회원가입 결과:',
  data
)

console.log(
  '회원가입 오류:',
  error
)

        console.log('회원가입 결과:', data)
        console.log('회원가입 오류:', error)

        if (error) {
          alert(`회원가입 실패: ${error.message}`)
          return
        }

        if (!data.user) {
          alert('회원가입에 실패했습니다.')
          return
        }

        // profiles 생성
       

        alert(
          '회원가입이 완료되었습니다.\n관리자 승인 후 로그인할 수 있습니다.'
        )

        setUsername('')
setNickname('')
setPassword('')
setIsSignup(false)

        return
      }

      // ID → 내부 Auth 이메일 확인
      const {
        data: loginData,
        error: loginLookupError,
      } = await supabase.functions.invoke('login', {
        body: {
          username: id,
        },
      })

      if (loginLookupError) {
        console.error(
          '로그인 사용자 확인 오류:',
          loginLookupError
        )

        alert(
          '로그인 정보를 확인할 수 없습니다.'
        )

        return
      }

      if (!loginData?.success) {
        alert(
          loginData?.error ||
            '로그인 정보를 확인할 수 없습니다.'
        )

        return
      }

      // 내부 Auth 이메일은 사용자에게 표시하지 않음
      const {
        data,
        error,
      } = await supabase.auth.signInWithPassword({
        email: loginData.authEmail,
        password,
      })

      if (error) {
        alert(`로그인 실패: ${error.message}`)
        return
      }

      if (!data.user) {
        alert('로그인에 실패했습니다.')
        return
      }

      // Profile 상태 확인
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(
          'status, role, nickname, username'
        )
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        alert(
          '사용자 정보를 확인할 수 없습니다.'
        )

        await supabase.auth.signOut()
        return
      }

      if (profile.status === 'pending') {
        alert(
          '관리자 승인 대기 중입니다.'
        )

        await supabase.auth.signOut()
        return
      }

      if (profile.status === 'rejected') {
        alert(
          '가입이 승인되지 않았습니다.'
        )

        await supabase.auth.signOut()
        return
      }

      onLogin(data.user)
    } catch (error) {
      console.error('로그인 처리 오류:', error)

      alert(
        '로그인 처리 중 오류가 발생했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">

        <h1 className="login-logo">
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="1"
              y="1"
              width="30"
              height="30"
              rx="9"
              fill="#1a1a1a"
            />
            <path
              d="M13 10.5L22 16L13 21.5V10.5Z"
              fill="#ffffff"
            />
          </svg>

          PlayMe
        </h1>

        <h2>
          {isSignup
            ? '회원가입'
            : '로그인'}
        </h2>

        <form onSubmit={handleSubmit}>

          <input
            type="text"
            placeholder="ID"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            autoComplete="username"
          />
{isSignup && (
  <input
    type="text"
    placeholder="닉네임"
    value={nickname}
    onChange={(e) =>
      setNickname(e.target.value)
    }
    autoComplete="nickname"
  />
)}
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            autoComplete={
              isSignup
                ? 'new-password'
                : 'current-password'
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
          type="button"
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
