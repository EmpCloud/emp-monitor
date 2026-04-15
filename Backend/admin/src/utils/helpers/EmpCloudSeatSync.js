'use strict';

const mysql2 = require('mysql2/promise');
const mySql = require('../../database/MySqlConnection').getInstance();

let empcloudPool;

function getEmpCloudPool() {
    if (!empcloudPool) {
        empcloudPool = mysql2.createPool({
            host: process.env.EMPCLOUD_DB_HOST || 'localhost',
            port: parseInt(process.env.EMPCLOUD_DB_PORT || '3306', 10),
            user: process.env.EMPCLOUD_DB_USER || 'empcloud',
            password: process.env.EMPCLOUD_DB_PASSWORD || 'EmpCloud2026',
            database: process.env.EMPCLOUD_DB_NAME || 'empcloud',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0,
            connectTimeout: 5000,
        });
    }
    return empcloudPool;
}

async function syncEmpCloudSeats(monitorOrgId) {
    if (!monitorOrgId) return;
    try {
        const [countRow] = await mySql.query(
            'SELECT COUNT(*) AS c FROM employees WHERE organization_id = ?',
            [monitorOrgId]
        );
        const actual = countRow ? Number(countRow.c) : 0;

        await mySql.query(
            'UPDATE organizations SET current_user_count = ? WHERE id = ?',
            [actual, monitorOrgId]
        );

        const [orgRow] = await mySql.query(
            'SELECT amember_id FROM organizations WHERE id = ?',
            [monitorOrgId]
        );
        const empcloudOrgId = orgRow ? orgRow.amember_id : null;
        if (empcloudOrgId) {
            await getEmpCloudPool().query(
                `UPDATE org_subscriptions s
                    JOIN modules m ON m.id = s.module_id
                    SET s.used_seats = ?
                  WHERE s.organization_id = ? AND m.slug = 'emp-monitor' AND s.status = 'active'`,
                [actual, empcloudOrgId]
            );
        }
        return actual;
    } catch (err) {
        console.log('syncEmpCloudSeats failed for org', monitorOrgId, ':', err.message);
    }
}

module.exports = { syncEmpCloudSeats, getEmpCloudPool };
