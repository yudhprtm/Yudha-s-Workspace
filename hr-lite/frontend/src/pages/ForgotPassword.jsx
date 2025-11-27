import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../components/Toast';

const ForgotPassword = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedCode, setGeneratedCode] = useState(null);
    const navigate = useNavigate();
    const { addToast } = useToast();

    const handleRequestReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Use tenant 1 for public auth routes as they are not tenant-specific in the same way
            // or we can adjust the API to handle non-tenant routes better.
            // Based on routes: /api/auth/forgot-password
            const { data } = await api.post('/api/auth/forgot-password', { email });
            setGeneratedCode(data.resetCode);
            setStep(2);
            addToast('Reset code generated', 'success');
        } catch (err) {
            addToast(err.response?.data?.error || 'Failed to request reset', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/api/auth/reset-password', {
                email,
                code: resetCode,
                newPassword
            });
            addToast('Password reset successfully', 'success');
            navigate('/login');
        } catch (err) {
            addToast(err.response?.data?.error || 'Failed to reset password', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h1 style={{ fontSize: '2rem', color: '#1e293b', marginBottom: '10px' }}>Attendify</h1>
                    <p style={{ color: '#64748b' }}>Reset your password</p>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleRequestReset}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#475569' }}>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                placeholder="Enter your email"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
                        >
                            {loading ? 'Generating Code...' : 'Get Reset Code'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword}>
                        <div style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            <p style={{ color: '#166534', marginBottom: '5px', fontSize: '0.9rem' }}>Your Reset Code:</p>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '5px', color: '#15803d' }}>
                                {generatedCode}
                            </div>
                            <p style={{ color: '#166534', fontSize: '0.8rem', marginTop: '5px' }}>
                                (Expires in 15 minutes)
                            </p>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#475569' }}>Reset Code</label>
                            <input
                                type="text"
                                value={resetCode}
                                onChange={(e) => setResetCode(e.target.value)}
                                required
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                placeholder="Enter the 6-digit code"
                            />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#475569' }}>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                placeholder="Min. 6 characters"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <Link to="/login" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.9rem' }}>
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
