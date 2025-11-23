import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../components/Toast';

const Payroll = () => {
    const user = JSON.parse(atob(localStorage.getItem('token').split('.')[1]));
    const tenantId = user.tenantId;
    const { addToast } = useToast();
    const [employees, setEmployees] = useState([]);

    const [formData, setFormData] = useState({
        employee_id: '',
        period_start: '',
        period_end: '',
        base_salary: ''
    });

    useEffect(() => {
        if (['ADMIN', 'HR'].includes(user.role)) {
            fetchEmployees();
        }
    }, []);

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get(`/api/${tenantId}/employees`);
            setEmployees(data);
        } catch (err) {
            console.error(err);
            addToast('Failed to fetch employees', 'error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post(`/api/${tenantId}/payroll`, formData);
            addToast(`Payslip created! Net Salary: ${data.net_salary}`, 'success');
            setFormData({ ...formData, employee_id: '', base_salary: '' });
        } catch (err) {
            addToast(err.response?.data?.error || 'Failed', 'error');
        }
    };

    return (
        <div>
            <h1>Payroll</h1>
            {['ADMIN', 'HR'].includes(user.role) ? (
                <div className="card" style={{ maxWidth: '500px' }}>
                    <h3>Create Payslip</h3>
                    <form onSubmit={handleSubmit}>
                        <div>
                            <label>Employee</label>
                            <select
                                value={formData.employee_id}
                                onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                                required
                            >
                                <option value="">Select Employee</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.name} ({emp.nik || 'No NIK'})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label>Period Start</label>
                            <input type="date" value={formData.period_start} onChange={e => setFormData({ ...formData, period_start: e.target.value })} required />
                        </div>
                        <div>
                            <label>Period End</label>
                            <input type="date" value={formData.period_end} onChange={e => setFormData({ ...formData, period_end: e.target.value })} required />
                        </div>
                        <div>
                            <label>Base Salary (Override)</label>
                            <input type="number" value={formData.base_salary} onChange={e => setFormData({ ...formData, base_salary: e.target.value })} />
                        </div>
                        <button type="submit" className="btn btn-primary">Generate</button>
                    </form>
                </div>
            ) : (
                <div className="card">
                    <p>You can view your payslips here (Not implemented in MVP UI, use API)</p>
                </div>
            )}
        </div>
    );
};

export default Payroll;
