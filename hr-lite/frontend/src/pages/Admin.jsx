import { useState, useEffect } from 'react';
import api from '../services/api';

const Admin = () => {
    const [errors, setErrors] = useState([]);

    useEffect(() => {
        fetchErrors();
    }, []);

    const fetchErrors = async () => {
        try {
            const { data } = await api.get('/admin/errors');
            setErrors(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleExport = async () => {
        try {
            const response = await api.get('/admin/export-debug.zip', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'debug-export.zip');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Export failed', err);
            alert('Failed to export debug data');
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Admin Dashboard</h1>
                <button onClick={handleExport} className="btn btn-primary">Export Debug Zip</button>
            </div>

            <div className="card">
                <h3>System Errors</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Route</th>
                            <th>Message</th>
                            <th>Tenant</th>
                        </tr>
                    </thead>
                    <tbody>
                        {errors.map((err) => (
                            <tr key={err.id}>
                                <td>{new Date(err.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>
                                <td>{err.route}</td>
                                <td>{err.error_message}</td>
                                <td>{err.tenant_id}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Admin;
