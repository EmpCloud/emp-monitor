const mySql = require('../../../../database/MySqlConnection').getInstance();


class ExpenseModel {

    fetchExpensesList(organization_id) {
        let query = `SELECT e.id,e.employee_id,e.organization_id,e.expense_type,e.bill_image,e.amount,e.purchase_date,e.remarks,u.first_name,u.last_name
         FROM expenses e
         LEFT JOIN employees em ON em.id=e.employee_id
         INNER JOIN users u ON u.id=em.user_id
         WHERE e.organization_id =(?)`;
        return mySql.query(query, [organization_id]);
    }

    fetchExpensesListById(expense_id, organization_id) {
        let query = `SELECT * FROM expenses
                     WHERE id =(?) AND organization_id =(?)`;
        return mySql.query(query, [expense_id, organization_id]);
    }

    addExpense(employee_id, expense_type, bill_image, amount, purchase_date, remarks, organization_id) {
        let query = 'INSERT INTO `expenses` (`employee_id`, `expense_type`, `bill_image`, `amount`, `purchase_date`, `remarks`, `organization_id`) VALUES (?, ?, ?, ?, ?, ?, ?)';
        return mySql.query(query, [employee_id, expense_type, bill_image, amount, purchase_date, remarks, organization_id]);
    }

    updateExpense(id, employee_id, expense_type, bill_image, amount, purchase_date, remarks, organization_id) {
        let query = `UPDATE expenses SET employee_id=(?), expense_type=(?), bill_image=(?), amount=(?), purchase_date=(?), remarks=(?)
                     WHERE id =(?) AND organization_id =(?)`;
        return mySql.query(query, [employee_id, expense_type, bill_image, amount, purchase_date, remarks, id, organization_id]);
    }

    deleteExpense(expense_id, organization_id) {
        let query = `DELETE FROM expenses
                     WHERE id =(?) AND organization_id =(?)`;
        return mySql.query(query, [expense_id, organization_id]);
    }

}

module.exports = new ExpenseModel;