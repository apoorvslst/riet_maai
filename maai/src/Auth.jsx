import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, Lock, User, ArrowLeft, Heart, X } from 'lucide-react';

const Auth = ({ onClose, onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
        const payload = isLogin
            ? {
                identifier: authMethod === 'email' ? formData.email : formData.phoneNumber,
                password: formData.password
            }
            : {
                name: formData.name,
                email: formData.email || undefined,
                phoneNumber: formData.phoneNumber || undefined,
                password: formData.password
            };

        try {
            const response = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            onAuthSuccess(data.user);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(74, 14, 46, 0.4)',
                backdropFilter: 'blur(8px)',
                zIndex: 2000,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '1rem'
            }}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                style={{
                    background: 'white',
                    width: '100%',
                    maxWidth: '450px',
                    borderRadius: '30px',
                    padding: '2.5rem',
                    boxShadow: 'var(--shadow-lg)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1.5rem',
                        right: '1.5rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-light)',
                        zIndex: 10
                    }}
                >
                    <X size={24} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Heart color="var(--primary)" size={32} fill="var(--primary)" />
                        <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)', fontFamily: 'Outfit' }}>Maa-Sathi</span>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', color: 'var(--text-dark)' }}>
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                        {isLogin ? 'Sign in to access your health dashboard' : 'Join us to track your maternal health journey'}
                    </p>
                </div>

                <div style={{
                    display: 'flex',
                    background: '#f8f1f4',
                    borderRadius: '15px',
                    padding: '0.3rem',
                    marginBottom: '2rem',
                    position: 'relative'
                }}>
                    <button
                        onClick={() => setAuthMethod('email')}
                        style={{
                            flex: 1,
                            padding: '0.8rem',
                            border: 'none',
                            borderRadius: '12px',
                            background: authMethod === 'email' ? 'white' : 'transparent',
                            color: authMethod === 'email' ? 'var(--primary)' : 'var(--text-light)',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: authMethod === 'email' ? '0 2px 10px rgba(176, 24, 84, 0.1)' : 'none'
                        }}
                    >
                        Email
                    </button>
                    <button
                        onClick={() => setAuthMethod('phone')}
                        style={{
                            flex: 1,
                            padding: '0.8rem',
                            border: 'none',
                            borderRadius: '12px',
                            background: authMethod === 'phone' ? 'white' : 'transparent',
                            color: authMethod === 'phone' ? 'var(--primary)' : 'var(--text-light)',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: authMethod === 'phone' ? '0 2px 10px rgba(176, 24, 84, 0.1)' : 'none'
                        }}
                    >
                        Phone
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {!isLogin && (
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                            <input
                                type="text"
                                name="name"
                                placeholder="Full Name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '1rem 1rem 1rem 3rem',
                                    borderRadius: '15px',
                                    border: '1.5px solid #eee',
                                    outline: 'none',
                                    fontSize: '1rem',
                                    fontFamily: 'Inter'
                                }}
                            />
                        </div>
                    )}

                    {authMethod === 'email' ? (
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                            <input
                                type="email"
                                name="email"
                                placeholder="Email Address"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '1rem 1rem 1rem 3rem',
                                    borderRadius: '15px',
                                    border: '1.5px solid #eee',
                                    outline: 'none',
                                    fontSize: '1rem',
                                    fontFamily: 'Inter'
                                }}
                            />
                        </div>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                            <input
                                type="tel"
                                name="phoneNumber"
                                placeholder="Phone Number"
                                required
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '1rem 1rem 1rem 3rem',
                                    borderRadius: '15px',
                                    border: '1.5px solid #eee',
                                    outline: 'none',
                                    fontSize: '1rem',
                                    fontFamily: 'Inter'
                                }}
                            />
                        </div>
                    )}

                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            style={{
                                width: '100%',
                                padding: '1rem 1rem 1rem 3rem',
                                borderRadius: '15px',
                                border: '1.5px solid #eee',
                                outline: 'none',
                                fontSize: '1rem',
                                fontFamily: 'Inter'
                            }}
                        />
                    </div>

                    {error && (
                        <p style={{ color: '#e74c3c', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                        style={{
                            padding: '1rem',
                            fontSize: '1.1rem',
                            marginTop: '0.5rem',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary)',
                                fontWeight: '700',
                                marginLeft: '0.5rem',
                                cursor: 'pointer',
                                fontFamily: 'Inter'
                            }}
                        >
                            {isLogin ? 'Sign Up' : 'Log In'}
                        </button>
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Auth;
