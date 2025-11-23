import { useState, useEffect } from 'react';
import api from '../services/api';

const Attendance = () => {
    const [records, setRecords] = useState([]);
    const user = JSON.parse(atob(localStorage.getItem('token').split('.')[1]));
    const tenantId = user.tenantId;
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

    useEffect(() => {
        fetchAttendance();
    }, [month]);

    const fetchAttendance = async () => {
        try {
            const { data } = await api.get(`/api/${tenantId}/attendance/monthly?month=${month}`);
            setRecords(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleClockIn = async () => {
        try {
            await api.post(`/api/${tenantId}/attendance/clock-in`);
            fetchAttendance();
        } catch (err) {
            alert(err.response?.data?.error || 'Clock in failed');
        }
    };

    const handleClockOut = async () => {
        try {
            await api.post(`/api/${tenantId}/attendance/clock-out`);
            fetchAttendance();
        } catch (err) {
            alert(err.response?.data?.error || 'Clock out failed');
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Attendance</h1>
                <div>
                    <button onClick={handleClockIn} className="btn btn-primary" style={{ marginRight: '10px' }}>Clock In</button>
                    <button onClick={handleClockOut} className="btn btn-danger">Clock Out</button>
                </div>
            </div>

            <div className="card">
                <div style={{ marginBottom: '20px' }}>
                    <label>Month: </label>
                    <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 'auto' }} />
                </div>
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
                        {records.map((rec) => (
                            <tr key={rec.id}>
                                <td>{rec.name}</td>
                                <td>{new Date(rec.clock_in).toLocaleDateString()}</td>
                                <td>{new Date(rec.clock_in).toLocaleTimeString()}</td>
                                <td>{rec.clock_out ? new Date(rec.clock_out).toLocaleTimeString() : '-'}</td>
                                <td>{rec.note}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Attendance;
