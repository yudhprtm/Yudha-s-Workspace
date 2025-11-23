import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Leave from './pages/Leave';
import Payroll from './pages/Payroll';
import Admin from './pages/Admin';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import { ThemeProvider } from './context/ThemeContext';

const PrivateRoute = () => {
    const token = localStorage.getItem('token');
    return token ? <Layout><Outlet /></Layout> : <Navigate to="/login" />;
};

function App() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route element={<PrivateRoute />}>
                        <Route path="/" element={<Navigate to="/dashboard" />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/employees" element={<Employees />} />
                        <Route path="/attendance" element={<Attendance />} />
                        <Route path="/leave" element={<Leave />} />
                        <Route path="/payroll" element={<Payroll />} />
                        <Route path="/admin" element={<Admin />} />
                    </Route>
                </Routes>
            </ToastProvider>
        </ThemeProvider>
    );
}

export default App;
