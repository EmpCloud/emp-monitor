'use strict';
if (process.env.IS_DEBUGGING) console.log(__filename);

const mysql = require('mysql');
const util = require('util');

/**
 * MySQL Class for DB connection availability
 * It's follows Singlton Design Pattern
 * 
 * Once the connection is made it is stored in the conenction pool
 * and when ever is need it is being pulled and used 
 * 
 * Only 1 object of this class is created 
 */
class MySqlSingelton {

    constructor() {
        this.mySqlPool = mysql.createPool({
            connectionLimit: parseInt(process.env.MYSQL_POOL_CONNECTION_LIMIT),
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USERNAME,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DBNAME,
            timezone: 'Z',
            charset: 'utf8mb4'
        });
    }

    static getInstance() {
        if (!this.mySqlPool) {
            this.mySqlPool = new MySqlSingelton().mySqlPool;
        }

        this.mySqlPool.getConnection(function (err, connection) {
            if (err) {
                if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                    console.error('Database connection was closed.')
                }
                if (err.code === 'ER_CON_COUNT_ERROR') {
                    console.error('Database has too many connections.')
                }
                if (err.code === 'ECONNREFUSED') {
                    console.error('Database connection was refused.')
                }
            }
            if (connection) connection.release();
        });

        // Promisify once only — repeating util.promisify on every getInstance() breaks pool.query (async/await SSO/admin lookups).
        if (!this._queryPromisified) {
            const pool = this.mySqlPool;
            pool.query = util.promisify(pool.query.bind(pool));
            this._queryPromisified = true;
        }
        return this.mySqlPool;
    }
}

module.exports = MySqlSingelton;