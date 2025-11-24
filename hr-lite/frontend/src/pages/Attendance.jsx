import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import Pagination from '../components/Pagination';

const Attendance = () => {
    const [logs, setLogs] = useState([]);
    const [corrections, setCorrections] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(atob(localStorage.getItem('token').split('.')[1]));
    const tenantId = user.tenantId;
    const { addToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [selectedCorrection, setSelectedCorrection] = useState(null);
    const [selectedLogId, setSelectedLogId] = useState(null);
    const [formData, setFormData] = useState({
        date: '',
        old_clock_in: '',
        old_clock_out: '',
        new_clock_in: '',
        new_clock_out: '',
        reason: ''
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [correctionsPage, setCorrectionsPage] = useState(1);
    const [correctionsTotalPages, setCorrectionsTotalPages] = useState(0);
    const limit = 10;

    useEffect(() => {
        fetchAttendance();
    }, [currentPage]);

    useEffect(() => {
        if (['ADMIN', 'HR', 'MANAGER'].includes(user.role)) {
            fetchCorrections();
        }
    }, [correctionsPage]);

    const fetchAttendance = async () => {
        try {
            const { data } = await api.get(`/api/${tenantId}/attendance?page=${currentPage}&limit=${limit}`);
            setLogs(data.data);
            setTotalPages(data.totalPages);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCorrections = async () => {
        try {
            const { data } = await api.get(`/api/${tenantId}/attendance/corrections?page=${correctionsPage}&limit=${limit}`);
            setCorrections(data.data);
            setCorrectionsTotalPages(data.totalPages);
        } catch (err) {
            console.error(err);
        }
    };

    const handleClockIn = async () => {
        try {
            console.log(`Clocking in for tenant: ${tenantId}`);
            await api.post(`/api/${tenantId}/attendance/clock-in`);
            addToast('Clocked in successfully', 'success');
            fetchAttendance();
        } catch (err) {
            console.error('Clock in error:', err);
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
            setShowApprovalModal(false);
            fetchCorrections();
        } catch (err) {
            addToast('Action failed', 'error');
        }
    };

    const openCorrectionModal = () => {
        setSelectedLogId(null);
        setFormData({
            date: '',
            old_clock_in: '',
            old_clock_out: '',
            new_clock_in: '',
            new_clock_out: '',
            reason: ''
        });
        setShowModal(true);
    };

    const openApprovalModal = (correction) => {
        setSelectedCorrection(correction);
        setShowApprovalModal(true);
    };

    const handleSelectLog = (id) => {
        setSelectedLogId(id);
    };

    const proceedToEdit = (log) => {
        if (!log) return;
        const clockInDate = new Date(log.clock_in);
        const clockOutDate = log.clock_out ? new Date(log.clock_out) : null;
        const formatDateTime = (date) => {
            if (!date) return '';
            const offset = date.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(date - offset)).toISOString().slice(0, 16);
            return localISOTime;
        };
        setFormData({
            date: clockInDate.toISOString().split('T')[0],
            old_clock_in: formatDateTime(clockInDate),
            old_clock_out: formatDateTime(clockOutDate),
            new_clock_in: formatDateTime(clockInDate),
            new_clock_out: formatDateTime(clockOutDate),
            reason: ''
        });
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Attendance</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={openCorrectionModal} className="btn" style={{ background: '#334155', color: 'white' }}>Request Correction</button>
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
                                        <button onClick={() => openApprovalModal(c)} className="btn" style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '5px 10px', fontSize: '0.8rem' }}>Review</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <Pagination
                        currentPage={correctionsPage}
                        totalPages={correctionsTotalPages}
                        onPageChange={setCorrectionsPage}
                    />
                </div>
            )}

            <div className="card">
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Date</th>
                            <th>Clock In</th>
                            <th>Clock Out</th>
                            <th>Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id}>
                                <td>{log.name}</td>
                                <td>{new Date(log.clock_in).toLocaleDateString()}</td>
                                <td>{new Date(log.clock_in).toLocaleTimeString()}</td>
                                <td>{log.clock_out ? new Date(log.clock_out).toLocaleTimeString() : '-'}</td>
                                <td>{log.note || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="card" style={{ width: '900px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2>Request Correction</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                        </div>
                        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                            {/* Left Panel: List */}
                            <div style={{ width: '350px', borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '20px', background: 'var(--bg-surface)' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '15px', color: 'var(--text-muted)' }}>Select Date</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button
                                        onClick={() => { setSelectedLogId(null); setFormData({ date: '', old_clock_in: '', old_clock_out: '', new_clock_in: '', new_clock_out: '', reason: '' }); }}
                                        className={`btn ${!selectedLogId ? 'btn-primary' : ''}`}
                                        style={{ justifyContent: 'flex-start', background: !selectedLogId ? undefined : 'transparent', border: '1px solid var(--border)', color: !selectedLogId ? 'white' : 'var(--text-main)' }}
                                    >
                                        <span>➕</span> New Request (Missing Date)
                                    </button>
                                    {logs.map(log => (
                                        <div
                                            key={log.id}
                                            onClick={() => { handleSelectLog(log.id); proceedToEdit(log); }}
                                            style={{
                                                padding: '12px',
                                                border: '1px solid var(--border)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                background: selectedLogId === log.id ? 'var(--bg-hover)' : 'transparent',
                                                borderColor: selectedLogId === log.id ? 'var(--primary)' : 'var(--border)',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{new Date(log.clock_in).toLocaleDateString()}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                {new Date(log.clock_in).toLocaleTimeString()} - {log.clock_out ? new Date(log.clock_out).toLocaleTimeString() : '...'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Right Panel: Form */}
                            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                                <form onSubmit={handleCorrectionSubmit}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label>Date</label>
                                            <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                                        </div>
                                        <div>
                                            <label>Old Clock In</label>
                                            <input type="datetime-local" value={formData.old_clock_in} onChange={e => setFormData({ ...formData, old_clock_in: e.target.value })} />
                                        </div>
                                        <div>
                                            <label>Old Clock Out</label>
                                            <input type="datetime-local" value={formData.old_clock_out} onChange={e => setFormData({ ...formData, old_clock_out: e.target.value })} />
                                        </div>
                                        <div>
                                            <label>New Clock In</label>
                                            <input type="datetime-local" value={formData.new_clock_in} onChange={e => setFormData({ ...formData, new_clock_in: e.target.value })} required />
                                        </div>
                                        <div>
                                            <label>New Clock Out</label>
                                            <input type="datetime-local" value={formData.new_clock_out} onChange={e => setFormData({ ...formData, new_clock_out: e.target.value })} />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label>Reason</label>
                                            <textarea
                                                value={formData.reason}
                                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                                required
                                                style={{ minHeight: '100px' }}
                                                placeholder="Explain why you need this correction..."
                                            />
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                        <button type="button" onClick={() => setShowModal(false)} className="btn">Cancel</button>
                                        <button type="submit" className="btn btn-primary">Submit Request</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showApprovalModal && selectedCorrection && (
                <div className="modal-overlay">
                    <div className="card" style={{ width: '500px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                            <h2>Review Request</h2>
                            <button onClick={() => setShowApprovalModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label>Employee</label>
                                <div style={{ fontWeight: '600' }}>{selectedCorrection.employee_name}</div>
                            </div>
                            <div>
                                <label>Request Date</label>
                                <div>{selectedCorrection.created_at ? new Date(selectedCorrection.created_at).toLocaleDateString() : 'N/A'}</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-hover)', padding: '10px', borderRadius: '8px' }}>
                                <div>
                                    <label>Original Time</label>
                                    <div style={{ fontSize: '0.9rem' }}>In: {selectedCorrection.old_clock_in ? new Date(selectedCorrection.old_clock_in).toLocaleTimeString() : '-'}</div>
                                    <div style={{ fontSize: '0.9rem' }}>Out: {selectedCorrection.old_clock_out ? new Date(selectedCorrection.old_clock_out).toLocaleTimeString() : '-'}</div>
                                </div>
                                <div>
                                    <label>Requested Time</label>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '600' }}>In: {selectedCorrection.new_clock_in ? new Date(selectedCorrection.new_clock_in).toLocaleTimeString() : '-'}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '600' }}>Out: {selectedCorrection.new_clock_out ? new Date(selectedCorrection.new_clock_out).toLocaleTimeString() : '-'}</div>
                                </div>
                            </div>
                            <div>
                                <label>Reason</label>
                                <div style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: '4px', fontStyle: 'italic' }}>{selectedCorrection.reason}</div>
                            </div>
                            {selectedCorrection.evidence && (
                                <div>
                                    <label>Evidence</label>
                                    <div><a href={selectedCorrection.evidence} target="_blank" rel="noopener noreferrer">View Attachment</a></div>
                                </div>
                            )}
                        </div>
                        <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '15px' }}>
                            <button onClick={() => setShowApprovalModal(false)} className="btn">Close</button>
                            <button onClick={() => handleCorrectionStatus(selectedCorrection.id, 'reject')} className="btn" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>Reject</button>
                            <button onClick={() => handleCorrectionStatus(selectedCorrection.id, 'approve')} className="btn btn-primary">Confirm Approve</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Attendance;
