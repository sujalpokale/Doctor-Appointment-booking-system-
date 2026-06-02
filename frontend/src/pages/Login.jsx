import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const Login = () => {

  const [state, setState] = useState('Sign Up')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')

  // 2FA pending login states
  const [isTwoFactorPending, setIsTwoFactorPending] = useState(false)
  const [pendingUserId, setPendingUserId] = useState('')
  const [twoFactorOtp, setTwoFactorOtp] = useState('')

  const navigate = useNavigate()
  const { backendUrl, token, setToken, userData } = useContext(AppContext)

  const onSubmitHandler = async (event) => {
    event.preventDefault();

    if (state === 'Sign Up') {

      const { data } = await axios.post(backendUrl + '/api/user/register', { name, email, password, referralCode })

      if (data.success) {
        localStorage.setItem('token', data.token)
        setToken(data.token)
      } else {
        toast.error(data.message)
      }

    } else {

      const { data } = await axios.post(backendUrl + '/api/user/login', { email, password })

      if (data.success) {
        if (data.twoFactorRequired) {
          setIsTwoFactorPending(true)
          setPendingUserId(data.userId)
          setTwoFactorOtp('')
          toast.info(data.message)
        } else {
          localStorage.setItem('token', data.token)
          setToken(data.token)
        }
      } else {
        toast.error(data.message)
      }

    }

  }

  const handleTwoFactorVerify = async (e) => {
    e.preventDefault();
    if (twoFactorOtp.length !== 6) {
      toast.warning("Please enter a valid 6-digit verification code");
      return;
    }
    try {
      const { data } = await axios.post(backendUrl + '/api/user/verify-2fa-login', { userId: pendingUserId, otp: twoFactorOtp });
      if (data.success) {
        localStorage.setItem('token', data.token)
        setToken(data.token)
        toast.success("Security verification successful. Welcome back!");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  }

  const handleGoogleCredentialResponse = async (response) => {
    try {
      const idToken = response.credential;
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const payload = JSON.parse(jsonPayload);
      const { sub: googleId, email, name, picture: image } = payload;

      const { data } = await axios.post(backendUrl + '/api/user/google-login', {
        googleId,
        email,
        name,
        image
      });

      if (data.success) {
        localStorage.setItem('token', data.token)
        setToken(data.token)
        toast.success(data.message || 'Logged in with Google successfully!')
      } else {
        toast.error(data.message)
      }
    } catch (err) {
      console.error(err);
      toast.error('Google Sign-in failed');
    }
  };

  useEffect(() => {
    // Load Google Identity Services library
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1036830588523-democlient.apps.googleusercontent.com';
        window.google.accounts.id.initialize({
          client_id: client_id,
          callback: handleGoogleCredentialResponse
        });
        window.google.accounts.id.renderButton(
          document.getElementById('googleSignInDiv'),
          { theme: 'outline', size: 'large', text: 'signin_with', width: '100%', shape: 'rectangular' }
        );
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (token && userData) {
      navigate('/')
    }
  }, [token, userData])

  if (isTwoFactorPending) {
    return (
      <form onSubmit={handleTwoFactorVerify} className='min-h-[80vh] flex items-center'>
        <div className='flex flex-col gap-4 m-auto items-center p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-[#5E5E5E] text-sm shadow-lg bg-white'>
          <div className='text-4xl'>🔒</div>
          <p className='text-2xl font-semibold text-gray-800 text-center'>Security Verification</p>
          <p className='text-center text-xs text-gray-500 max-w-xs'>
            Two-Factor Authentication is enabled for this account. A 6-digit verification code has been dispatched to your registered email address.
          </p>
          
          <div className='w-full flex flex-col gap-1.5 mt-2'>
            <p className='font-medium text-gray-700 text-center'>Enter 6-Digit Code</p>
            <input 
              onChange={(e) => setTwoFactorOtp(e.target.value.replace(/\D/g, ''))} 
              value={twoFactorOtp} 
              maxLength='6'
              placeholder='123456'
              className='border border-[#DADADA] rounded w-1/2 mx-auto p-2 mt-1 text-center text-lg font-bold tracking-widest outline-none focus:ring-1 focus:ring-primary' 
              type="text" 
              required 
            />
          </div>

          <button className='bg-primary text-white w-full py-2.5 mt-3 rounded-md text-base font-semibold hover:bg-primary/95 transition-all shadow-sm'>
            Verify Credentials
          </button>
          
          <button 
            type="button"
            onClick={() => setIsTwoFactorPending(false)} 
            className='text-xs text-gray-500 hover:text-gray-700 underline mt-2'
          >
            Cancel and Return
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={onSubmitHandler} className='min-h-[80vh] flex items-center'>
      <div className='flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-[#5E5E5E] text-sm shadow-lg'>
        <p className='text-2xl font-semibold'>{state === 'Sign Up' ? 'Create Account' : 'Login'}</p>
        <p>Please {state === 'Sign Up' ? 'sign up' : 'log in'} to book appointment</p>
        {state === 'Sign Up'
          ? <div className='w-full '>
            <p>Full Name</p>
            <input onChange={(e) => setName(e.target.value)} value={name} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="text" required />
          </div>
          : null
        }
        <div className='w-full '>
          <p>Email</p>
          <input onChange={(e) => setEmail(e.target.value)} value={email} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="email" required />
        </div>
        <div className='w-full '>
          <p>Password</p>
          <input onChange={(e) => setPassword(e.target.value)} value={password} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="password" required />
        </div>
        {state === 'Sign Up' && (
          <div className='w-full '>
            <p className="flex items-center gap-1 font-medium text-purple-650">Have a Referral Code? (Optional)</p>
            <input 
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())} 
              value={referralCode} 
              placeholder="e.g. MED-A3BD92"
              className='border border-purple-200 focus:border-purple-500 rounded w-full p-2 mt-1 uppercase text-xs outline-none' 
              type="text" 
            />
          </div>
        )}
        <button className='bg-primary text-white w-full py-2 my-2 rounded-md text-base'>{state === 'Sign Up' ? 'Create account' : 'Login'}</button>
        
        <div className='flex items-center w-full gap-2 text-gray-400 my-1'>
          <hr className='flex-1 border-gray-200' />
          <span>or</span>
          <hr className='flex-1 border-gray-200' />
        </div>

        <div id="googleSignInDiv" className='w-full flex justify-center min-h-[40px]'></div>

        {state === 'Sign Up'
          ? <p>Already have an account? <span onClick={() => setState('Login')} className='text-primary underline cursor-pointer'>Login here</span></p>
          : <p>Create an new account? <span onClick={() => setState('Sign Up')} className='text-primary underline cursor-pointer'>Click here</span></p>
        }
      </div>
    </form>
  )
}

export default Login