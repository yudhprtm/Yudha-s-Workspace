require('dotenv').config();
const authTests = require('./security/authTests');
const roleTests = require('./security/roleTests');
const attendanceTests = require('./security/attendanceTests');
const leaveTests = require('./security/leaveTests');
const payrollTests = require('./security/payrollTests');
const inputValidationTests = require('./security/inputValidationTests');

const runSecurityTests = async () => {
    console.log('\n🔒 ATTENDIFY SECURITY TEST SUITE\n');
    console.log('='.repeat(50));

    const allResults = {
        auth: [],
        role: [],
        attendance: [],
        leave: [],
        payroll: [],
        inputValidation: []
    };

    try {
        // Run all test suites
        console.log('\n📋 Running tests...\n');

        allResults.auth = await authTests();
        allResults.role = await roleTests();
        allResults.attendance = await attendanceTests();
        allResults.leave = await leaveTests();
        allResults.payroll = await payrollTests();
        allResults.inputValidation = await inputValidationTests();

        // Print results
        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST RESULTS\n');

        const categories = [
            { name: 'Authentication', key: 'auth', icon: '🔐' },
            { name: 'Role Permissions', key: 'role', icon: '👤' },
            { name: 'Attendance Security', key: 'attendance', icon: '🕒' },
            { name: 'Leave Security', key: 'leave', icon: '📅' },
            { name: 'Payroll Security', key: 'payroll', icon: '💰' },
            { name: 'Input Validation', key: 'inputValidation', icon: '✅' }
        ];

        let totalTests = 0;
        let totalPassed = 0;

        categories.forEach(category => {
            const results = allResults[category.key];
            const passed = results.filter(r => r.pass).length;
            const total = results.length;
            const status = passed === total ? '✅ PASS' : '❌ FAIL';

            console.log(`${category.icon} ${category.name}: ${status} (${passed}/${total})`);

            results.forEach(test => {
                const icon = test.pass ? '  ✓' : '  ✗';
                const msg = test.error ? ` (${test.error})` : '';
                console.log(`${icon} ${test.name}${msg}`);
            });
            console.log('');

            totalTests += total;
            totalPassed += passed;
        });

        console.log('='.repeat(50));
        console.log(`\n🎯 OVERALL: ${totalPassed}/${totalTests} tests passed`);

        if (totalPassed === totalTests) {
            console.log('✅ All security tests passed!\n');
            process.exit(0);
        } else {
            console.log('❌ Some security tests failed. Please review.\n');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Error running security tests:', error.message);
        process.exit(1);
    }
};

// Run tests
runSecurityTests();
