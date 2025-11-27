import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(atob(localStorage.getItem('token').split('.')[1]));
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get(`/api/${user.tenantId}/notifications`);
            setNotifications(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const markRead = async (id) => {
        try {
            await api.patch(`/api/${user.tenantId}/notifications/${id}/read`);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        navigate('/login');
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
        { path: '/employees', label: 'Employees', icon: '👥', roles: ['ADMIN', 'HR', 'MANAGER'] },
        { path: '/attendance', label: 'Attendance', icon: '🕒', roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
        { path: '/leave', label: 'Leave', icon: '📅', roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
        { path: '/payroll', label: 'Payroll', icon: '💰', roles: ['ADMIN', 'HR'] },
        { path: '/admin', label: 'Admin', icon: '⚙️', roles: ['ADMIN'] }
    ].filter(item => item.roles.includes(user.role));

    return (
        <div className="layout">
            {/* Mobile Header */}
            <div className="mobile-header">
                <button onClick={toggleSidebar} className="menu-btn">☰</button>
                <span className="brand-logo" style={{ fontSize: '1.2rem' }}>Attendify</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setShowNotifications(!showNotifications)} className="theme-toggle" style={{ position: 'relative' }}>
                        🔔
                        {notifications.length > 0 && <span style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>{notifications.length}</span>}
                    </button>
                    <button onClick={toggleTheme} className="theme-toggle">
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                </div>
            </div>

            {/* Notifications Dropdown (Simplified) */}
            {showNotifications && (
                <div style={{ position: 'fixed', top: '60px', right: '20px', width: '300px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px', zIndex: 100, boxShadow: 'var(--shadow-lg)' }}>
                    <h4 style={{ marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>Notifications</h4>
                    {notifications.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No new notifications</p> : (
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {notifications.map(n => (
                                <div key={n.id} style={{ padding: '8px', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                                    <p style={{ margin: 0 }}>{n.message}</p>
                                    <button onClick={() => markRead(n.id)} style={{ fontSize: '0.8rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '5px' }}>Mark as read</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Overlay for mobile */}
            {isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <span className="brand-logo">Attendify</span>
                    <button className="close-btn" onClick={closeSidebar}>×</button>
                </div>

                <div style={{ marginBottom: '20px', padding: '0 10px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Menu</div>
                    <nav>
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                                onClick={closeSidebar}
                            >
                                <span style={{ marginRight: '12px' }}>{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div style={{ marginTop: 'auto', padding: '0 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Theme</div>
                        <button onClick={toggleTheme} className="theme-toggle">
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                    </div>

                    <div style={{ padding: '15px', background: 'var(--bg-hover)', borderRadius: '12px', marginBottom: '15px' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>{user.email.split('@')[0]}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: '8px' }}>{user.role.toLowerCase()}</div>
                        <Link to="/change-password" onClick={closeSidebar} style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>Change Password</Link>
                    </div>
                    <button onClick={logout} className="logout-btn">
                        Sign Out
                    </button>
                </div>
            </aside>

            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

export default Layout;
