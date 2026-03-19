import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Auth({ onLogin }) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    loginUsername: '',
    loginPassword: '',
    signupUsername: '',
    signupName: '',
    signupPassword: ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.id]: e.target.value });

  const handleLogin = async () => {
    setError('');
    const username = formData.loginUsername.trim().replace(/^@/, '');
    const { data, error: err } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', formData.loginPassword)
      .maybeSingle();

    if (err || !data) {
      setError('Invalid username or password.');
    } else {
      onLogin(data);
    }
  };

  const handleSignupNext = async () => {
    setError('');
    const username = formData.signupUsername.trim().replace(/^@/, '');
    if (!username) return;

    if (step === 1) {
      const { data } = await supabase.from('users').select('username').eq('username', username).maybeSingle();
      if (data) {
        setError('Username already taken.');
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      if (formData.signupName.trim()) setStep(3);
    }
  };

  const handleCreateAccount = async () => {
    const user = {
      username: formData.signupUsername.trim().replace(/^@/, ''),
      name: formData.signupName.trim(),
      password: formData.signupPassword
    };
    const { error: err } = await supabase.from('users').insert([user]);
    if (err) {
      setError('Error creating account.');
    } else {
      onLogin(user);
    }
  };

  return (
    <div id="auth-screen" className="screen active">
      <div className="auth-bg">
        <div className="auth-blob b1"></div>
        <div className="auth-blob b2"></div>
      </div>
      <div className="auth-card">
        <div className="logo-wrap" style={{ marginBottom: '30px', fontSize: '24px', justifyContent: 'center' }}>
          <div className="logo-icon">P</div> Pulse Messenger
        </div>

        <div className="tab-bar">
          <button className={`tab ${isLoginTab ? 'active' : ''}`} onClick={() => { setIsLoginTab(true); setError(''); }}>Login</button>
          <button className={`tab ${!isLoginTab ? 'active' : ''}`} onClick={() => { setIsLoginTab(false); setError(''); setStep(1); }}>Sign Up</button>
        </div>

        {isLoginTab ? (
          <div className="form-panel active">
            <div className="field">
              <input type="text" id="loginUsername" placeholder="Username" value={formData.loginUsername} onChange={handleChange} />
            </div>
            <div className="field">
              <input type="password" id="loginPassword" placeholder="Password" value={formData.loginPassword} onChange={handleChange} />
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="btn-primary" onClick={handleLogin}>Log In</button>
          </div>
        ) : (
          <div className="form-panel active">
            {step === 1 && (
              <div className="step">
                <div className="field">
                  <input type="text" id="signupUsername" placeholder="Choose a username" value={formData.signupUsername} onChange={handleChange} />
                </div>
                {error && <div className="form-error">{error}</div>}
                <button className="btn-primary" onClick={handleSignupNext}>Next</button>
              </div>
            )}
            {step === 2 && (
              <div className="step">
                <div className="field">
                  <input type="text" id="signupName" placeholder="Full name" value={formData.signupName} onChange={handleChange} />
                </div>
                <button className="btn-primary" onClick={handleSignupNext}>Next</button>
              </div>
            )}
            {step === 3 && (
              <div className="step">
                <div className="field">
                  <input type="password" id="signupPassword" placeholder="Create password" value={formData.signupPassword} onChange={handleChange} />
                </div>
                {error && <div className="form-error">{error}</div>}
                <button className="btn-primary" onClick={handleCreateAccount}>Create Account</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
