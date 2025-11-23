import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../components/Toast';

const Employees = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        email: '',
        role: 'EMPLOYEE',
        nik: '',
        position: '',
        department: '',
        join_date: '',
        status: 'active'
    });

    const { addToast } = useToast();
    const user = JSON.parse(atob(localStorage.getItem('token').split('.')[1]));
    const tenantId = user.tenantId;

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get(`/api/${tenantId}/employees`);
            setEmployees(data);
        } catch (err) {
            console.error(err);
            addToast('Failed to fetch employees', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openAddModal = () => {
        setFormData({
            id: null,
            name: '',
            email: '',
            role: 'EMPLOYEE',
            nik: '',
            position: '',
            department: '',
            join_date: '',
            status: 'active'
        });
        setIsEditing(false);
        setShowModal(true);
    };

    const openEditModal = (emp) => {
        setFormData({
            id: emp.id,
            name: emp.name,
            email: emp.email,
            role: emp.role,
            nik: emp.nik || '',
            position: emp.position || '',
            department: emp.department || '',
            join_date: emp.join_date || '',
            status: emp.status || 'active'
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.patch(`/api/${tenantId}/employees/${formData.id}`, formData);
                addToast('Employee updated successfully', 'success');
            } else {
                await api.post(`/api/${tenantId}/employees`, formData);
                addToast('Employee created successfully', 'success');
            }
            setShowModal(false);
            fetchEmployees();
        } catch (err) {
            addToast(err.response?.data?.error || 'Operation failed', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this employee?')) return;
        try {
            await api.delete(`/api/${tenantId}/employees/${id}`);
            addToast('Employee deactivated', 'success');
            fetchEmployees();
        } catch (err) {
            addToast('Delete failed', 'error');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Employees</h1>
                {['ADMIN', 'HR'].includes(user.role) && (
                    <button onClick={openAddModal} className="btn btn-primary">Add Employee</button>
                )}
            </div>

            <div className="card">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Department</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map((emp) => (
                            <tr key={emp.id}>
                                <td>{emp.name}</td>
                                <td>{emp.email}</td>
                                <td>{emp.role}</td>
                                <td>{emp.department}</td>
                                <td>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: emp.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                        color: emp.status === 'active' ? '#22c55e' : '#ef4444',
                                        fontSize: '0.85rem',
                                        fontWeight: '600'
                                    }}>
                                        {emp.status}
                                    </span>
                                </td>
                                <td>
                                    {['ADMIN', 'HR'].includes(user.role) && (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={() => openEditModal(emp)} style={{ background: 'none', border: 'none', color: '#6366f1', padding: 0 }}>Edit</button>
                                            <button onClick={() => handleDelete(emp.id)} style={{ background: 'none', border: 'none', color: '#ef4444', padding: 0 }}>Delete</button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2>{isEditing ? 'Edit Employee' : 'Add Employee'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label>Name</label>
                                    <input name="name" value={formData.name} onChange={handleInputChange} required />
                                </div>
                                <div>
                                    <label>Email</label>
                                    <input name="email" type="email" value={formData.email} onChange={handleInputChange} required />
                                </div>
                                <div>
                                    <label>Role</label>
                                    <select name="role" value={formData.role} onChange={handleInputChange}>
                                        <option value="EMPLOYEE">Employee</option>
                                        <option value="MANAGER">Manager</option>
                                        <option value="HR">HR</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label>NIK</label>
                                    <input name="nik" value={formData.nik} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <label>Position</label>
                                    <input name="position" value={formData.position} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <label>Department</label>
                                    <input name="department" value={formData.department} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <label>Join Date</label>
                                    <input name="join_date" type="date" value={formData.join_date} onChange={handleInputChange} />
                                </div>
                                {isEditing && (
                                    <div>
                                        <label>Status</label>
                                        <select name="status" value={formData.status} onChange={handleInputChange}>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ backgroundColor: '#334155', color: 'white' }}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Employees;
