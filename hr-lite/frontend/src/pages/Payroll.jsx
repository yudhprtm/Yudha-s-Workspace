import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../components/Toast';

const Payroll = () => {
    const [employees, setEmployees] = useState([]);
    const [payrollRuns, setPayrollRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(atob(localStorage.getItem('token').split('.')[1]));
    const tenantId = user.tenantId;
    const { addToast } = useToast();

    // Draft State
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

    useEffect(() => {
        if (['HR', 'ADMIN'].includes(user.role)) {
            fetchEmployees();
            fetchPayrollRuns();
        }
        setLoading(false);
    }, []);

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get(`/api/${tenantId}/employees`);
            setEmployees(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchPayrollRuns = async () => {
        try {
            const { data } = await api.get(`/api/${tenantId}/payroll/runs`);
            setPayrollRuns(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateDraft = async () => {
        try {
            await api.post(`/api/${tenantId}/payroll/draft`, {
                period,
                employee_ids: selectedEmployees
            });
            addToast('Payroll draft created', 'success');
            fetchPayrollRuns();
        } catch (err) {
            addToast('Failed to create draft', 'error');
        }
    };

    const handleSubmit = async (id) => {
        try {
            await api.patch(`/api/${tenantId}/payroll/${id}/submit`);
            addToast('Payroll submitted for approval', 'success');
            fetchPayrollRuns();
        } catch (err) {
            addToast('Failed to submit', 'error');
        }
    };

    const handleApprove = async (id) => {
        try {
            await api.patch(`/api/${tenantId}/payroll/${id}/approve`);
            addToast('Payroll approved', 'success');
            fetchPayrollRuns();
        } catch (err) {
            addToast('Failed to approve', 'error');
        }
    };

    if (loading) return <div>Loading...</div>;

    if (!['HR', 'ADMIN'].includes(user.role)) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Access Restricted</div>;
    }

    return (
        <div>
            <h1>Payroll Management</h1>

            <div className="card" style={{ marginBottom: '20px' }}>
                <h3>Create New Payroll Run</h3>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
                    <div>
                        <label>Period</label>
                        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
                    </div>
                    <div>
                        <label>Select Employees</label>
                        <select multiple style={{ height: '100px' }} onChange={(e) => setSelectedEmployees(Array.from(e.target.selectedOptions, option => option.value))}>
                            {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.name} ({e.nik})</option>
                            ))}
                        </select>
                        <small style={{ display: 'block', color: 'var(--text-muted)' }}>Hold Ctrl to select multiple</small>
                    </div>
                    <button onClick={handleCreateDraft} className="btn btn-primary" disabled={selectedEmployees.length === 0}>Create Draft</button>
                </div>
            </div>

            <div className="card">
                <h3>Payroll Runs</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Period</th>
                            <th>Status</th>
                            <th>Created At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payrollRuns.map(run => (
                            <tr key={run.id}>
                                <td>{run.period}</td>
                                <td>
                                    <span className={`badge badge-${run.status === 'approved' ? 'success' : run.status === 'rejected' ? 'danger' : 'warning'}`}>
                                        {run.status}
                                    </span>
                                </td>
                                <td>{new Date(run.created_at).toLocaleDateString()}</td>
                                <td>
                                    {run.status === 'draft' && (
                                        <button onClick={() => handleSubmit(run.id)} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Submit</button>
                                    )}
                                    {run.status === 'pending' && user.role === 'ADMIN' && (
                                        <button onClick={() => handleApprove(run.id)} style={{ color: 'var(--success)', background: 'none', border: 'none', cursor: 'pointer' }}>Approve</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Payroll;
