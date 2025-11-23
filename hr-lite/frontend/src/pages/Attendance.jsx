import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../components/Toast';

const Attendance = () => {
    const [logs, setLogs] = useState([]);
    const [corrections, setCorrections] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(atob(localStorage.getItem('token').split('.')[1]));
    const tenantId = user.tenantId;
    const { addToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        date: '',
        old_clock_in: '',
        old_clock_out: '',
        new_clock_in: '',
        new_clock_out: '',
        reason: ''
    });

    useEffect(() => {
        fetchAttendance();
        if (['ADMIN', 'HR', 'MANAGER'].includes(user.role)) {
            fetchCorrections();
        }
    }, []);

    const fetchAttendance = async () => {
        try {
            const { data } = await api.get(`/api/${tenantId}/attendance`);
            setLogs(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCorrections = async () => {
        try {
            const { data } = await api.get(`/api/${tenantId}/attendance/corrections`);
            setCorrections(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleClockIn = async () => {
        try {
            await api.post(`/api/${tenantId}/attendance/clock-in`);
            addToast('Clocked in successfully', 'success');
            fetchAttendance();
        } catch (err) {
            addToast(err.response?.data?.error || 'Clock in failed', 'error');
        }
    };

    const handleClockOut = async () => {
        try {
            await api.post(`/api/${tenantId}/attendance/clock-out`);
            addToast('Clocked out successfully', 'success');
            fetchAttendance();
        } catch (err) {
            addToast(err.response?.data?.error || 'Clock out failed', 'error');
        }
    };

    const handleCorrectionSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/api/${tenantId}/attendance/corrections`, formData);
            addToast('Correction requested', 'success');
            setShowModal(false);
        } catch (err) {
            addToast('Request failed', 'error');
        }
    };

    const handleCorrectionStatus = async (id, status) => {
        try {
            await api.patch(`/api/${tenantId}/attendance/corrections/${id}/${status}`);
            addToast(`Correction ${status}d`, 'success');
            fetchCorrections();
        } catch (err) {
            addToast('Action failed', 'error');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Attendance</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setShowModal(true)} className="btn" style={{ background: '#334155', color: 'white' }}>Request Correction</button>
                    <button onClick={handleClockIn} className="btn btn-primary">Clock In</button>
                    <button onClick={handleClockOut} className="btn" style={{ backgroundColor: '#ef4444', color: 'white' }}>Clock Out</button>
                </div>
            </div>

            {['ADMIN', 'HR', 'MANAGER'].includes(user.role) && corrections.length > 0 && (
                <div className="card" style={{ marginBottom: '20px', border: '1px solid var(--warning)' }}>
                    <h3>Pending Corrections</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Date</th>
                                <th>Reason</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {corrections.map(c => (
                                <tr key={c.id}>
                                    <td>{c.employee_name}</td>
                                    <td>{c.date}</td>
                                    <td>{c.reason}</td>
                                    <td>
                                        <button onClick={() => handleCorrectionStatus(c.id, 'approve')} style={{ color: 'var(--success)', marginRight: '10px', background: 'none', border: 'none', cursor: 'pointer' }}>Approve</button>
                                        <button onClick={() => handleCorrectionStatus(c.id, 'reject')} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Reject</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="card">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Clock In</th>
                            <th>Clock Out</th>
                            <th>Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id}>
                                <td>{new Date(log.clock_in).toLocaleDateString()}</td>
                                <td>{new Date(log.clock_in).toLocaleTimeString()}</td>
                                <td>{log.clock_out ? new Date(log.clock_out).toLocaleTimeString() : '-'}</td>
                                <td>{log.note || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="sidebar-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="card" style={{ width: '400px', background: 'var(--bg-card)', zIndex: 101 }}>
                        <h2>Request Correction</h2>
                        <form onSubmit={handleCorrectionSubmit}>
                            <div><label>Date</label><input type="date" onChange={e => setFormData({ ...formData, date: e.target.value })} required /></div>
                            <div><label>Old Clock In</label><input type="datetime-local" onChange={e => setFormData({ ...formData, old_clock_in: e.target.value })} /></div>
                            <div><label>Old Clock Out</label><input type="datetime-local" onChange={e => setFormData({ ...formData, old_clock_out: e.target.value })} /></div>
                            <div><label>New Clock In</label><input type="datetime-local" onChange={e => setFormData({ ...formData, new_clock_in: e.target.value })} required /></div>
                            <div><label>New Clock Out</label><input type="datetime-local" onChange={e => setFormData({ ...formData, new_clock_out: e.target.value })} /></div>
                            <div><label>Reason</label><textarea onChange={e => setFormData({ ...formData, reason: e.target.value })} required></textarea></div>
                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn">Cancel</button>
                                <button type="submit" className="btn btn-primary">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Attendance;
