const ExpenseModel = require('./expense.model');
const sendResponse = require('../../../../utils/myService').sendResponse;
const { translate } = require(`${utilsFolder}/messageTranslation`);
const { expenseMessages } = require("../../../../utils/helpers/LanguageTranslate");
const joiValidation = require('./expense.validation');


class ExpenseController {

    /**
    * Get expense
    *
    * @function getExpense
    * @memberof  ExpenseController;
    * @param {*} req
    * @param {*} res
    * @returns {object} request list or error
    */
    async getExpense(req, res) {
        let { organization_id, language } = req.decoded;
        try {
            let expenses = [];
            expenses = await ExpenseModel.fetchExpensesList(organization_id)
            if (expenses.length > 0) return sendResponse(res, 200, expenses, translate(expenseMessages, "5", language), null);

            return sendResponse(res, 400, null, "No expenses found", null);
        } catch (err) {
            return sendResponse(res, 400, null, translate(expenseMessages, "6", language), null);
        }
    }

    /**
    * Get expense by Id
    *
    * @function getExpense
    * @memberof  ExpenseController;
    * @param {*} req
    * @param {*} res
    * @returns {object} request list or error
    */
    async getExpenseById(req, res) {
        let { organization_id, language } = req.decoded;
        let expense_id = req.body.expense_id;
        try {
            let expenses = [];
            expenses = await ExpenseModel.fetchExpensesListById(expense_id, organization_id)
            if (expenses.length > 0) return sendResponse(res, 200, expenses, translate(expenseMessages, "5", language), null);

            return sendResponse(res, 400, null, "No expenses found", null);
        } catch (err) {
            return sendResponse(res, 400, null, translate(expenseMessages, "6", language), null);
        }
    }

    /**
    * Create expense
    *
    * @function createExpense
    * @memberof  ExpenseController;
    * @param {*} req
    * @param {*} res
    * @returns {object} create list or error
    */
    async createExpense(req, res) {
        let { organization_id, language } = req.decoded;
        let details = {};
        try {
            let { value, error } = joiValidation.addNewExpense(req.body);
            if (error) return sendResponse(res, 404, null, translate(expenseMessages, "2", language), error.details[0].message);

            let { employee_id, expense_type, bill_image, amount, purchase_date, remarks } = value;
            details = { employee_id, expense_type, bill_image, amount, purchase_date, remarks };
            const add_expense = await ExpenseModel.addExpense(employee_id, expense_type, bill_image, amount, purchase_date, remarks, organization_id);
            if (add_expense) {
                if (add_expense.insertId) {
                    return sendResponse(res, 200, {
                        expenses: {
                            add_expense: add_expense.insertId || null
                        },
                    }, translate(expenseMessages, "3", language), null);
                }

            }
            return sendResponse(res, 400, null, translate(expenseMessages, "7", language), null);
        } catch (err) {
            return sendResponse(res, 400, null, translate(expenseMessages, "8", language), err);
        }
    }

    /**
    * Updated expense
    *
    * @function updateExpense
    * @memberof  ExpenseController;
    * @param {*} req
    * @param {*} res
    * @returns {object} updated list or error
    */
    async updateExpense(req, res) {
        const { organization_id, language } = req.decoded;
        let details = {};
        let id = req.body.id;
        try {
            let { value, error } = joiValidation.updateExpense(req.body);
            if (error) return sendResponse(res, 404, null, translate(expenseMessages, "2", language), error.details[0].message);

            let { id, employee_id, expense_type, bill_image, amount, purchase_date, remarks } = value;
            details = { id, employee_id, expense_type, bill_image, amount, purchase_date, remarks };
            const update_expenses = await ExpenseModel.updateExpense(id, employee_id, expense_type, bill_image, amount, purchase_date, remarks, organization_id);
            if (update_expenses) {
                return sendResponse(res, 200, {
                    expenses: {
                        expenses_id: id
                    },
                }, translate(expenseMessages, "12", language), null);
            }
            return sendResponse(res, 400, null, translate(expenseMessages, "7", language), null);
        } catch (err) {
            return sendResponse(res, 400, null, translate(expenseMessages, "8", language), err);
        }
    }

    /**
    * Delete expense
    *
    * @function deleteExpense
    * @memberof  ExpenseController;
    * @param {*} req
    * @param {*} res
    * @returns {object} deleted list or error
    */
    async deleteExpense(req, res) {
        let { organization_id, language } = req.decoded;
        let id = req.decoded;
        let expense_id = req.body.expense_id;
        try {
            const delete_expense = await ExpenseModel.deleteExpense(expense_id, organization_id);
            if (delete_expense) return sendResponse(res, 200, [], translate(expenseMessages, "12", language), null);

            return sendResponse(res, 400, null, translate(expenseMessages, "7", language), null);
        } catch (err) {
            return sendResponse(res, 400, null, translate(expenseMessages, "7", language), null);
        }
    }

}

module.exports = new ExpenseController;