const Dashboard = () => {
    const user = JSON.parse(atob(localStorage.getItem('token').split('.')[1]));

    return (
        <div>
            <h1>Welcome, {user.email}</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
                <div className="card">
                    <h3>My Status</h3>
                    <p>Active</p>
                </div>
                <div className="card">
                    <h3>Role</h3>
                    <p>{user.role}</p>
                </div>
                <div className="card">
                    <h3>Tenant ID</h3>
                    <p>{user.tenantId}</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
