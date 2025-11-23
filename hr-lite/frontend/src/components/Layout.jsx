import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(atob(localStorage.getItem('token').split('.')[1]));
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

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
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/employees', label: 'Employees', icon: '👥' },
        { path: '/attendance', label: 'Attendance', icon: '🕒' },
        { path: '/leave', label: 'Leave', icon: '📅' },
        { path: '/payroll', label: 'Payroll', icon: '💰' },
        ...(user.role === 'ADMIN' ? [{ path: '/admin', label: 'Admin', icon: '⚙️' }] : [])
    ];

    return (
        <div className="layout">
            {/* Mobile Header */}
            <div className="mobile-header">
                <button onClick={toggleSidebar} className="menu-btn">
                    ☰
                </button>
                <span className="brand-logo" style={{ fontSize: '1.2rem' }}>HR Lite</span>
                <button onClick={toggleTheme} className="theme-toggle" style={{ width: '32px', height: '32px', fontSize: '1rem' }}>
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
            </div>

            {/* Overlay for mobile */}
            {isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <span className="brand-logo">HR Lite</span>
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
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.role.toLowerCase()}</div>
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
