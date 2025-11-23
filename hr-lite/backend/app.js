require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { requestLogger } = require('./src/middleware/logger');
const errorHandler = require('./src/middleware/errorHandler');
const authRoutes = require('./src/routes/auth');
const employeeRoutes = require('./src/routes/employee');
const attendanceRoutes = require('./src/routes/attendance');
const leaveRoutes = require('./src/routes/leave');
const payrollRoutes = require('./src/routes/payroll');
const notificationRoutes = require('./src/routes/notifications');
const correctionRoutes = require('./src/routes/correction');

const app = express();

app.use(cors());
app.use(express.json({ limit: (process.env.MAX_UPLOAD_SIZE_MB || 2) + 'mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/:tenant/employees', employeeRoutes);
app.use('/api/:tenant/attendance/corrections', correctionRoutes);
app.use('/api/:tenant/attendance', attendanceRoutes);
app.use('/api/:tenant/leave', leaveRoutes);
app.use('/api/:tenant/payroll', payrollRoutes);
app.use('/api/:tenant/notifications', notificationRoutes);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
