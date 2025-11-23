import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../components/Toast';

const Leave = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(atob(localStorage.getItem('token').split('.')[1]));
    const tenantId = user.tenantId;
    const { addToast } = useToast();

    // Add Request Modal State
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        type: 'Annual',
        start_date: '',
        end_date: '',
        days: 1,
        reason: ''
    });

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        try {
            const { data } = await api.get(`/api/${tenantId}/leave`);
            setLeaves(data || []);
        } catch (err) {
            console.error(err);
            addToast('Failed to fetch leaves', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleStatus = async (id, status) => {
        try {
            await api.patch(`/api/${tenantId}/leave/${id}/${status}`);
            addToast(`Leave request ${status}`, 'success');
            fetchLeaves();
        } catch (err) {
            addToast('Action failed', 'error');
        }
    };

    const handleRequestSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/api/${tenantId}/leave`, formData);
            addToast('Leave requested successfully', 'success');
            setShowModal(false);
            fetchLeaves();
        } catch (err) {
            addToast(err.response?.data?.error || 'Request failed', 'error');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Leave Requests</h1>
                <button onClick={() => setShowModal(true)} className="btn btn-primary">Request Leave</button>
            </div>

            <div className="card">
                {leaves.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8' }}>No leave requests found.</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Type</th>
                                <th>Dates</th>
                                <th>Days</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaves.map((l) => (
                                <tr key={l.id}>
                                    <td>{l.name}</td>
                                    <td>{l.type}</td>
                                    <td>{l.start_date} to {l.end_date}</td>
                                    <td>{l.days}</td>
                                    <td>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            backgroundColor: l.status === 'approved' ? 'rgba(34, 197, 94, 0.2)' : l.status === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                            color: l.status === 'approved' ? '#22c55e' : l.status === 'rejected' ? '#ef4444' : '#eab308',
                                            fontWeight: '600',
                                            fontSize: '0.85rem'
                                        }}>
                                            {l.status}
                                        </span>
                                    </td>
                                    <td>
                                        {l.status === 'pending' && ['ADMIN', 'HR', 'MANAGER'].includes(user.role) && (
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button onClick={() => handleStatus(l.id, 'approve')} style={{ color: '#22c55e', background: 'none', border: 'none', cursor: 'pointer' }}>Approve</button>
                                                <button onClick={() => handleStatus(l.id, 'reject')} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Reject</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '400px' }}>
                        <h2>Request Leave</h2>
                        <form onSubmit={handleRequestSubmit}>
                            <div>
                                <label>Type</label>
                                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                    <option value="Annual">Annual</option>
                                    <option value="Sick">Sick</option>
                                    <option value="Unpaid">Unpaid</option>
                                </select>
                            </div>
                            <div>
                                <label>Start Date</label>
                                <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
                            </div>
                            <div>
                                <label>End Date</label>
                                <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required />
                            </div>
                            <div>
                                <label>Days</label>
                                <input type="number" value={formData.days} onChange={(e) => setFormData({ ...formData, days: e.target.value })} required />
                            </div>
                            <div>
                                <label>Reason</label>
                                <textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} rows="3"></textarea>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ backgroundColor: '#334155', color: 'white' }}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leave;
